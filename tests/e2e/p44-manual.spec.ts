import { expect, test } from "@playwright/test";
import { crearUsuario, ingresar, ingresarComoDueno, PERFIL_TALLER } from "./apoyo";

// Pedido 44: el manual del panel, dentro del panel y con la sesión (src/app/panel/manual/[[...archivo]]/route.ts).

test("sin sesión, el manual lleva al ingreso", async ({ page }) => {
  await page.goto("/panel/manual");
  await expect(page).toHaveURL(/\/ingresar/);
  const captura = await page.request.get("/panel/manual/capturas/15-orden.jpg", { maxRedirects: 0 });
  expect(captura.status()).not.toBe(200);
});

test("el dueño lo abre desde el menú, con sus capturas y el PDF", async ({ page }, info) => {
  await ingresarComoDueno(page);
  if (info.project.name !== "escritorio") await page.getByRole("button", { name: /Abrir menú/ }).click();
  await page.getByRole("link", { name: "Manual del panel" }).first().click();
  await expect(page).toHaveURL(/\/panel\/manual$/);
  await expect(page.getByRole("heading", { level: 1, name: "Manual del panel" })).toBeVisible();
  // Un libro: una página a la vez, con el índice y los botones para pasar (scripts/manual/libro.js)
  await page.getByRole("link", { name: "Empezar a leer" }).click();
  await expect(page.getByRole("heading", { level: 2, name: "Índice" })).toBeVisible();
  await page.getByRole("link", { name: /^El ciclo de un trabajo/ }).click();
  await expect(page.getByRole("heading", { level: 2, name: "El ciclo de un trabajo" })).toBeVisible();
  await expect(page.locator(".libro-numero")).toHaveText(/^\d+ de \d+$/);
  await page.getByRole("button", { name: "Siguiente" }).click();
  await expect(page.getByRole("heading", { level: 3, name: "Cotizar" })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole("heading", { level: 2, name: "El ciclo de un trabajo" })).toBeVisible();
  // Las capturas y el logo cargan (también las que esperan a que se baje)
  const rotas = await page.evaluate(async () => {
    for (const img of document.images) img.loading = "eager";
    await Promise.all([...document.images].map((i) => (i.complete ? null : new Promise((listo) => ((i.onload = i.onerror = listo))))));
    return [...document.images].filter((i) => i.naturalWidth === 0).map((i) => i.src);
  });
  expect(rotas).toEqual([]);
  // Por ahora, solo en la web: sin PDF
  await page.goto("/panel/manual#portada");
  await expect(page.getByRole("link", { name: "Descargar PDF" })).toHaveCount(0);
  expect((await page.request.get("/panel/manual/manual-del-panel-toctar.pdf")).status()).toBe(404);
  // Cada archivo se revalida (pasa por la sesión) y no se baja de nuevo si no cambió
  const captura = await page.request.get("/panel/manual/capturas/15-orden.jpg");
  expect(captura.headers()["content-type"]).toBe("image/jpeg");
  expect(captura.headers()["cache-control"]).toBe("private, no-cache");
  const igual = await page.request.get("/panel/manual/capturas/15-orden.jpg", { headers: { "if-none-match": captura.headers()["etag"] } });
  expect(igual.status()).toBe(304);
  // "Volver al panel", también en la portada
  await page.getByRole("link", { name: "Volver al panel" }).click();
  await expect(page).toHaveURL(/\/panel$/);
});

test("un encargado con el perfil Taller también lo abre", async ({ page }, info) => {
  const usuario = `manual-taller-${info.project.name.slice(0, 3)}${info.retry}`;
  await crearUsuario({ usuario, nombre: "Chico del taller", contrasena: "taller-123", rol: "encargado", permisos: PERFIL_TALLER });
  await ingresar(page, usuario, "taller-123");
  await expect(page).toHaveURL(/\/panel$/);
  const r = await page.goto("/panel/manual");
  expect(r?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1, name: "Manual del panel" })).toBeVisible();
});

test("solo sirve sus propios archivos: nada fuera de la carpeta del manual", async ({ page }) => {
  await ingresarComoDueno(page);
  for (const ruta of ["/panel/manual/..%2F..%2Fpackage.json", "/panel/manual/capturas/..%2F..%2F..%2F.env", "/panel/manual/otro.html", "/panel/manual/capturas/06-recibir.jpg/x", "/panel/manual/logo.svg"]) {
    const r = await page.request.get(ruta);
    expect(r.status(), ruta).toBe(404);
  }
});
