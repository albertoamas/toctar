import { expect, test, type Page } from "@playwright/test";
import { ingresarComoDueno } from "./apoyo";

// Pedido 39: el aviso de versión nueva. Especificación: docs/08-desarrollo/etapas/P39-version-nueva.md §9.
// Se simula /api/version: lo que responde es la versión publicada.

/** /api/version responde otra versión, como si se hubiera publicado una nueva desde que se abrió la página. */
async function publicadaOtra(page: Page) {
  await page.route("**/api/version", (ruta) => ruta.fulfill({ json: { version: "una-version-nueva" } }));
}

test("si se publicó una versión nueva, el panel avisa y «Actualizar» recarga la página", async ({ page }) => {
  await ingresarComoDueno(page);
  await publicadaOtra(page);
  await page.reload();
  const aviso = page.getByText("Hay una versión nueva del sistema");
  await expect(aviso).toBeVisible();
  await expect(page.getByText("Actualiza para seguir con lo último.")).toBeVisible();
  // No se va solo: sigue ahí pasado el tiempo de los otros avisos
  await page.waitForTimeout(4000);
  await expect(aviso).toBeVisible();
  // "Actualizar" recarga
  const recarga = page.waitForEvent("load");
  await page.getByRole("button", { name: "Actualizar" }).click();
  await recarga;
});

test("con la misma versión no hay aviso", async ({ page }) => {
  await ingresarComoDueno(page);
  const revisada = page.waitForResponse((r) => r.url().endsWith("/api/version"));
  await page.reload();
  await revisada;
  await page.waitForTimeout(500);
  await expect(page.getByText("Hay una versión nueva del sistema")).toHaveCount(0);
});

test("al volver a la app se revisa de nuevo", async ({ page }) => {
  await ingresarComoDueno(page);
  await expect(page.getByText("Hay una versión nueva del sistema")).toHaveCount(0);
  // Mientras estaba en otra app se publicó una versión nueva
  await publicadaOtra(page);
  await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
  await expect(page.getByText("Hay una versión nueva del sistema")).toBeVisible();
});

test("en el sitio público no hay aviso", async ({ page }) => {
  await publicadaOtra(page);
  await page.goto("/", { waitUntil: "load" });
  await page.waitForTimeout(1000);
  await expect(page.getByText("Hay una versión nueva del sistema")).toHaveCount(0);
});
