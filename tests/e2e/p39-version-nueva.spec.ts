import { expect, test, type Page } from "@playwright/test";
import { ingresarComoDueno } from "./apoyo";

// Pedido 39: el aviso de versión nueva. Especificación: docs/08-desarrollo/etapas/P39-version-nueva.md §9.
// Se simula /api/version: lo que responde es la versión publicada. Cada prueba cuenta las revisiones, así espera la que
// corresponde y no una que ya estaba en curso.

/** /api/version responde `version` (o la real, sin ella) y cuenta cuántas veces se revisó. */
async function publicada(page: Page, version?: string) {
  const revisiones = { cantidad: 0 };
  await page.unroute("**/api/version");
  await page.route("**/api/version", async (ruta) => {
    revisiones.cantidad++;
    if (version) await ruta.fulfill({ json: { version } });
    else await ruta.fulfill({ response: await ruta.fetch() });
  });
  return revisiones;
}

const AVISO = "Hay una versión nueva del sistema";

test("si se publicó una versión nueva, el panel avisa y «Actualizar» recarga la página", async ({ page }) => {
  await ingresarComoDueno(page);
  await publicada(page, "una-version-nueva");
  await page.reload();
  const aviso = page.getByText(AVISO);
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
  const revisiones = await publicada(page);
  await page.reload();
  // La revisión de la página recargada ya respondió
  await expect.poll(() => revisiones.cantidad).toBeGreaterThan(0);
  await page.waitForTimeout(500);
  await expect(page.getByText(AVISO)).toHaveCount(0);
});

test("al volver a la app se revisa de nuevo, y si se cerró el aviso, vuelve con la versión siguiente", async ({ page }) => {
  await ingresarComoDueno(page);
  const primera = await publicada(page);
  await page.reload();
  await expect.poll(() => primera.cantidad).toBeGreaterThan(0);
  await expect(page.getByText(AVISO)).toHaveCount(0);

  // Mientras estaba en otra app se publicó una versión nueva: al volver, avisa
  await publicada(page, "version-2");
  await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
  await expect(page.getByText(AVISO)).toBeVisible();

  // Lo cierra: con la misma versión no vuelve a avisar
  await page.getByRole("button", { name: "Cerrar el aviso" }).click();
  await expect(page.getByText(AVISO)).toHaveCount(0);
  const misma = await publicada(page, "version-2");
  await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
  await expect.poll(() => misma.cantidad).toBeGreaterThan(0);
  await page.waitForTimeout(500);
  await expect(page.getByText(AVISO)).toHaveCount(0);

  // Se publica otra: avisa de nuevo
  await publicada(page, "version-3");
  await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
  await expect(page.getByText(AVISO)).toBeVisible();
});

test("en el sitio público no hay aviso", async ({ page }) => {
  await publicada(page, "una-version-nueva");
  await page.goto("/", { waitUntil: "load" });
  await page.waitForTimeout(1000);
  await expect(page.getByText(AVISO)).toHaveCount(0);
});
