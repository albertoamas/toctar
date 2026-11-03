import { expect, test, type Page } from "@playwright/test";
import { deflateSync } from "node:zlib";
import { ingresarComoDueno } from "./apoyo";

/** Un logo de 2000 × 200 (mucho más ancho que la pantalla), en PNG armado a mano: rojo de punta a punta. */
const PNG_ANCHO = (() => {
  const ancho = 2000;
  const alto = 200;
  const crc = (datos: Buffer) => {
    let c = ~0;
    for (const b of datos) {
      c ^= b;
      for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
    }
    return ~c >>> 0;
  };
  const trozo = (tipo: string, datos: Buffer) => {
    const largo = Buffer.alloc(4);
    largo.writeUInt32BE(datos.length);
    const cuerpo = Buffer.concat([Buffer.from(tipo), datos]);
    const suma = Buffer.alloc(4);
    suma.writeUInt32BE(crc(cuerpo));
    return Buffer.concat([largo, cuerpo, suma]);
  };
  const cabecera = Buffer.alloc(13);
  cabecera.writeUInt32BE(ancho, 0);
  cabecera.writeUInt32BE(alto, 4);
  cabecera.set([8, 2, 0, 0, 0], 8); // 8 bits por canal, RGB
  const fila = Buffer.concat([Buffer.from([0]), Buffer.from(Array.from({ length: ancho }, () => [227, 6, 19]).flat())]);
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    trozo("IHDR", cabecera),
    trozo("IDAT", deflateSync(Buffer.concat(Array.from({ length: alto }, () => fila)))),
    trozo("IEND", Buffer.alloc(0)),
  ]);
})();

// Lo que se ve distinto en el iPhone (Safari y todos los navegadores del iPhone usan WebKit). Corre solo en el proyecto
// "iphone" de playwright.config.ts. Salió de la revisión en un iPhone del 03/11: en las tarjetas de formulario el título
// quedaba sobre el borde (Safari no deja flotar una leyenda dentro de un fieldset flex) y en Negocio la caja del logo
// estiraba la página hacia la derecha.

/** Cada tarjeta de formulario: su título, adentro del borde de arriba (no encima) y el primer campo, debajo del título. */
async function titulosAdentro(page: Page) {
  const tarjetas = page.locator("fieldset.tt-seccion-formulario");
  expect(await tarjetas.count()).toBeGreaterThan(0);
  for (const tarjeta of await tarjetas.all()) {
    const leyenda = tarjeta.locator(":scope > legend");
    if (await leyenda.evaluate((l) => l.classList.contains("sr-only"))) continue;
    const nombre = await leyenda.innerText();
    const [borde, titulo, contenido] = await Promise.all([tarjeta.boundingBox(), leyenda.boundingBox(), tarjeta.locator(":scope > div").first().boundingBox()]);
    expect(borde && titulo && contenido, `${nombre}: la tarjeta, su título y su contenido se ven`).toBeTruthy();
    expect(titulo!.y, nombre).toBeGreaterThan(borde!.y + 4);
    expect(contenido!.y, nombre).toBeGreaterThanOrEqual(titulo!.y + titulo!.height);
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
  // Con un logo mucho más ancho que la pantalla, la caja guarda su forma (3:2) y la página no se estira
  await page.goto("/panel/configuracion/negocio", { waitUntil: "networkidle" });
  await expect(page.getByRole("button", { name: /^(Subir|Cambiar) logo$/ })).toBeEnabled();
  await page.getByLabel("Archivo del logo").setInputFiles({ name: "logo-ancho.png", mimeType: "image/png", buffer: PNG_ANCHO });
  await expect(page.getByRole("img", { name: "Logo actual para documentos" })).toBeVisible();
  expect(await anchoDePagina(page)).toBeLessThanOrEqual(ancho);
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
