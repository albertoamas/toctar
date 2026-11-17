import { expect, test, type Page } from "@playwright/test";
import { ingresarComoDueno } from "./apoyo";

// Respuesta al instante en el panel (17/11): con el servidor lejos, cada pantalla tarda en llegar. Al tocar un enlace,
// la barra de progreso aparece y lo tocado se marca enseguida, antes de que el servidor responda. Aquí se demora cada
// respuesta del servidor (las de RSC, las de navegar por dentro) para ver ese momento.

const DEMORA_MS = 1500;

async function demorarServidor(page: Page) {
  await page.route("**/*", async (ruta) => {
    if (ruta.request().headers()["rsc"] === "1") await new Promise((r) => setTimeout(r, DEMORA_MS));
    await ruta.continue();
  });
}

const barra = (page: Page) => page.locator(".tt-progreso-navegacion");

test("una pestaña: se marca y aparece la barra antes de que llegue la pantalla; al llegar, la barra se va", async ({ page }) => {
  await ingresarComoDueno(page);
  await page.goto("/panel/ordenes", { waitUntil: "networkidle" });
  await demorarServidor(page);
  const pestanas = page.getByRole("navigation", { name: "Órdenes" }).filter({ visible: true });
  const entregadas = pestanas.getByRole("link", { name: "Entregadas" });
  await entregadas.click();
  // Antes de la respuesta (que tarda 1,5 s): la barra está y la pestaña tocada ya se ve elegida
  await expect(barra(page)).toHaveCount(1, { timeout: 700 });
  await expect(entregadas).toHaveClass(/border-tinta/, { timeout: 700 });
  // Llega la pantalla: la pestaña queda elegida de verdad y la barra se va
  await expect(entregadas).toHaveAttribute("aria-current", "page");
  await expect(barra(page)).toHaveCount(0);
});

test("el menú: el módulo tocado se marca al instante", async ({ page }) => {
  await ingresarComoDueno(page);
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto("/panel", { waitUntil: "networkidle" });
  await demorarServidor(page);
  const clientes = page.getByRole("complementary").getByRole("link", { name: "Clientes" }).filter({ visible: true });
  await clientes.click();
  // El módulo se ve elegido enseguida. La barra puede no aparecer: los enlaces del menú a la vista se precargan, y si la
  // precarga ya llegó la pantalla cambia al instante (con su "Cargando…") y no hay nada que esperar
  await expect(clientes).toHaveClass(/tt-modulo-actual/, { timeout: 700 });
  await expect(page.getByRole("heading", { level: 1, name: "Clientes" })).toBeVisible();
  await expect(barra(page)).toHaveCount(0);
});

test("un enlace al mismo lugar no deja la barra puesta", async ({ page }) => {
  await ingresarComoDueno(page);
  // Con el menú lateral a la vista (en el celular está detrás de "☰")
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto("/panel/clientes", { waitUntil: "networkidle" });
  // El módulo actual: es el mismo lugar, no hay nada que esperar
  await page.getByRole("link", { name: "Clientes", exact: true }).filter({ visible: true }).first().click();
  await expect(barra(page)).toHaveCount(0);
});
