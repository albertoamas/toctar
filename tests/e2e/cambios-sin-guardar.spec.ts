import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { consultar, crearUsuario, ingresarComoDueno, PNG } from "./apoyo";

// Pulido 13.15: el botón de guardar se activa y queda fijo abajo cuando hay algo que guardar, y salir con cambios pregunta.

const sufijo = (info: TestInfo) => `${info.project.name.slice(0, 3)}${info.retry}`;

const hidratada = async (page: Page) => {
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(300);
};

test("sin cambios el botón está desactivado; con cambios se activa y queda fijo, y vuelve al dejar todo como estaba", async ({ page }) => {
  await ingresarComoDueno(page);
  await page.goto("/panel/configuracion/negocio");
  const nombre = page.getByLabel("Nombre del negocio");
  const guardar = page.getByRole("button", { name: "Guardar cambios" });
  await expect(nombre).toBeVisible();
  await hidratada(page);
  await expect(guardar).toBeDisabled();
  await expect(page.locator("[data-pie-fijo]")).toHaveCount(0);
  const original = await nombre.inputValue();

  await nombre.fill(`${original} y algo más`);
  await expect(guardar).toBeEnabled();
  // Fijo abajo: se ve aunque la pantalla esté arriba
  await expect(page.locator("[data-pie-fijo]")).toBeVisible();
  const barra = (await guardar.boundingBox())!;
  expect(barra.y + barra.height).toBeLessThanOrEqual(page.viewportSize()!.height);

  await nombre.fill(original);
  await expect(guardar).toBeDisabled();
  await expect(page.locator("[data-pie-fijo]")).toHaveCount(0);
});

test("una lista también cuenta: agregar una fila lo activa y quitarla lo deja como estaba", async ({ page }) => {
  await ingresarComoDueno(page);
  await page.goto("/panel/sitio/textos");
  const agregar = page.getByRole("button", { name: "Agregar motivo" });
  const guardar = page.getByRole("button", { name: "Guardar nosotros" });
  await expect(agregar).toBeEnabled();
  await hidratada(page);
  await expect(guardar).toBeDisabled();
  await agregar.click();
  await expect(guardar).toBeEnabled();
  await page.getByRole("button", { name: /^Quitar motivo \d+$/ }).last().click();
  await expect(guardar).toBeDisabled();
});

test("salir con cambios pregunta: se puede seguir editando o salir", async ({ page }) => {
  await ingresarComoDueno(page);
  await page.goto("/panel/configuracion/parametros");
  const campo = page.locator("form").getByRole("textbox").first();
  await expect(campo).toBeVisible();
  await hidratada(page);
  const original = await campo.inputValue();
  await campo.fill(`${original}1`);
  await expect(page.getByRole("button", { name: "Guardar cambios" })).toBeEnabled();

  // "Volver": se ve en los dos tamaños
  const salir = page.locator('main a[href="/panel/configuracion"]').first();
  await salir.click();
  const pregunta = page.getByRole("dialog", { name: "¿Salir sin guardar?" });
  await expect(pregunta).toBeVisible();
  // Con el foco en la opción que no pierde nada
  await expect(pregunta.getByRole("button", { name: "Seguir editando" })).toBeFocused();
  await pregunta.getByRole("button", { name: "Seguir editando" }).click();
  await expect(pregunta).toHaveCount(0);
  await expect(page).toHaveURL(/\/panel\/configuracion\/parametros$/);
  await expect(campo).toHaveValue(`${original}1`);

  await salir.click();
  await pregunta.getByRole("button", { name: "Salir sin guardar" }).click();
  await expect(page).not.toHaveURL(/\/panel\/configuracion\/parametros$/);
});

test("lo escrito antes de que la página termine de cargar también cuenta", async ({ page }) => {
  await ingresarComoDueno(page);
  // JavaScript lento, como un celular con mala señal: el formulario se ve antes de hidratar
  await page.route("**/_next/static/chunks/**", async (ruta) => {
    await new Promise((listo) => setTimeout(listo, 1500));
    await ruta.continue();
  });
  await page.goto("/panel/configuracion/negocio", { waitUntil: "commit" });
  const nombre = page.getByLabel("Nombre del negocio");
  await nombre.waitFor({ state: "visible" });
  const original = await nombre.inputValue();
  await nombre.fill(`${original} escrito rápido`);
  await hidratada(page);
  await expect(nombre).toHaveValue(`${original} escrito rápido`);
  await expect(page.getByRole("button", { name: "Guardar cambios" })).toBeEnabled();
});

test("en el menú del celular, salir con cambios pregunta y el menú se cierra", async ({ page }, info) => {
  test.skip(info.project.name !== "celular", "El menú desplegable es del celular");
  await ingresarComoDueno(page);
  await page.goto("/panel/configuracion/negocio");
  const nombre = page.getByLabel("Nombre del negocio");
  await expect(nombre).toBeVisible();
  await hidratada(page);
  await nombre.fill(`${await nombre.inputValue()} 2`);
  await expect(page.getByRole("button", { name: "Guardar cambios" })).toBeEnabled();
  await page.getByRole("button", { name: /Abrir menú/ }).click();
  await page.getByRole("dialog", { name: "Menú" }).getByRole("link", { name: "Agenda" }).click();
  const pregunta = page.getByRole("dialog", { name: "¿Salir sin guardar?" });
  await expect(pregunta).toBeVisible();
  await expect(page.getByRole("dialog", { name: "Menú" })).toHaveCount(0);
  await pregunta.getByRole("button", { name: "Salir sin guardar" }).click();
  await expect(page).toHaveURL(/\/panel\/agenda$/);
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("cerrar sesión con cambios también pregunta", async ({ page }, info) => {
  test.skip(info.project.name !== "escritorio", "Se ve a la vista en la computadora");
  await ingresarComoDueno(page);
  await page.goto("/panel/configuracion/negocio");
  const nombre = page.getByLabel("Nombre del negocio");
  await expect(nombre).toBeVisible();
  await hidratada(page);
  await nombre.fill(`${await nombre.inputValue()} 2`);
  await expect(page.getByRole("button", { name: "Guardar cambios" })).toBeEnabled();
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  const pregunta = page.getByRole("dialog", { name: "¿Salir sin guardar?" });
  await expect(pregunta).toBeVisible();
  await pregunta.getByRole("button", { name: "Seguir editando" }).click();
  await expect(page).toHaveURL(/\/panel\/configuracion\/negocio$/);
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await pregunta.getByRole("button", { name: "Salir sin guardar" }).click();
  await expect(page).toHaveURL(/\/ingresar/);
});

test("guardar lo desactiva y ya no pregunta al salir", async ({ page }, info) => {
  const usuario = `cambios-${sufijo(info)}-${Date.now()}`.toLowerCase();
  await crearUsuario({ usuario, nombre: "Antes del cambio", contrasena: "encargado-123", rol: "encargado", permisos: ["agenda"] });
  const [{ id }] = await consultar<{ id: number }>("select id from usuario where nombre_usuario = $1", [usuario]);
  await ingresarComoDueno(page);
  await page.goto(`/panel/usuarios/${id}`);
  const nombre = page.getByLabel("Nombre", { exact: true });
  const guardar = page.getByRole("button", { name: "Guardar cambios" }).first();
  await expect(nombre).toBeVisible();
  await hidratada(page);
  await nombre.fill("Después del cambio");
  await expect(guardar).toBeEnabled();
  await guardar.click();
  await expect(guardar).toBeDisabled();
  await expect(nombre).toHaveValue("Después del cambio");
  await page.locator('main a[href="/panel/usuarios"]').first().click();
  await expect(page.getByRole("dialog", { name: "¿Salir sin guardar?" })).toHaveCount(0);
  await expect(page).toHaveURL(/\/panel\/usuarios$/);
});

test("crear un usuario sigue activo vacío: tocarlo muestra qué falta", async ({ page }) => {
  await ingresarComoDueno(page);
  await page.goto("/panel/usuarios/nuevo");
  await hidratada(page);
  const crear = page.getByRole("button", { name: "Crear usuario" });
  await expect(crear).toBeEnabled();
  await crear.click();
  await expect(page.locator('[aria-invalid="true"]').first()).toBeVisible();
});

test("un flujo también pregunta: nuevo cliente, con su botón de siempre", async ({ page }) => {
  await ingresarComoDueno(page);
  await page.goto("/panel/clientes/nuevo");
  await expect(page.getByRole("button", { name: "Crear cliente" })).toBeEnabled();
  await hidratada(page);
  await page.getByLabel("Nombre", { exact: true }).fill("A medio escribir");
  await page.locator('main a[href="/panel/clientes"]').first().click();
  const pregunta = page.getByRole("dialog", { name: "¿Salir sin guardar?" });
  await expect(pregunta).toBeVisible();
  await pregunta.getByRole("button", { name: "Salir sin guardar" }).click();
  await expect(page).toHaveURL(/\/panel\/clientes$/);
});

test("subir una foto, que se guarda al momento, no activa el botón", async ({ page }, info) => {
  test.skip(info.project.name !== "escritorio", "Cambia la foto compartida");
  await ingresarComoDueno(page);
  await page.goto("/panel/sitio/textos");
  const guardar = page.getByRole("button", { name: "Guardar portada" });
  await expect(guardar).toBeVisible();
  await hidratada(page);
  const bloque = page.getByRole("region", { name: "Foto del taller" });
  await bloque.getByLabel("Archivo de la foto").setInputFiles({ name: "foto.png", mimeType: "image/png", buffer: PNG });
  await expect(page.getByText("Foto guardada.")).toBeVisible();
  await expect(guardar).toBeDisabled();
  // Queda como estaba: otras pruebas esperan la portada sin foto
  await bloque.getByRole("button", { name: "Quitar foto" }).click();
  await expect(bloque.getByText("Sin foto: detrás del lema queda el fondo negro.")).toBeVisible();
});
