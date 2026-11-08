import { expect, test, type Locator } from "@playwright/test";
import { abrirNuevoServicio, ingresarComoDueno } from "./apoyo";

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
    // Al cerrarlo con Escape, el foco vuelve al botón que lo abrió (la hoja se carga aparte: pulido 2, rendimiento)
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(abrir).toBeFocused();
    await expect(abrir).toHaveAttribute("aria-expanded", "false");
    await abrir.click();
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
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^Hola, /);
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
  const principal = page.getByRole("main").getByRole("link", { name: "Pedir cotización por WhatsApp" });
  await expect(principal).toBeInViewport();
  await expect(fijo).toBeHidden();
  // Al bajar y dejar atrás el principal, aparece
  // Hasta la mitad de los servicios: lejos del principal de arriba y del de cierre (pulido 2.1 acortó la portada)
  await page.getByRole("region", { name: "Servicios" }).locator(".tt-tarjeta").nth(3).evaluate((e) => e.scrollIntoView({ block: "center" }));
  await expect(principal).not.toBeInViewport();
  await expect(fijo).toBeVisible();
  // En una página sin botón principal, se ve desde el inicio
  await page.goto("/servicios");
  await expect(fijo).toBeVisible();
});

// Pedido de la demo del 24/10 (registro de cambios 1): la nubecita del botón fijo
test("el botón fijo de WhatsApp muestra una nubecita en cada página hasta que la cierran", async ({ page }) => {
  // Reloj de la página controlado: la espera de la nubecita se adelanta sin depender del tiempo real
  await page.clock.install();
  const fijo = page.getByRole("link", { name: "Escribir a TocTar por WhatsApp" });
  const nube = page.getByRole("link", { name: "¿Cotizamos tu vehículo?" });
  // Sale unos segundos después de aparecer el botón, y otra vez en la página siguiente
  for (let vez = 0; vez < 2; vez++) {
    await page.goto("/servicios");
    await page.clock.runFor(500);
    await expect(fijo).toBeVisible();
    await expect(nube).toHaveCount(0);
    await page.clock.runFor(3000);
    await expect(nube).toBeVisible();
  }
  await expect(nube).toHaveAttribute("href", (await fijo.getAttribute("href"))!);
  // Se cierra con la X; el foco pasa al botón, que queda
  await page.getByRole("button", { name: "Cerrar el mensaje" }).click();
  await expect(nube).toHaveCount(0);
  await expect(fijo).toBeFocused();
  // Cerrada, no vuelve en la visita aunque pase el tiempo
  await page.goto("/servicios");
  await page.clock.runFor(500);
  await expect(fijo).toBeVisible();
  await page.clock.runFor(10_000);
  await expect(nube).toHaveCount(0);
});

// Revisión de YankoSoft del 24/10: en la computadora, "Ver el servicio" queda a la misma altura en toda la fila de
// tarjetas, aunque los resúmenes tengan distinto largo
test("en la computadora, Ver el servicio queda al pie de cada tarjeta, a la misma altura en la fila", async ({ page, isMobile }) => {
  test.skip(isMobile, "En el celular cada servicio es una fila propia");
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/servicios");
  // La lista llega con el resto de la página: se espera a la tercera tarjeta antes de medir
  const enlaces = page.locator("main .tt-tarjeta__enlace");
  await expect(enlaces.nth(2)).toBeVisible();
  const alturas = await enlaces.evaluateAll((es) => es.slice(0, 3).map((e) => Math.round(e.getBoundingClientRect().top)));
  expect(new Set(alturas).size).toBe(1);
});

// Pulido visual 1.4
test("el panel no se sale de la pantalla en el celular y su menú queda a mano", async ({ page, isMobile }) => {
  await ingresarComoDueno(page);
  // Configuración (/panel/configuracion) todavía se pasa 3 px: pendiente de la pantalla 6.1
  for (const ruta of ["/panel", "/panel/sitio", "/panel/sitio/galeria", "/panel/reclamos", "/panel/configuracion/taller"]) {
    await page.goto(ruta);
    const anchos = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
    expect(anchos[0], ruta).toBeLessThanOrEqual(anchos[1]);
  }
  await page.mouse.wheel(0, 1500);
  if (isMobile) {
    const abrir = page.getByRole("button", { name: "Abrir menú" });
    await expect(abrir).toBeInViewport();
    await abrir.click();
  } else {
    await expect(page.getByRole("button", { name: "Cerrar sesión" })).toBeInViewport();
  }
  const menu = page.getByRole("navigation", { name: "Panel" });
  await expect(menu.getByRole("link", { name: "Configuración" })).toHaveAttribute("aria-current", "page");
  for (const alto of await menu.getByRole("link").evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height))) {
    expect(alto).toBeGreaterThanOrEqual(44);
  }
});

// Pulido visual 1.5
test("el aviso de guardado no tapa el botón de guardar", async ({ page }, info) => {
  test.skip(info.project.name !== "celular", "En el celular es donde tapaba");
  await ingresarComoDueno(page);
  await page.goto("/panel/configuracion/parametros");
  const guardar = page.getByRole("button", { name: "Guardar cambios" });
  // Con un cambio se activa (pulido 13.15). Un espacio al final: al guardar se quita, y no cambia lo que usan otras pruebas
  const formas = page.getByLabel("Formas de pago");
  await expect(formas).toBeVisible();
  await page.waitForLoadState("networkidle");
  await formas.fill(`${await formas.inputValue()} `);
  await expect(guardar).toBeEnabled();
  await guardar.scrollIntoViewIfNeeded();
  await guardar.click();
  const aviso = page.locator("[data-sonner-toast]").first();
  await expect(aviso).toContainText("Cambios guardados.");
  const [a, b] = [(await aviso.boundingBox())!, (await guardar.boundingBox())!];
  const sePisan = a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
  expect(sePisan).toBe(false);
});

test("las páginas interiores llegan enteras: el título no aparece antes que el resto", async ({ page }) => {
  // Con red lenta: cuando ya está el título de la página, también está el cierre del final (pulido 2.5)
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 300, downloadThroughput: 150000, uploadThroughput: 75000 });
  for (const ruta of ["/servicios", "/galeria", "/nosotros", "/preguntas-frecuentes", "/contacto"]) {
    await page.goto(ruta, { waitUntil: "commit" });
    await page.getByRole("heading", { level: 1 }).waitFor({ state: "attached" });
    expect(await page.locator("main [data-whatsapp-principal]").count(), ruta).toBeGreaterThan(0);
  }
  // Garantía no tiene WhatsApp (el formulario es la acción): cuando está el título, ya está el formulario
  await page.goto("/garantia", { waitUntil: "commit" });
  await page.getByRole("heading", { level: 1 }).waitFor({ state: "attached" });
  expect(await page.getByRole("form", { name: "Garantía y reclamos" }).count()).toBe(1);
});

// Pulido visual 4.2: con pantalla táctil los botones del panel miden 44 px; con mouse, 36
test("los botones del panel miden 44 px con pantalla táctil y 36 con mouse", async ({ page, isMobile }) => {
  await ingresarComoDueno(page);
  const alto = isMobile ? 44 : 36;
  const medir = async (boton: Locator) => expect(Math.round((await boton.boundingBox())!.height)).toBe(alto);
  await page.goto("/panel/catalogo");
  await medir(page.getByRole("button", { name: "Agregar servicio" }));
  await page.goto("/panel/sitio/servicios");
  await medir(page.getByRole("button", { name: /^Bajar / }).first());
  // Toda la fila abre el servicio, también la foto
  await page.getByRole("list", { name: "Servicios del sitio" }).getByRole("link").first().click();
  await expect(page).toHaveURL(/\/panel\/sitio\/servicios\/\d+$/);
});

// Estándar de botones del panel: ninguno usa los tamaños chicos (antes, 28 px con mouse en variantes, galería y horarios).
// El campo oculto para elegir una foto también tiene rol de botón: no se cuenta.
test("ningún botón del panel mide menos que el tamaño normal", async ({ page, isMobile }) => {
  await ingresarComoDueno(page);
  const minimo = isMobile ? 44 : 36;
  for (const ruta of ["/panel/sitio/servicios", "/panel/sitio/textos", "/panel/sitio/preguntas", "/panel/sitio/galeria", "/panel/configuracion/negocio", "/panel/catalogo/1"]) {
    await page.goto(ruta, { waitUntil: "networkidle" });
    if (ruta === "/panel/sitio/servicios") await page.getByRole("list", { name: "Servicios del sitio" }).getByRole("link").first().click();
    await expect(page.getByRole("main").getByRole("button").first()).toBeVisible();
    const chicos = await page.getByRole("main").getByRole("button").evaluateAll(
      (botones, min) => botones.filter((b) => b.tagName !== "INPUT" && (b as HTMLElement).offsetParent && b.getBoundingClientRect().height < min).map((b) => b.getAttribute("aria-label") || b.textContent?.trim()),
      minimo,
    );
    expect(chicos, ruta).toEqual([]);
  }
});

test("al enviar con errores el foco va al campo, y el enlace para volver mide 44 px", async ({ page }) => {
  await ingresarComoDueno(page);
  // El modal de Nuevo servicio (pulido 7.2) abre con el foco en el nombre: se lo saca, para que la prueba vea que el
  // error lo devuelve
  const nuevo = await abrirNuevoServicio(page);
  await expect(nuevo.getByLabel("Nombre del servicio")).toBeFocused();
  await nuevo.getByRole("button", { name: "Crear servicio" }).focus();
  await page.keyboard.press("Enter");
  await expect(nuevo.getByLabel("Nombre del servicio")).toBeFocused();
  await expect(nuevo.getByLabel("Nombre del servicio")).toHaveAttribute("aria-invalid", "true");
  // El enlace para volver de una ficha mide 44 px
  await page.goto("/panel/catalogo/1");
  const volver = page.getByRole("main").getByRole("link", { name: "Volver a Catálogo y precios" });
  expect(Math.round((await volver.boundingBox())!.height)).toBe(44);
});

test("en los beneficios de un servicio una fila vacía recibe el foco con su error, y sus botones van al costado", async ({ page }) => {
  await ingresarComoDueno(page);
  await page.goto("/panel/sitio/servicios");
  await page.getByRole("list", { name: "Servicios del sitio" }).getByRole("link").first().click();
  await page.getByRole("button", { name: "Editar beneficios" }).click();
  const modal = page.getByRole("dialog", { name: "Beneficios" });
  await modal.getByRole("button", { name: "Agregar beneficio" }).click();
  const n = await modal.getByRole("textbox", { name: /^Beneficio \d+$/ }).count();
  const beneficio = modal.getByRole("textbox", { name: `Beneficio ${n}`, exact: true });
  const campo = (await beneficio.boundingBox())!;
  const quitar = (await modal.getByRole("button", { name: `Quitar beneficio ${n}` }).boundingBox())!;
  // Ordenar es poco frecuente (pulido 13.19): los botones van al costado del campo, también en el celular
  expect(quitar.y).toBeLessThan(campo.y + campo.height);
  expect(quitar.x).toBeGreaterThan(campo.x + campo.width);
  await modal.getByRole("button", { name: "Guardar beneficios" }).click();
  await expect(beneficio).toBeFocused();
  await expect(beneficio).toHaveAttribute("aria-invalid", "true");
  await expect(beneficio).toHaveAccessibleDescription(/Escribe el beneficio o quita la fila/);
});

test("en Textos del sitio un motivo largo se lee entero, y Enter envía sin saltar de renglón", async ({ page }) => {
  await ingresarComoDueno(page);
  await page.goto("/panel/sitio/textos");
  await page.getByRole("button", { name: "Editar nosotros" }).click();
  const primero = page.getByRole("dialog", { name: "Nosotros" }).getByRole("textbox", { name: "Motivo 1" });
  const alto = (await primero.boundingBox())!.height;
  await primero.fill("Revisamos tu vehículo antes de darte un precio, con buena luz, y te mostramos lo que encontramos en la pintura.");
  // El campo crece en vez de cortar el texto
  await expect.poll(async () => (await primero.boundingBox())!.height).toBeGreaterThan(alto);
  // "Agregar motivo" mide lo mismo que el botón de guardar (antes, 28 px con mouse)
  const agregar = page.getByRole("button", { name: "Agregar motivo" });
  const guardar = page.getByRole("button", { name: "Guardar nosotros" });
  // Redondeado: el modal se abre con una animación de escala y deja diferencias de milésimas de píxel
  expect(Math.round((await agregar.boundingBox())!.height)).toBe(Math.round((await guardar.boundingBox())!.height));
  await agregar.click();
  const nuevo = page.getByRole("list", { name: "Motivo" }).getByRole("textbox").last();
  await nuevo.press("Enter");
  // Enter envió el formulario: el motivo vacío vuelve con su error y el foco
  await expect(nuevo).toBeFocused();
  await expect(nuevo).toHaveAttribute("aria-invalid", "true");
  await expect(nuevo).toHaveValue("");
});

test("en Preguntas, Agregar va arriba y en rojo, el error recibe el foco y tocar una pregunta la abre", async ({ page }) => {
  await ingresarComoDueno(page);
  await page.goto("/panel/sitio/preguntas");
  const agregar = page.getByRole("button", { name: "Agregar pregunta" });
  const lista = page.getByRole("list", { name: "Preguntas frecuentes" });
  expect((await agregar.boundingBox())!.y).toBeLessThan((await lista.boundingBox())!.y);
  await expect(agregar).toHaveCSS("background-color", "rgb(227, 6, 19)");
  await agregar.click();
  await page.getByRole("button", { name: "Agregar", exact: true }).click();
  await expect(page.getByLabel("Pregunta", { exact: true })).toBeFocused();
  await page.getByRole("button", { name: "Cancelar" }).click();
  // Tocar el texto de la primera pregunta abre su edición
  const primera = lista.getByRole("listitem").first();
  const texto = (await primera.locator(".font-semibold").first().textContent())!.trim();
  await primera.locator(".font-semibold").first().click();
  await expect(page.getByLabel("Pregunta", { exact: true })).toHaveValue(texto);
});

test("en la Galería del panel, subir sin nada marca todo junto y el foco va a la foto", async ({ page }) => {
  await ingresarComoDueno(page);
  await page.goto("/panel/sitio/galeria");
  await page.getByRole("button", { name: "Subir fotos" }).click();
  await page.getByRole("button", { name: "Guardar en la galería" }).click();
  // La foto del resultado se pide junto con los demás campos, y el foco va a ella
  await expect(page.getByText("Elige la foto del resultado.")).toBeVisible();
  await expect(page.getByText("Elige el servicio.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Elegir foto: Después" })).toBeFocused();
});

// Pedido del 24/10: en una página corta, la sección de cierre (la invitación a escribir) queda pegada al pie, sin un
// hueco debajo. Se mira en una pantalla alta, donde el contenido no la llena. Van las 6 páginas con cierre: el `mt-auto`
// solo funciona si el cierre es hijo directo de una columna flex que llena el alto, y una página nueva puede romperlo.
test("la sección de cierre queda pegada al pie aunque la página sea corta", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 2400 });
  for (const ruta of ["/", "/servicios", "/galeria", "/preguntas-frecuentes", "/nosotros", "/servicios/pulido-de-vidrios"]) {
    await page.goto(ruta);
    const cierre = page.locator("main section").filter({ has: page.locator("[data-whatsapp-principal]") }).last();
    await expect(cierre).toBeVisible();
    const hueco = await page.evaluate(() => {
      const secciones = [...document.querySelectorAll("main section")].filter((s) => s.querySelector("[data-whatsapp-principal]"));
      return Math.round(document.querySelector("footer")!.getBoundingClientRect().top - secciones.at(-1)!.getBoundingClientRect().bottom);
    });
    expect(hueco, ruta).toBe(0);
  }
});

// Pulido 13.4: lo que no existe dentro del panel se queda en el panel, con su menú, y no en la página del sitio
test("un registro o una dirección del panel que no existe se queda en el panel", async ({ page }, info) => {
  await ingresarComoDueno(page);
  for (const direccion of ["/panel/clientes/999999", "/panel/no-existe"]) {
    await page.goto(direccion);
    await expect(page.getByRole("heading", { level: 1, name: "No encontramos esto" })).toBeVisible();
    // Sin lo del sitio público, y con el menú del panel (en el celular, en su desplegable)
    await expect(page.getByRole("link", { name: "Ver los servicios" })).toHaveCount(0);
    if (info.project.name === "celular") await expect(page.getByRole("button", { name: "Abrir menú" })).toBeVisible();
    else await expect(page.getByRole("navigation", { name: "Panel" })).toBeVisible();
  }
  await page.getByRole("link", { name: "Ir al inicio" }).click();
  await expect(page).toHaveURL(/\/panel$/);
});
