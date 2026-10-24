import { expect, test, type TestInfo } from "@playwright/test";
import { crearUsuario, ingresar, ingresarComoDueno, PNG } from "./apoyo";

// HU-04 Datos del negocio. Criterios: docs/09-pruebas/criterios-entrega-1.md (4.1 a 4.6).
// Los datos del negocio son una sola fila: las pruebas que guardan corren solo en escritorio,
// para que celular y escritorio no se pisen al correr en paralelo.

const sufijo = (info: TestInfo) => (info.project.name === "celular" ? "c" : "e");
const soloEscritorio = (info: TestInfo) => test.skip(info.project.name !== "escritorio", "Guarda la fila única del negocio");

test("el dueño cambia los datos y el pie del sitio los muestra al guardar", async ({ page }, info) => {
  soloEscritorio(info);
  await ingresarComoDueno(page);
  await page.getByRole("navigation", { name: "Panel" }).getByRole("link", { name: "Configuración" }).click();
  await expect(page.getByRole("heading", { name: "Configuración" })).toBeVisible();

  await page.getByLabel("WhatsApp").fill("+591 712 34 567");
  await page.getByLabel("Dirección").fill("Barrio Aeropuerto, calle Juan Pablo II, Tarija");
  await page.getByLabel("Ubicación en el mapa").fill("https://www.google.com/maps/place/x/data=!3d-21.5355!4d-64.7296");
  await page.getByLabel("Instagram").fill("instagram.com/toctar.detailing");
  // El sábado solo abre a la mañana
  await page.getByRole("button", { name: "Quitar el segundo turno del sábado" }).click();
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByText("Cambios guardados.")).toBeVisible();

  // Se guardó normalizado
  await page.reload();
  await expect(page.getByLabel("WhatsApp")).toHaveValue("71234567");
  await expect(page.getByLabel("Ubicación en el mapa")).toHaveValue("-21.5355, -64.7296");
  await expect(page.getByLabel("Instagram")).toHaveValue("https://instagram.com/toctar.detailing");

  // El sitio lo muestra sin volver a desplegar (RF-17)
  await page.goto("/");
  const pie = page.getByRole("contentinfo");
  await expect(pie).toContainText("Barrio Aeropuerto, calle Juan Pablo II, Tarija");
  await expect(pie).toContainText("Lunes a viernes");
  await expect(pie).toContainText("8:00–12:00 y 14:00–18:00");
  await expect(pie.getByRole("link", { name: "WhatsApp +591 7123 4567" })).toHaveAttribute("href", "https://wa.me/59171234567");
  await expect(pie.getByRole("link", { name: "Cómo llegar" })).toHaveAttribute("href", /query=-21\.5355,-64\.7296/);
  await expect(pie.getByRole("link", { name: "Instagram" })).toHaveAttribute("href", "https://instagram.com/toctar.detailing");
  // Las redes que no están cargadas no se muestran (TikTok lo carga preparar.setup.ts)
  await expect(pie.getByRole("link", { name: "Facebook" })).toHaveCount(0);
});

test("los datos mal escritos muestran el error junto al campo y no se guardan", async ({ page }) => {
  await ingresarComoDueno(page);
  await page.goto("/panel/configuracion");

  await page.getByLabel("WhatsApp").fill("7123");
  await page.getByLabel("Ubicación en el mapa").fill("https://maps.app.goo.gl/AbCdEf123");
  await page.getByLabel("Lunes, turno 1, desde").fill("13:00");
  await page.getByRole("button", { name: "Guardar cambios" }).click();

  await expect(page.getByText("Escribe los 8 dígitos del celular.")).toBeVisible();
  await expect(page.getByText(/Ese enlace corto no trae la ubicación/)).toBeVisible();
  await expect(page.getByText("El turno debe terminar después de empezar.")).toBeVisible();
  await expect(page.getByLabel("WhatsApp")).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByLabel("WhatsApp")).toBeFocused(); // el primer error recibe el foco (pulido 6.1)
  // Lo escrito sigue en el formulario para corregirlo
  await expect(page.getByLabel("WhatsApp")).toHaveValue("7123");

  await page.reload();
  await expect(page.getByLabel("WhatsApp")).not.toHaveValue("7123");
});

test("el encargado y el técnico no entran a la configuración", async ({ page }, info) => {
  for (const rol of ["encargado", "tecnico"] as const) {
    const usuario = `${rol}-config-${sufijo(info)}`;
    await crearUsuario({ usuario, nombre: `${rol} config`, contrasena: "clave-config-1", rol });
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
  await page.goto("/panel/configuracion");
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
});

// Pulido 6.1: con ancho fijo, las horas del horario ensanchaban el formulario y a 360 px todo se salía por la derecha.
test("a 360 px ningún campo de Configuración se sale de la pantalla", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await ingresarComoDueno(page);
  await page.goto("/panel/configuracion");
  await expect(page.getByLabel("Lunes, turno 1, desde")).toBeVisible();
  const fuera = await page.getByRole("main").locator("input:not([type=hidden]), textarea, button").evaluateAll((campos) =>
    campos.filter((c) => (c as HTMLElement).offsetParent && c.getBoundingClientRect().right > window.innerWidth).map((c) => c.getAttribute("aria-label") || c.id),
  );
  expect(fuera).toEqual([]);
});

