import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { consultar, crearUsuario, ingresarComoDueno } from "./apoyo";

// Pulido 13.15: el botón de guardar se activa y queda fijo abajo cuando hay algo que guardar, y salir con cambios pregunta.
// En la edición de un usuario propio de cada prueba: Negocio y Parámetros ya no tienen la barra (pulidos 13.26 y 13.29, cada
// parte en su modal).

const sufijo = (info: TestInfo) => `${info.project.name.slice(0, 3)}${info.retry}`;

const hidratada = async (page: Page) => {
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(300);
};

/** Un usuario encargado nuevo para la prueba: su edición tiene la barra de guardar. Devuelve su dirección. */
async function usuarioDePrueba(info: TestInfo): Promise<string> {
  const usuario = `barra-${sufijo(info)}-${Date.now()}`.toLowerCase();
  await crearUsuario({ usuario, nombre: "Usuario de prueba", contrasena: "encargado-123", rol: "encargado", permisos: ["agenda"] });
  const [{ id }] = await consultar<{ id: number }>("select id from usuario where nombre_usuario = $1", [usuario]);
  return `/panel/usuarios/${id}`;
}

test("sin cambios el botón está desactivado; con cambios se activa y queda fijo, y vuelve al dejar todo como estaba", async ({ page }, info) => {
  const ruta = await usuarioDePrueba(info);
  await ingresarComoDueno(page);
  await page.goto(ruta);
  const nombre = page.getByLabel("Nombre", { exact: true });
  const guardar = page.getByRole("button", { name: "Guardar cambios" }).first();
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

test("salir con cambios pregunta: se puede seguir editando o salir", async ({ page }, info) => {
  const ruta = await usuarioDePrueba(info);
  await ingresarComoDueno(page);
  await page.goto(ruta);
  const campo = page.getByLabel("Nombre", { exact: true });
  await expect(campo).toBeVisible();
  await hidratada(page);
  const original = await campo.inputValue();
  await campo.fill(`${original}1`);
  await expect(page.getByRole("button", { name: "Guardar cambios" }).first()).toBeEnabled();

  // "Volver": se ve en los dos tamaños
  const salir = page.locator('main a[href="/panel/usuarios"]').first();
  await salir.click();
  const pregunta = page.getByRole("dialog", { name: "¿Salir sin guardar?" });
  await expect(pregunta).toBeVisible();
  // Con el foco en la opción que no pierde nada
  await expect(pregunta.getByRole("button", { name: "Seguir editando" })).toBeFocused();
  await pregunta.getByRole("button", { name: "Seguir editando" }).click();
  await expect(pregunta).toHaveCount(0);
  await expect(page).toHaveURL(/\/panel\/usuarios\/\d+$/);
  await expect(campo).toHaveValue(`${original}1`);

  await salir.click();
  await pregunta.getByRole("button", { name: "Salir sin guardar" }).click();
  await expect(page).toHaveURL(/\/panel\/usuarios$/);
});

test("lo escrito antes de que la página termine de cargar también cuenta", async ({ page }, info) => {
  const ruta = await usuarioDePrueba(info);
  await ingresarComoDueno(page);
  // JavaScript lento, como un celular con mala señal: el formulario se ve antes de hidratar
  await page.route("**/_next/static/chunks/**", async (ruta) => {
    await new Promise((listo) => setTimeout(listo, 1500));
    await ruta.continue();
  });
  await page.goto(ruta, { waitUntil: "commit" });
  const nombre = page.getByLabel("Nombre", { exact: true });
  await nombre.waitFor({ state: "visible" });
  const original = await nombre.inputValue();
  await nombre.fill(`${original} escrito rápido`);
  await hidratada(page);
  await expect(nombre).toHaveValue(`${original} escrito rápido`);
  await expect(page.getByRole("button", { name: "Guardar cambios" }).first()).toBeEnabled();
});

test("en el menú del celular, salir con cambios pregunta y el menú se cierra", async ({ page }, info) => {
  test.skip(info.project.name !== "celular", "El menú desplegable es del celular");
  const ruta = await usuarioDePrueba(info);
  await ingresarComoDueno(page);
  await page.goto(ruta);
  const nombre = page.getByLabel("Nombre", { exact: true });
  await expect(nombre).toBeVisible();
  await hidratada(page);
  await nombre.fill(`${await nombre.inputValue()} 2`);
  await expect(page.getByRole("button", { name: "Guardar cambios" }).first()).toBeEnabled();
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
  const ruta = await usuarioDePrueba(info);
  await ingresarComoDueno(page);
  await page.goto(ruta);
  const nombre = page.getByLabel("Nombre", { exact: true });
  await expect(nombre).toBeVisible();
  await hidratada(page);
  await nombre.fill(`${await nombre.inputValue()} 2`);
  await expect(page.getByRole("button", { name: "Guardar cambios" }).first()).toBeEnabled();
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  const pregunta = page.getByRole("dialog", { name: "¿Salir sin guardar?" });
  await expect(pregunta).toBeVisible();
  await pregunta.getByRole("button", { name: "Seguir editando" }).click();
  await expect(page).toHaveURL(/\/panel\/usuarios\/\d+$/);
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
