import { expect, test, type Page } from "@playwright/test";
import { deflateSync } from "node:zlib";
import { ingresarComoDueno } from "./apoyo";

// Una detrás de otra (19/11): cada una empieza ingresando como el dueño, y el límite de ingreso anota el intento antes de
// probar la contraseña (así frena a quien prueba muchas en paralelo). Con 7 a la vez, desde la misma conexión, la
// séptima veía 6 intentos en curso y quedaba bloqueada ("Demasiados intentos"). "default" y no "serial": si una falla,
// las demás corren igual
test.describe.configure({ mode: "default" });

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
    // La leyenda es la franja de la cabecera (C7, 18/11): empieza en el borde de arriba; su texto, adentro
    const [borde, franja, titulo, contenido] = await Promise.all([
      tarjeta.boundingBox(),
      leyenda.boundingBox(),
      leyenda.locator(".tt-titulo-seccion").boundingBox(),
      tarjeta.locator(":scope > div").first().boundingBox(),
    ]);
    expect(borde && franja && titulo && contenido, `${nombre}: la tarjeta, su título y su contenido se ven`).toBeTruthy();
    expect(titulo!.y, nombre).toBeGreaterThan(borde!.y + 4);
    expect(contenido!.y, nombre).toBeGreaterThanOrEqual(franja!.y + franja!.height);
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
  await expect(page.getByRole("group", { name: "Cliente nuevo" })).toBeVisible();
  await titulosAdentro(page);
  expect(await anchoDePagina(page)).toBeLessThanOrEqual(page.viewportSize()!.width);
  // El paso del vehículo, en su propia pantalla (pedido 40)
  await page.getByLabel("Nombre", { exact: true }).fill("Cliente iPhone");
  await page.getByRole("textbox", { name: "WhatsApp" }).fill("71234567");
  await page.getByRole("button", { name: "Siguiente: vehículo" }).click();
  // Alguien nuevo se cotiza sin registrarlo (P31b): el vehículo, sin placa
  await expect(page.getByRole("group", { name: "Vehículo", exact: true })).toBeVisible();
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
    Object.defineProperty(falso, "height", { get: () => document.documentElement.clientHeight - tapado });
    Object.defineProperty(falso, "offsetTop", { get: () => 0 });
    Object.defineProperty(falso, "scale", { get: () => 1 });
    Object.defineProperty(window, "visualViewport", { get: () => falso, configurable: true });
    (window as unknown as { abrirTeclado: (px: number) => void }).abrirTeclado = (px) => {
      tapado = px;
      falso.dispatchEvent(new Event("resize"));
    };
  });
  await ingresarComoDueno(page);
  await page.goto("/panel/catalogo");
  await page.getByRole("main").getByRole("button", { name: "Nuevo servicio" }).click();
  const dialogo = page.getByRole("dialog", { name: "Nuevo servicio" });
  await expect(dialogo).toBeVisible();
  const alto = page.viewportSize()!.height;
  const abajo = async () => {
    const caja = (await dialogo.boundingBox())!;
    return Math.round(caja.y + caja.height);
  };
  // Sin teclado, pegada abajo
  await expect.poll(abajo).toBeGreaterThanOrEqual(alto - 2);

  await page.evaluate(() => (window as unknown as { abrirTeclado: (px: number) => void }).abrirTeclado(300));
  const sobreElTeclado = alto - 300;
  await expect.poll(abajo).toBeLessThanOrEqual(sobreElTeclado + 2);
  const crear = (await dialogo.getByRole("button", { name: "Crear servicio" }).boundingBox())!;
  expect(crear.y + crear.height).toBeLessThanOrEqual(sobreElTeclado);
  expect((await dialogo.boundingBox())!.y).toBeGreaterThanOrEqual(0);

  // Al cerrarse el teclado, vuelve abajo
  await page.evaluate(() => (window as unknown as { abrirTeclado: (px: number) => void }).abrirTeclado(0));
  await expect.poll(abajo).toBeGreaterThanOrEqual(alto - 2);
});

test("con un modal abierto, la página de atrás no se desplaza, y al cerrarlo vuelve a desplazarse", async ({ page }) => {
  // 19/11, prueba en un iPhone 14: el bloqueo de Base UI está apagado en el celular (parpadeaba al cerrar) y el fondo se
  // movía con el dedo. Lo bloquea una regla de globals.css (overflow: hidden en <html>, que Safari respeta desde iOS 16),
  // sin mover el contenido de lugar. Playwright no desliza con el dedo en WebKit: se mira la regla
  await ingresarComoDueno(page);
  await page.goto("/panel/catalogo");
  const desplazamiento = () => page.evaluate(() => getComputedStyle(document.documentElement).overflowY);
  expect(await desplazamiento()).not.toBe("hidden");

  await page.getByRole("main").getByRole("button", { name: "Nuevo servicio" }).click();
  const dialogo = page.getByRole("dialog", { name: "Nuevo servicio" });
  await expect(dialogo).toBeVisible();
  await expect.poll(desplazamiento).toBe("hidden");
  // Sin el bloqueo de Base UI, que en Safari movía el contenido a otro contenedor (el parpadeo al cerrar)
  expect(await page.evaluate(() => document.documentElement.hasAttribute("data-base-ui-scroll-locked"))).toBe(false);

  await dialogo.getByRole("button", { name: "Cancelar" }).click();
  await expect(dialogo).toHaveCount(0);
  await expect.poll(desplazamiento).not.toBe("hidden");
});

/** Que la pantalla terminó de cargar (como en cambios-sin-guardar.spec.ts): antes, lo escrito no cuenta como cambio. */
const hidratada = async (page: Page) => {
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(300);
};

test("la misma regla bloquea \"¿Salir sin guardar?\" y el menú, y no un buscador", async ({ page }) => {
  // La regla reconoce cualquier ventana modal por su función (role), no por el nombre de un componente. "¿Salir sin
  // guardar?" ya no usa el AlertDialog de Base UI, que siempre bloqueaba a su manera (parpadeaba en el iPhone)
  const desplazamiento = () => page.evaluate(() => getComputedStyle(document.documentElement).overflowY);
  const bloqueoDeBaseUI = () => page.evaluate(() => document.documentElement.hasAttribute("data-base-ui-scroll-locked"));
  await ingresarComoDueno(page);

  // "¿Salir sin guardar?"
  await page.goto("/panel/usuarios/nuevo");
  await hidratada(page);
  await page.getByLabel("Nombre", { exact: true }).fill("A medio escribir");
  await page.locator('main a[href="/panel/usuarios"]').first().click();
  const pregunta = page.getByRole("alertdialog", { name: "¿Salir sin guardar?" });
  await expect(pregunta).toBeVisible();
  await expect.poll(desplazamiento).toBe("hidden");
  expect(await bloqueoDeBaseUI()).toBe(false);
  // Sigue siendo una alerta: un toque afuera no la cierra
  await page.mouse.click(10, 10);
  await expect(pregunta).toBeVisible();
  await pregunta.getByRole("button", { name: "Seguir editando" }).click();
  await expect(pregunta).toHaveCount(0);
  await expect.poll(desplazamiento).not.toBe("hidden");

  // El menú del celular (una hoja)
  await page.getByRole("button", { name: "Abrir menú" }).click();
  await expect(page.getByRole("dialog", { name: "Menú" })).toBeVisible();
  await expect.poll(desplazamiento).toBe("hidden");
  expect(await bloqueoDeBaseUI()).toBe(false);
  await page.getByRole("button", { name: "Cerrar menú" }).click();
  await expect.poll(desplazamiento).not.toBe("hidden");

  // Un buscador con su lista (la marca de un vehículo) no es una ventana modal: la página sigue desplazándose
  await page.goto("/panel/clientes/nuevo");
  await hidratada(page);
  // La marca está plegada
  await page.getByText("Agregar marca, modelo, año y color").click();
  await page.getByLabel("Marca").fill("To");
  await expect(page.getByRole("listbox")).toBeVisible();
  expect(await desplazamiento()).not.toBe("hidden");
});

test("al desplazar un formulario, el pie fijo no cambia el alto de la página", async ({ page }) => {
  // 19/11, prueba en un iPhone 14: el pie medía su posición en cada desplazamiento y, en el rebote del final de la página
  // (el iPhone informa una posición distinta en cada cuadro), cambiaba el alto de la página: "tironeaba" contra el dedo.
  // Ahora mide su alto, y solo cuando cambia de tamaño
  await ingresarComoDueno(page);
  await page.goto("/panel/clientes/nuevo");
  const pie = page.locator("[data-pie-movil]");
  await expect(pie).toBeVisible();
  // Lo que reserva al final es su alto
  const alto = Math.round((await pie.boundingBox())!.height);
  await expect.poll(() => page.evaluate(() => document.documentElement.style.getPropertyValue("--alto-pie-movil"))).toBe(`${alto}px`);
  const cambios = await page.evaluateHandle(() => {
    const lista: string[] = [];
    new MutationObserver(() => lista.push(document.documentElement.style.getPropertyValue("--alto-pie-movil"))).observe(document.documentElement, { attributes: true, attributeFilter: ["style"] });
    // El rebote: el pie dice estar un poco más abajo en cada cuadro, con el mismo alto
    const elemento = document.querySelector<HTMLElement>("[data-pie-movil]")!;
    const original = elemento.getBoundingClientRect.bind(elemento);
    let rebote = 0;
    elemento.getBoundingClientRect = () => {
      const r = original();
      rebote += 7;
      return new DOMRect(r.x, r.y + rebote, r.width, r.height);
    };
    return lista;
  });
  for (let i = 0; i < 12; i++) {
    await page.evaluate((y) => {
      window.scrollTo(0, y);
      window.dispatchEvent(new Event("scroll"));
    }, i * 60);
    await page.waitForTimeout(40);
  }
  expect(await cambios.evaluate((l) => l)).toEqual([]);
});
