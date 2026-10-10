import { expect, test } from "@playwright/test";

// Pruebas de humo de la iteración 0: la app arranca, conecta con la base y
// las dos áreas (sitio y panel) cargan con su navegación.

test("la verificación de estado responde ok", async ({ request }) => {
  const respuesta = await request.get("/api/salud");
  expect(respuesta.status()).toBe(200);
  expect(await respuesta.json()).toEqual({ estado: "ok", base: "ok" });
});

test("la portada carga con el nombre del negocio", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("TocTar Detailing");
  await expect(page).toHaveTitle("TocTar Detailing");
});

test("el menú del sitio funciona en celular y en computadora", async ({ page, isMobile }) => {
  await page.goto("/");
  if (isMobile) await page.getByRole("button", { name: "Abrir menú" }).click();
  await expect(page.getByRole("navigation", { name: "Principal" }).getByRole("link", { name: "Servicios" }))
    .toBeVisible();
});

test("el panel no se indexa en Google", async ({ page }) => {
  await page.goto("/panel");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Inicio");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
});
