import { expect, test, type Page } from "@playwright/test";
import { ingresarComoDueno } from "./apoyo";

// Lo que se ve distinto en el iPhone (Safari y todos los navegadores del iPhone usan WebKit). Corre solo en el proyecto
// "iphone" de playwright.config.ts. Salió de la revisión en un iPhone del 03/11: en las tarjetas de formulario el título
// quedaba sobre el borde (Safari no deja flotar una leyenda dentro de un fieldset flex) y en Negocio la caja del logo
// estiraba la página hacia la derecha.

/** Cada tarjeta de formulario: su título, adentro del borde de arriba (no encima) y el primer campo, debajo del título. */
async function titulosAdentro(page: Page) {
  const tarjetas = page.locator("fieldset.tt-seccion-formulario");
  expect(await tarjetas.count()).toBeGreaterThan(0);
  for (const tarjeta of await tarjetas.all()) {
    const borde = (await tarjeta.boundingBox())!;
    const leyenda = tarjeta.locator(":scope > legend");
    if (await leyenda.evaluate((l) => l.classList.contains("sr-only"))) continue;
    const titulo = (await leyenda.boundingBox())!;
    const contenido = (await tarjeta.locator(":scope > div").first().boundingBox())!;
    expect(titulo.y, await leyenda.innerText()).toBeGreaterThan(borde.y + 4);
    expect(contenido.y, await leyenda.innerText()).toBeGreaterThanOrEqual(titulo.y + titulo.height);
  }
}

const anchoDePagina = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth);

test("en Negocio y Parámetros los títulos van adentro de su tarjeta y nada se sale de la pantalla", async ({ page }) => {
  await ingresarComoDueno(page);
  const ancho = page.viewportSize()!.width;
  for (const ruta of ["/panel/configuracion/negocio", "/panel/configuracion/parametros"]) {
    await page.goto(ruta, { waitUntil: "networkidle" });
    await titulosAdentro(page);
    expect(await anchoDePagina(page), ruta).toBeLessThanOrEqual(ancho);
  }
  // La caja del logo guarda su forma (3:2), con logo o sin él, y no pasa el ancho de la pantalla
  await page.goto("/panel/configuracion/negocio", { waitUntil: "networkidle" });
  const logo = page.getByRole("heading", { name: "Logo para documentos" }).locator("xpath=ancestor::form[1]");
  const caja = (await logo.locator(".aspect-\\[3\\/2\\]").boundingBox())!;
  expect(caja.width).toBeLessThanOrEqual(ancho);
  expect(Math.abs(caja.width / caja.height - 1.5)).toBeLessThan(0.05);
});

test("en Nueva cotización con un cliente nuevo los títulos van adentro de su tarjeta", async ({ page }) => {
  await ingresarComoDueno(page);
  await page.goto("/panel/cotizaciones/nueva");
  await page.getByRole("link", { name: "Cliente nuevo" }).click();
  await expect(page.getByRole("heading", { name: "Cliente nuevo" })).toBeVisible();
  await titulosAdentro(page);
  expect(await anchoDePagina(page)).toBeLessThanOrEqual(page.viewportSize()!.width);
});
