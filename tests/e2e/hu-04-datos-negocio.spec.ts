import { expect, test, type TestInfo } from "@playwright/test";
import { abrirParteNegocio, archivosArrastrados, crearUsuario, ingresar, ingresarComoDueno, PERFIL_TALLER, PNG } from "./apoyo";

// HU-04 Datos del negocio. Criterios: docs/09-pruebas/criterios-entrega-1.md (4.1 a 4.6).
// Los datos del negocio son una sola fila: las pruebas que guardan corren solo en escritorio,
// para que celular y escritorio no se pisen al correr en paralelo.

// Pedido 38: un enlace de ficha y un mapa con la forma de los que da Google en "Compartir"
const FICHA = "https://www.google.com/maps/place/TocTar/data=!3d-21.5355!4d-64.7296";
const MAPA = "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3711!2d-64.7296!3d-21.5355!2m3!1f0!2f0!3f0";
const PREPARADO = "https://www.google.com/maps/place/x/data=!3d-21.5355!4d-64.7296";

const sufijo = (info: TestInfo) => (info.project.name === "celular" ? "c" : "e");
const soloEscritorio = (info: TestInfo) => test.skip(info.project.name !== "escritorio", "Guarda la fila única del negocio");

test("el dueño cambia los datos y el pie del sitio los muestra al guardar", async ({ page }, info) => {
  soloEscritorio(info);
  await ingresarComoDueno(page);
  await page.getByRole("navigation", { name: "Panel" }).getByRole("link", { name: "Configuración" }).click();
  await expect(page.getByRole("heading", { name: "Configuración" })).toBeVisible();
  // Desde la portada de Configuración (pedido 26), a Negocio
  await page.getByRole("navigation", { name: "Partes de la configuración" }).getByRole("link", { name: /^Negocio/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Negocio" })).toBeVisible();

  // Cada parte en su modal, con su botón (pulido 13.26)
  const contacto = await abrirParteNegocio(page, "Contacto");
  await contacto.getByLabel("WhatsApp").fill("+591 712 34 567");
  await contacto.getByRole("button", { name: "Guardar contacto" }).click();
  await expect(page.getByText("Contacto guardado.")).toBeVisible();
  const ubicacion = await abrirParteNegocio(page, "Ubicación");
  await ubicacion.getByLabel("Dirección").fill("Barrio Aeropuerto, calle Juan Pablo II, Tarija");
  // Pedido 38: el enlace y el mapa de la ficha (Compartir)
  await ubicacion.getByLabel("Enlace de Google Maps").fill(FICHA);
  await ubicacion.getByLabel("Mapa para la página").fill(`<iframe src="${MAPA}" width="600" height="450"></iframe>`);
  await ubicacion.getByRole("button", { name: "Guardar ubicación" }).click();
  await expect(page.getByText("Ubicación guardada.")).toBeVisible();
  const redes = await abrirParteNegocio(page, "Redes sociales");
  await redes.getByLabel("Instagram").fill("instagram.com/toctar.detailing");
  await redes.getByRole("button", { name: "Guardar redes" }).click();
  await expect(page.getByText("Redes guardadas.")).toBeVisible();
  // El sábado solo abre a la mañana
  const horario = await abrirParteNegocio(page, "Horario de atención");
  await horario.getByRole("button", { name: "Quitar el segundo turno del sábado" }).click();
  await horario.getByRole("button", { name: "Guardar horario" }).click();
  await expect(page.getByText("Horario guardado.")).toBeVisible();
  try {
  // Se guardó normalizado; la ficha lo muestra leído
  await page.reload();
  await expect(page.getByRole("region", { name: "Contacto" })).toContainText("+591 71234567");
  await expect(page.getByRole("region", { name: "Ubicación" }).getByRole("link", { name: "Ver en el mapa" })).toHaveAttribute("href", FICHA);
  await expect(page.getByRole("region", { name: "Horario de atención" })).toContainText("Lunes a viernes");
  await expect(page.getByRole("region", { name: "Redes sociales" }).getByRole("link", { name: "instagram.com/toctar.detailing" })).toHaveAttribute("href", "https://instagram.com/toctar.detailing");
  const ubicacionGuardada = await abrirParteNegocio(page, "Ubicación");
  await expect(ubicacionGuardada.getByLabel("Enlace de Google Maps")).toHaveValue(FICHA);
  // Del código pegado queda solo la dirección del mapa
  await expect(ubicacionGuardada.getByLabel("Mapa para la página")).toHaveValue(MAPA);
  await ubicacionGuardada.getByRole("button", { name: "Cancelar" }).click();

  // El sitio lo muestra sin volver a desplegar (RF-17)
  await page.goto("/");
  const pie = page.getByRole("contentinfo");
  await expect(pie).toContainText("Barrio Aeropuerto, calle Juan Pablo II, Tarija");
  await expect(pie).toContainText("Lunes a viernes");
  await expect(pie).toContainText("8:00–12:00 y 14:00–18:00");
  await expect(pie.getByRole("link", { name: "WhatsApp +591 7123 4567" })).toHaveAttribute("href", "https://wa.me/59171234567");
  await expect(pie.getByRole("link", { name: "Cómo llegar" })).toHaveAttribute("href", FICHA);
  await expect(pie.getByRole("link", { name: "Instagram" })).toHaveAttribute("href", "https://instagram.com/toctar.detailing");
  // Las redes que no están cargadas no se muestran (TikTok lo carga preparar.setup.ts)
  await expect(pie.getByRole("link", { name: "Facebook" })).toHaveCount(0);

  // Contacto: la ficha en "Cómo llegar" y su mapa
  await page.goto("/contacto");
  await expect(page.getByRole("main").getByRole("link", { name: "Cómo llegar" })).toHaveAttribute("href", FICHA);
  await expect(page.getByTitle("Mapa del taller de TocTar Detailing")).toHaveAttribute("src", MAPA);

  // El enlace corto de Compartir no trae coordenadas: sin mapa pegado, se conservan las guardadas y Contacto sigue con mapa
  await page.goto("/panel/configuracion/negocio");
  const corto = await abrirParteNegocio(page, "Ubicación");
  await corto.getByLabel("Enlace de Google Maps").fill("https://maps.app.goo.gl/AbCdEf123");
  await corto.getByLabel("Mapa para la página").fill("");
  await corto.getByRole("button", { name: "Guardar ubicación" }).click();
  await expect(page.getByText("Ubicación guardada.")).toBeVisible();
  await page.goto("/contacto");
  await expect(page.getByRole("main").getByRole("link", { name: "Cómo llegar" })).toHaveAttribute("href", "https://maps.app.goo.gl/AbCdEf123");
  await expect(page.getByTitle("Mapa del taller de TocTar Detailing")).toHaveAttribute("src", /q=-21\.5355,-64\.7296/);

  } finally {
    // Vuelve a como lo dejó preparar.setup.ts, aunque algo de arriba falle: la fila del negocio es una sola
    await page.goto("/panel/configuracion/negocio");
    const vuelta = await abrirParteNegocio(page, "Ubicación");
    await vuelta.getByLabel("Enlace de Google Maps").fill(PREPARADO);
    await vuelta.getByLabel("Mapa para la página").fill("");
    await vuelta.getByRole("button", { name: "Guardar ubicación" }).click();
    await expect(page.getByText("Ubicación guardada.")).toBeVisible();
    // Y el horario de lunes a sábado, como lo dejan los datos iniciales
    const horarioVuelta = await abrirParteNegocio(page, "Horario de atención");
    await horarioVuelta.getByRole("button", { name: "Copiar el lunes de martes a sábado" }).click();
    await horarioVuelta.getByRole("button", { name: "Guardar horario" }).click();
    await expect(page.getByText("Horario guardado.")).toBeVisible();
  }
});

test("los datos mal escritos muestran el error junto al campo y no se guardan", async ({ page }) => {
  await ingresarComoDueno(page);
  await page.goto("/panel/configuracion/negocio");

  // En su modal: el error junto al campo, el foco en él y lo escrito sigue para corregirlo
  const contacto = await abrirParteNegocio(page, "Contacto");
  await contacto.getByLabel("WhatsApp").fill("7123");
  await contacto.getByRole("button", { name: "Guardar contacto" }).click();
  await expect(contacto.getByText("Escribe los 8 dígitos del celular.")).toBeVisible();
  await expect(contacto.getByLabel("WhatsApp")).toHaveAttribute("aria-invalid", "true");
  await expect(contacto.getByLabel("WhatsApp")).toBeFocused(); // el primer error recibe el foco (pulido 6.1)
  await expect(contacto.getByLabel("WhatsApp")).toHaveValue("7123");
  await contacto.getByRole("button", { name: "Cancelar" }).click();

  const ubicacion = await abrirParteNegocio(page, "Ubicación");
  await ubicacion.getByLabel("Enlace de Google Maps").fill("https://example.com/mapa");
  await ubicacion.getByLabel("Mapa para la página").fill(`<iframe src="https://example.com/maps/embed?pb=x"></iframe>`);
  await ubicacion.getByRole("button", { name: "Guardar ubicación" }).click();
  await expect(ubicacion.getByText("Pega el enlace de Google Maps: en la ficha del taller, Compartir → Copiar vínculo.")).toBeVisible();
  await expect(ubicacion.getByText("Pega el código de Google Maps: en la ficha del taller, Compartir → Insertar un mapa → Copiar HTML.")).toBeVisible();
  await ubicacion.getByRole("button", { name: "Cancelar" }).click();

  const horario = await abrirParteNegocio(page, "Horario de atención");
  await horario.getByLabel("Lunes, turno 1, desde").fill("13:00");
  await horario.getByRole("button", { name: "Guardar horario" }).click();
  await expect(horario.getByText("El turno debe terminar después de empezar.")).toBeVisible();
  await horario.getByRole("button", { name: "Cancelar" }).click();

  // Nada se guardó
  await page.reload();
  await expect(page.getByRole("region", { name: "Contacto" })).toContainText("+591 71234567");
});

test("ningún encargado entra a la configuración, ni sin permisos ni con el perfil Taller", async ({ page }, info) => {
  for (const [perfil, permisos] of [["sin-permisos", []], ["taller", PERFIL_TALLER]] as const) {
    const usuario = `${perfil}-config-${sufijo(info)}`;
    await crearUsuario({ usuario, nombre: `Encargado ${perfil}`, contrasena: "clave-config-1", rol: "encargado", permisos: [...permisos] });
    await page.context().clearCookies();
    await ingresar(page, usuario, "clave-config-1");
    await expect(page).toHaveURL(/\/panel$/);
    await page.goto("/panel/configuracion");
    await expect(page).toHaveURL(/\/panel\/sin-acceso$/);
  }
});

test("el logo para documentos se sube y se ve; un archivo que no es imagen se rechaza", async ({ page }, info) => {
  soloEscritorio(info);
  await ingresarComoDueno(page);
  await page.goto("/panel/configuracion/negocio");
  // Se sube al elegir el archivo: hay que esperar a que la página esté lista
  await expect(page.getByRole("button", { name: "Subir logo" })).toBeEnabled();

  await page.getByLabel("Archivo del logo").setInputFiles({ name: "falso.png", mimeType: "image/png", buffer: Buffer.from("no soy una imagen") });
  await expect(page.getByText("El logo debe ser PNG, JPG o WebP de hasta 5 MB.")).toBeVisible();

  await page.getByLabel("Archivo del logo").setInputFiles({ name: "logo.png", mimeType: "image/png", buffer: PNG });
  await expect(page.getByText("Logo actualizado.")).toBeVisible();
  const logo = page.getByRole("img", { name: "Logo actual para documentos" });
  await expect(logo).toHaveAttribute("src", /negocio\/logo-[\w-]+\.webp$/);
  // El archivo existe en el almacenamiento
  const respuesta = await page.request.get((await logo.getAttribute("src"))!);
  expect(respuesta.ok()).toBe(true);
  expect(respuesta.headers()["content-type"]).toBe("image/webp");

  // Al cambiar el logo, el anterior se borra del almacenamiento (no queda un archivo suelto)
  const anterior = (await logo.getAttribute("src"))!;
  await page.getByLabel("Archivo del logo").setInputFiles({ name: "logo-nuevo.png", mimeType: "image/png", buffer: PNG });
  await expect(logo).not.toHaveAttribute("src", anterior);
  expect((await page.request.get(anterior)).status()).toBe(404);

  // Soltar una foto encima también lo reemplaza: va en el formulario que se envía (pulido 13.13)
  const antesDeSoltar = (await logo.getAttribute("src"))!;
  const soltado = await archivosArrastrados(page, [{ name: "logo-soltado.png", mimeType: "image/png", buffer: PNG }]);
  const zona = page.locator("[data-zona-foto]");
  await zona.dispatchEvent("dragenter", { dataTransfer: soltado });
  await expect(zona).toContainText("Suelta la foto para reemplazarla");
  await zona.dispatchEvent("drop", { dataTransfer: soltado });
  await expect(logo).not.toHaveAttribute("src", antesDeSoltar);
});

// Pulido 6.1: con ancho fijo, las horas del horario ensanchaban el formulario y a 360 px todo se salía por la derecha.
test("a 360 px ningún campo de Configuración se sale de la pantalla", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await ingresarComoDueno(page);
  await page.goto("/panel/configuracion/negocio");
  // La ficha y, en su modal, el horario (lo más ancho)
  const enLaFicha = await page.getByRole("main").locator("button, a").evaluateAll((els) =>
    els.filter((c) => (c as HTMLElement).offsetParent && c.getBoundingClientRect().right > window.innerWidth).map((c) => c.getAttribute("aria-label") || c.textContent),
  );
  expect(enLaFicha).toEqual([]);
  const horario = await abrirParteNegocio(page, "Horario de atención");
  await expect(horario.getByLabel("Lunes, turno 1, desde")).toBeVisible();
  const fuera = await horario.locator("input:not([type=hidden]), textarea, button").evaluateAll((campos) =>
    campos.filter((c) => (c as HTMLElement).offsetParent && c.getBoundingClientRect().right > window.innerWidth).map((c) => c.getAttribute("aria-label") || c.id),
  );
  expect(fuera).toEqual([]);
});

