import { expect, test, type Page } from "@playwright/test";
import { ingresarComoDueno } from "./apoyo";

// Pulido 2B.18: el menú del celular se desliza también la primera vez después de cargar la página. Antes, ese primer
// toque esperaba unos 300 ms y la hoja aparecía de golpe, ya abierta. Solo en el celular (el menú no existe en la
// computadora).

test.skip(({ isMobile }) => !isMobile, "El menú desplegable es del celular");

/** Toca "Abrir menú" y anota dónde está la hoja en cada cuadro: si se anima, pasa por varias posiciones. */
async function posicionesAlAbrir(page: Page) {
  return page.evaluate(async () => {
    const boton = [...document.querySelectorAll("button")].find((b) => b.textContent?.includes("Abrir menú"))!;
    const inicio = performance.now();
    boton.click();
    const posiciones = new Set<number>();
    while (performance.now() - inicio < 1500) {
      await new Promise((listo) => requestAnimationFrame(listo));
      const hoja = document.querySelector('[data-slot="sheet-content"]');
      if (hoja) posiciones.add(Math.round(hoja.getBoundingClientRect().left));
    }
    return [...posiciones];
  });
}

test("el menú del sitio se desliza desde el primer toque, recién cargada la página", async ({ page }) => {
  await page.goto("/servicios", { waitUntil: "load" });
  expect((await posicionesAlAbrir(page)).length).toBeGreaterThan(2);
  await expect(page.getByRole("dialog", { name: "Menú" })).toBeVisible();
});

test("el menú se desliza aunque se toque antes de que termine de cargar la página", async ({ page }) => {
  await page.goto("/servicios", { waitUntil: "commit" });
  await page.getByRole("button", { name: "Abrir menú" }).waitFor();
  // El botón responde apenas la página se puede usar, sin esperar a que termine de cargar
  await page.waitForFunction(() => document.readyState !== "loading");
  expect((await posicionesAlAbrir(page)).length).toBeGreaterThan(2);
  await expect(page.getByRole("dialog", { name: "Menú" })).toBeVisible();
});

test("el menú del panel se desliza desde el primer toque, recién cargada la página", async ({ page }) => {
  await ingresarComoDueno(page);
  await page.reload({ waitUntil: "load" });
  expect((await posicionesAlAbrir(page)).length).toBeGreaterThan(2);
  await expect(page.getByRole("dialog", { name: "Menú" })).toBeVisible();
});
