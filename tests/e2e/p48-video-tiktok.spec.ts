import { expect, test, type TestInfo } from "@playwright/test";
import { consultar, crearUsuario, ingresar, ingresarComoDueno } from "./apoyo";

// Pedido 48 (`docs/08-desarrollo/etapas/P48-video-tiktok.md` §9): el video de "Mira cómo trabajamos" se sube en
// Sitio web > Textos > Portada y se ve dentro del celular de la portada. Es uno solo para todo el sitio: corre solo en
// la computadora, para que los dos proyectos no se pisen.

const soloEscritorio = (info: TestInfo) => test.skip(info.project.name !== "escritorio", "El video de la portada es uno solo");

/** Un MP4 mínimo: la caja ftyp que mira el servidor y relleno. No se reproduce, pero el sitio lo pone igual. */
const MP4 = Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from("ftypisom"), Buffer.alloc(4), Buffer.from("isommp41"), Buffer.alloc(2048)]);
const TEXTOS_PORTADA = "/panel/sitio/textos?pagina=inicio";

test("el dueño sube el video de TikTok, se ve en la portada y al quitarlo vuelve la foto", async ({ page }, info) => {
  soloEscritorio(info);
  test.setTimeout(60_000);
  await ingresarComoDueno(page);
  await page.goto(TEXTOS_PORTADA);
  const fila = page.getByRole("region", { name: "Video de TikTok" });
  // Empieza sin video, aunque un intento anterior haya fallado a mitad de camino
  if (await fila.getByRole("button", { name: "Quitar video" }).isVisible()) {
    await fila.getByRole("button", { name: "Quitar video" }).click();
    await expect(fila.getByRole("button", { name: "Subir video" })).toBeVisible();
  }
  await expect(fila.getByRole("button", { name: "Subir video" })).toBeEnabled();
  await fila.getByLabel("Archivo del video de TikTok").setInputFiles({ name: "trabajo.mp4", mimeType: "video/mp4", buffer: MP4 });
  await expect(page.getByText("Video guardado.")).toBeVisible();
  await expect(fila.getByLabel("Video de TikTok de la portada")).toBeVisible();
  await expect(fila.getByRole("button", { name: "Cambiar video" })).toBeVisible();

  // El sitio se renueva en segundo plano: se visita hasta verlo
  const video = page.locator(".tt-celular video source");
  await expect(async () => {
    await page.goto("/");
    await expect(video).toHaveAttribute("src", /\/portada\/video-[\w-]+\.mp4$/, { timeout: 1000 });
  }).toPass({ timeout: 20_000 });
  await expect(video).toHaveAttribute("type", "video/mp4");
  // Sin sonido, en bucle y sin pedirse hasta que se ve
  const etiqueta = page.locator(".tt-celular video");
  await expect(etiqueta).toHaveJSProperty("muted", true);
  await expect(etiqueta).toHaveJSProperty("loop", true);

  await page.goto(TEXTOS_PORTADA);
  await fila.getByRole("button", { name: "Quitar video" }).click();
  await expect(page.getByText("Video quitado.")).toBeVisible();
  await expect(fila.getByRole("button", { name: "Subir video" })).toBeVisible();
  await expect(async () => {
    await page.goto("/");
    await expect(page.locator(".tt-celular video")).toHaveCount(0, { timeout: 1000 });
  }).toPass({ timeout: 20_000 });
});

test("un archivo que no es video o que pesa más de 20 MB da su error y no se sube", async ({ page }, info) => {
  soloEscritorio(info);
  await ingresarComoDueno(page);
  await page.goto(TEXTOS_PORTADA);
  const fila = page.getByRole("region", { name: "Video de TikTok" });
  await expect(fila.getByRole("button", { name: /^(Subir|Cambiar) video$/ })).toBeEnabled();
  const entrada = fila.getByLabel("Archivo del video de TikTok");

  // Dice ser MP4, pero es un texto: lo revisa el servidor por su firma
  await entrada.setInputFiles({ name: "falso.mp4", mimeType: "video/mp4", buffer: Buffer.from("<html>no soy un video</html>") });
  await expect(fila.getByText("Ese archivo no es un video MP4 o WebM.")).toBeVisible();

  // Más de 20 MB: se avisa sin mandarlo
  await entrada.setInputFiles({ name: "largo.mp4", mimeType: "video/mp4", buffer: Buffer.concat([MP4, Buffer.alloc(20 * 1024 * 1024)]) });
  await expect(fila.getByText("El video pesa más de 20 MB. Usa uno más corto o guárdalo en menor calidad.")).toBeVisible();

  // Y el servidor lo corta aunque la página no lo frene
  const grande = await page.request.post("/panel/sitio/video", {
    data: Buffer.concat([MP4, Buffer.alloc(20 * 1024 * 1024)]),
    headers: { "content-type": "video/mp4", origin: new URL(page.url()).origin },
  });
  expect(grande.status()).toBe(413);

  // Uno de 15 MB llega entero: el proxy del panel no lo corta a los 10 MB (no pasa por él)
  const quince = Buffer.concat([MP4, Buffer.alloc(15 * 1024 * 1024)]);
  const guardado = await page.request.post("/panel/sitio/video", { data: quince, headers: { "content-type": "video/mp4", origin: new URL(page.url()).origin } });
  expect(guardado.status()).toBe(200);
  const [registro] = await consultar<{ bytes: number }>("select a.bytes from contenido_pagina c join archivo a on a.id = c.video_archivo_id where c.clave = 'inicio'");
  expect(registro.bytes).toBe(quince.byteLength);
});

test("la ruta del video no acepta pedidos sin sesión, sin el permiso Sitio web ni de otro origen", async ({ page, playwright, baseURL }, info) => {
  soloEscritorio(info);
  const cabeceras = { "content-type": "video/mp4", origin: baseURL! };

  // Sin sesión: al ingreso
  const anonimo = await playwright.request.newContext({ baseURL });
  const sinSesion = await anonimo.post("/panel/sitio/video", { data: MP4, headers: cabeceras, maxRedirects: 0 });
  expect(sinSesion.status()).toBeGreaterThanOrEqual(300);
  expect(sinSesion.status()).toBeLessThan(400);
  expect(sinSesion.headers()["location"]).toMatch(/\/ingresar/);
  await anonimo.dispose();

  // Un encargado sin el permiso Sitio web: a "Sin acceso"
  await crearUsuario({ usuario: "p48-sin-sitio", nombre: "Encargado sin sitio", contrasena: "p48-sin-sitio-123", rol: "encargado", permisos: ["agenda"] });
  await ingresar(page, "p48-sin-sitio", "p48-sin-sitio-123");
  await expect(page).toHaveURL(/\/panel/);
  const sinPermiso = await page.request.post("/panel/sitio/video", { data: MP4, headers: cabeceras, maxRedirects: 0 });
  expect(sinPermiso.headers()["location"]).toMatch(/\/panel\/sin-acceso/);

  // El dueño, pero desde otra página: no
  await page.context().clearCookies();
  await ingresarComoDueno(page);
  const otroOrigen = await page.request.post("/panel/sitio/video", { data: MP4, headers: { ...cabeceras, origin: "https://otro-sitio.example" }, maxRedirects: 0 });
  expect(otroOrigen.status()).toBe(403);
});
