import { expect, test } from "@playwright/test";
import { crearUsuario, ingresar, ingresarComoDueno, PERFIL_TALLER } from "./apoyo";

// Pedido 44: el manual del panel, dentro del panel y con la sesión (src/app/panel/manual/[[...archivo]]/route.ts).

test("sin sesión, el manual lleva al ingreso", async ({ page }) => {
  await page.goto("/panel/manual");
  await expect(page).toHaveURL(/\/ingresar/);
  const pdf = await page.request.get("/panel/manual/manual-del-panel-toctar.pdf", { maxRedirects: 0 });
  expect(pdf.status()).not.toBe(200);
});

test("el dueño lo abre desde el menú, con sus capturas y el PDF", async ({ page }, info) => {
  await ingresarComoDueno(page);
  if (info.project.name !== "escritorio") await page.getByRole("button", { name: /Abrir menú/ }).click();
  await page.getByRole("link", { name: "Manual del panel" }).first().click();
  await expect(page).toHaveURL(/\/panel\/manual$/);
  await expect(page.getByRole("heading", { level: 1, name: "Manual del panel" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "El ciclo de un trabajo" })).toBeVisible();
  // Las capturas y el logo cargan (también las que esperan a que se baje)
  const rotas = await page.evaluate(async () => {
    for (const img of document.images) img.loading = "eager";
    await Promise.all([...document.images].map((i) => (i.complete ? null : new Promise((listo) => ((i.onload = i.onerror = listo))))));
    return [...document.images].filter((i) => i.naturalWidth === 0).map((i) => i.src);
  });
  expect(rotas).toEqual([]);
  // El PDF se baja directo
  const enlace = page.getByRole("link", { name: "Descargar PDF" });
  await expect(enlace).toHaveAttribute("href", "/panel/manual/manual-del-panel-toctar.pdf");
  const pdf = await page.request.get("/panel/manual/manual-del-panel-toctar.pdf");
  expect(pdf.status()).toBe(200);
  expect(pdf.headers()["content-type"]).toBe("application/pdf");
  // "Volver al panel"
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
  for (const ruta of ["/panel/manual/..%2F..%2Fpackage.json", "/panel/manual/capturas/..%2F..%2F..%2F.env", "/panel/manual/otro.html", "/panel/manual/capturas/06-recibir.jpg/x"]) {
    const r = await page.request.get(ruta);
    expect(r.status(), ruta).toBe(404);
  }
});
