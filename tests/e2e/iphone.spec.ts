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
  // Las de la pantalla: en un flujo en pasos, las de los otros pasos están escondidas (pedido 40)
  const tarjetas = page.locator("fieldset.tt-seccion-formulario:visible");
  // Se espera a que se vea la primera: contar no espera, y en WebKit la página podía no estar dibujada todavía
  await expect(tarjetas.first()).toBeVisible();
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

test("en Negocio y Parámetros nada se sale de la pantalla", async ({ page }) => {
  await ingresarComoDueno(page);
  const ancho = page.viewportSize()!.width;
  // Negocio y Parámetros son fichas desde los pulidos 13.26 y 13.29: sus títulos van arriba de la tarjeta, como en las
  // demás fichas; aquí se mira que nada se salga
  for (const ruta of ["/panel/configuracion/negocio", "/panel/configuracion/parametros"]) {
    await page.goto(ruta, { waitUntil: "networkidle" });
    expect(await anchoDePagina(page), ruta).toBeLessThanOrEqual(ancho);
  }
  // Con un logo mucho más ancho que la pantalla, la caja guarda su forma (3:2) y la página no se estira
  await page.goto("/panel/configuracion/negocio", { waitUntil: "networkidle" });
  await expect(page.getByRole("button", { name: /^(Subir|Cambiar) logo$/ })).toBeEnabled();
  await page.getByLabel("Archivo del logo").setInputFiles({ name: "logo-ancho.png", mimeType: "image/png", buffer: PNG_ANCHO });
  await expect(page.getByRole("img", { name: "Logo actual para documentos" })).toBeVisible();
  expect(await anchoDePagina(page)).toBeLessThanOrEqual(ancho);
  const logo = page.getByRole("region", { name: "Logo para documentos" });
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
  // El paso del vehículo, en su propia pantalla (pedido 40)
  await page.getByLabel("Nombre", { exact: true }).fill("Cliente iPhone");
  await page.getByRole("textbox", { name: "WhatsApp" }).fill("71234567");
  await page.getByRole("button", { name: "Siguiente: vehículo" }).click();
  await expect(page.getByRole("group", { name: "Vehículo nuevo" })).toBeVisible();
  await titulosAdentro(page);
  expect(await anchoDePagina(page)).toBeLessThanOrEqual(page.viewportSize()!.width);
});

// La portada en Safari: los servicios de a dos por fila con su foto a la vista, el video de TikTok vertical (si hay) y
// nada que estire la página hacia la derecha. Pulido 13.54: en Safari, el recuadro de la foto del mosaico medía 0 px
// (estirado a lo alto de la fila, sin su proporción) y la foto, con carga diferida, nunca se pedía.
test("en la portada los servicios van de a dos con su foto y nada se sale de la pantalla", async ({ page }) => {
  await page.goto("/");
  const tarjetas = page.getByRole("region", { name: "Servicios" }).locator(".tt-tarjeta");
  await expect(tarjetas.first()).toBeVisible();
  const [a, b] = [(await tarjetas.nth(0).boundingBox())!, (await tarjetas.nth(1).boundingBox())!];
  expect(Math.abs(a.y - b.y)).toBeLessThan(2);
  const foto = (await tarjetas.first().locator(".tt-tarjeta__media").boundingBox())!;
  expect(foto.height).toBeGreaterThan(100);
  // El video sale solo si el dueño subió uno (pedido 48)
  const video = page.locator(".tt-video-tiktok");
  if (await video.count()) {
    await video.scrollIntoViewIfNeeded();
    const caja = (await video.boundingBox())!;
    expect(caja.height / caja.width).toBeGreaterThan(1.7);
  }
  expect(await anchoDePagina(page)).toBeLessThanOrEqual(page.viewportSize()!.width);
});

// Revisión de los modales (13/11): Safari no achica la pantalla al abrir el teclado (solo la parte visible,
// visualViewport) y la hoja de un modal, pegada abajo, quedaba detrás con "Guardar" tapado. Ahora se apoya sobre el
// teclado. Playwright no abre el teclado del iPhone: se simula su visualViewport, con 300 px tapados.
test("con el teclado abierto, la hoja del modal se apoya sobre él y su botón se ve", async ({ page }) => {
  await page.addInitScript(() => {
    const falso = new EventTarget();
    let tapado = 0;
    Object.defineProperty(falso, "height", { get: () => window.innerHeight - tapado });
    Object.defineProperty(falso, "offsetTop", { get: () => 0 });
    Object.defineProperty(window, "visualViewport", { get: () => falso, configurable: true });
    (window as unknown as { abrirTeclado: (px: number) => void }).abrirTeclado = (px) => {
      tapado = px;
      falso.dispatchEvent(new Event("resize"));
    };
  });
  await ingresarComoDueno(page);
  await page.goto("/panel/catalogo");
  await page.getByRole("main").getByRole("button", { name: "Agregar servicio" }).click();
  const dialogo = page.getByRole("dialog", { name: "Nuevo servicio" });
  await expect(dialogo).toBeVisible();
  const alto = page.viewportSize()!.height;
  // Sin teclado, pegada abajo
  await expect.poll(async () => Math.round((await dialogo.boundingBox())!.y + (await dialogo.boundingBox())!.height)).toBeGreaterThanOrEqual(alto - 2);

  await page.evaluate(() => (window as unknown as { abrirTeclado: (px: number) => void }).abrirTeclado(300));
  const sobreElTeclado = alto - 300;
  await expect.poll(async () => {
    const caja = (await dialogo.boundingBox())!;
    return Math.round(caja.y + caja.height);
  }).toBeLessThanOrEqual(sobreElTeclado + 2);
  const crear = (await dialogo.getByRole("button", { name: "Crear servicio" }).boundingBox())!;
  expect(crear.y + crear.height).toBeLessThanOrEqual(sobreElTeclado);
  expect((await dialogo.boundingBox())!.y).toBeGreaterThanOrEqual(0);

  // Al cerrarse el teclado, vuelve abajo
  await page.evaluate(() => (window as unknown as { abrirTeclado: (px: number) => void }).abrirTeclado(0));
  await expect.poll(async () => Math.round((await dialogo.boundingBox())!.y + (await dialogo.boundingBox())!.height)).toBeGreaterThanOrEqual(alto - 2);
});
