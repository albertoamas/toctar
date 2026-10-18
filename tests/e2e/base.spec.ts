import { expect, test } from "@playwright/test";
import { ingresarComoDueno } from "./apoyo";

// Pruebas de humo de la iteración 0: la app arranca, conecta con la base y
// las dos áreas (sitio y panel) cargan con su navegación.

test("la verificación de estado responde ok", async ({ request }) => {
  const respuesta = await request.get("/api/salud");
  expect(respuesta.status()).toBe(200);
  expect(await respuesta.json()).toEqual({ estado: "ok", base: "ok" });
});

test("la portada carga con el nombre del negocio", async ({ page }) => {
  await page.goto("/");
  // El titular es el lema que carga el dueño (HU-08); el nombre va en el título de la pestaña.
  await expect(page.getByRole("heading", { level: 1 })).not.toBeEmpty();
  await expect(page).toHaveTitle("TocTar Detailing · Detailing automotriz en Tarija");
});

test("el menú del sitio funciona en celular y en computadora", async ({ page, isMobile }) => {
  await page.goto("/");
  if (isMobile) await page.getByRole("button", { name: "Abrir menú" }).click();
  await expect(page.getByRole("navigation", { name: "Principal" }).getByRole("link", { name: "Servicios" }))
    .toBeVisible();
});

// Pulido visual 1.1 (docs/08-desarrollo/pulido-visual.md)
test("el menú marca la página actual y, en el celular, se cierra al elegir una página", async ({ page, isMobile }) => {
  await page.goto("/servicios");
  const menu = () => page.getByRole("navigation", { name: "Principal" });
  if (isMobile) {
    const abrir = page.getByRole("button", { name: "Abrir menú" });
    const caja = (await abrir.boundingBox())!;
    expect(Math.min(caja.width, caja.height)).toBeGreaterThanOrEqual(44);
    await abrir.click();
    // En el celular también están las páginas de consulta y el WhatsApp
    await expect(menu().getByRole("link", { name: "Garantía y reclamos" })).toBeVisible();
    await expect(page.getByRole("dialog").getByRole("link", { name: /WhatsApp/ })).toBeVisible();
  }
  await expect(menu().getByRole("link", { name: "Servicios" })).toHaveAttribute("aria-current", "page");
  await menu().getByRole("link", { name: "Galería", exact: true }).click();
  await expect(page).toHaveURL(/\/galeria$/);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  if (isMobile) await page.getByRole("button", { name: "Abrir menú" }).click();
  await expect(menu().getByRole("link", { name: "Galería", exact: true })).toHaveAttribute("aria-current", "page");
});

test("el encabezado del sitio queda a mano al bajar", async ({ page }) => {
  await page.goto("/servicios");
  await page.mouse.wheel(0, 1500);
  await expect(page.getByRole("link", { name: "TocTar, inicio" })).toBeInViewport();
});

test("el panel y el ingreso no se indexan en Google", async ({ page }) => {
  await page.goto("/ingresar");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
  await ingresarComoDueno(page);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Inicio");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
});

// Pulido visual 1.2
test("los enlaces del pie tienen 44 px para el dedo", async ({ page }) => {
  await page.goto("/nosotros");
  const enlaces = page.getByRole("navigation", { name: "Pie" }).getByRole("link");
  await expect(enlaces).toHaveCount(6);
  for (const caja of await enlaces.evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height))) {
    expect(caja).toBeGreaterThanOrEqual(44);
  }
});

// Pulido visual 1.3
test("el botón fijo de WhatsApp se esconde mientras el principal está a la vista", async ({ page }) => {
  await page.goto("/");
  const fijo = page.getByRole("link", { name: "Escribir a TocTar por WhatsApp" });
  const principal = page.getByRole("main").getByRole("link", { name: "Escribir por WhatsApp" }).first();
  await expect(principal).toBeInViewport();
  await expect(fijo).toBeHidden();
  // Al bajar y dejar atrás el principal, aparece
  await page.mouse.wheel(0, 1600);
  await expect(principal).not.toBeInViewport();
  await expect(fijo).toBeVisible();
  // En una página sin botón principal, se ve desde el inicio
  await page.goto("/servicios");
  await expect(fijo).toBeVisible();
});
