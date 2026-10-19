import { expect, test, type Browser, type Page, type TestInfo } from "@playwright/test";
import { alertaDeIngreso, crearUsuario, ingresar, ingresarComoDueno } from "./apoyo";

// HU-02 Gestionar usuarios y roles. Criterios: docs/08-desarrollo/etapas/B1-acceso.md §10.
// Los nombres llevan el proyecto (celular o escritorio) porque ambos corren a la vez sobre la misma base.

const sufijo = (info: TestInfo) => (info.project.name === "celular" ? "c" : "e");
/** Nombre visible único por proyecto: con nombres repetidos, un proyecto podía tocar al usuario del otro. */
const nombreUnico = (nombre: string, info: TestInfo) => `${nombre} ${sufijo(info).toUpperCase()}`;

async function crearPorPantalla(page: Page, d: { nombre: string; usuario: string; contrasena: string; rol: string }) {
  await page.goto("/panel/usuarios/nuevo");
  await page.getByLabel("Nombre").fill(d.nombre);
  await page.getByLabel("Usuario", { exact: true }).fill(d.usuario);
  await page.getByLabel("Contraseña inicial").fill(d.contrasena);
  await page.getByRole("radio", { name: new RegExp(d.rol) }).check();
  await page.getByRole("button", { name: "Crear usuario" }).click();
}

/** Otra persona en otro celular o navegador: un contexto nuevo con el mismo dispositivo. */
async function otraPersona(browser: Browser, info: TestInfo) {
  const ctx = await browser.newContext(info.project.use);
  return { ctx, page: await ctx.newPage() };
}

test("el dueño crea un técnico (usuario con guion), que ingresa sin ver Usuarios y no entra por URL", async ({ page, browser }, info) => {
  const usuario = `tecnico-${sufijo(info)}`;
  await ingresarComoDueno(page);
  const nombre = nombreUnico("Técnico de prueba", info);
  await crearPorPantalla(page, { nombre, usuario, contrasena: "tecnico-123", rol: "Técnico" });
  await expect(page.getByRole("status")).toContainText(`Usuario ${nombre} creado`);

  const { ctx, page: tecnico } = await otraPersona(browser, info);
  await ingresar(tecnico, usuario, "tecnico-123");
  await expect(tecnico).toHaveURL(/\/panel$/);
  if (info.project.name === "celular") await tecnico.getByRole("button", { name: "Abrir menú" }).click();
  await expect(tecnico.getByRole("navigation", { name: "Panel" }).getByRole("link", { name: "Usuarios" })).toHaveCount(0);

  await tecnico.goto("/panel/usuarios");
  await expect(tecnico).toHaveURL(/\/panel\/sin-acceso$/);
  // Lleva a otra pantalla: se anuncia como enlace, no como botón (pulido 5.6)
  await expect(tecnico.getByRole("link", { name: "Volver al inicio" })).toBeVisible();
  await expect(tecnico.getByRole("heading", { name: "Sin acceso" })).toBeVisible();
  await ctx.close();
});

test("restablecer la contraseña: la anterior deja de servir y la nueva funciona", async ({ page, browser }, info) => {
  const usuario = `olvido-${sufijo(info)}`;
  const nombre = nombreUnico("Encargado olvidadizo", info);
  await crearUsuario({ usuario, nombre, contrasena: "vieja-1234", rol: "encargado" });
  await ingresarComoDueno(page);
  await page.goto("/panel/usuarios");
  await page.getByRole("link", { name: nombre }).first().click();
  await page.getByRole("button", { name: "Restablecer contraseña" }).click();
  // Sin contraseña: el error y el foco van al campo (pulido 5.5)
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(page.getByLabel("Contraseña nueva")).toBeFocused();
  await page.getByLabel("Contraseña nueva").fill("nueva-1234");
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(page.getByText("Contraseña cambiada")).toBeVisible();

  const { ctx, page: otra } = await otraPersona(browser, info);
  await ingresar(otra, usuario, "vieja-1234");
  await expect(alertaDeIngreso(otra)).toHaveText("Usuario o contraseña incorrectos.");
  await ingresar(otra, usuario, "nueva-1234");
  await expect(otra).toHaveURL(/\/panel$/);
  await ctx.close();
});

test("desactivar a alguien con la sesión abierta lo saca del panel", async ({ page, browser }, info) => {
  const usuario = `saliente-${sufijo(info)}`;
  const nombre = nombreUnico("Técnico saliente", info);
  await crearUsuario({ usuario, nombre, contrasena: "saliente-123", rol: "tecnico" });

  const { ctx, page: tecnico } = await otraPersona(browser, info);
  await ingresar(tecnico, usuario, "saliente-123");
  await expect(tecnico).toHaveURL(/\/panel$/);

  await ingresarComoDueno(page);
  await page.goto("/panel/usuarios");
  await page.getByRole("link", { name: nombre }).first().click();
  // El foco va a la confirmación y, al cancelar, vuelve al botón (pulido 5.5)
  await page.getByRole("button", { name: "Desactivar usuario" }).click();
  await expect(page.getByText("no podrá ingresar")).toBeFocused();
  await page.getByRole("button", { name: "Cancelar" }).click();
  await expect(page.getByRole("button", { name: "Desactivar usuario" })).toBeFocused();
  await page.getByRole("button", { name: "Desactivar usuario" }).click();
  await page.getByRole("button", { name: "Sí, desactivar" }).click();
  await expect(page.getByText("Usuario desactivado")).toBeVisible();

  await tecnico.goto("/panel");
  await expect(tecnico).toHaveURL(/\/ingresar$/);
  await ctx.close();
});

test("el único dueño no puede desactivarse ni quitarse el rol", async ({ page }) => {
  await ingresarComoDueno(page);
  await page.goto("/panel/usuarios");
  await page.getByRole("link", { name: "Dueño de prueba" }).first().click();
  await expect(page.getByText("No puedes desactivar tu propio usuario")).toBeVisible();
  await expect(page.getByRole("button", { name: "Desactivar usuario" })).toHaveCount(0);

  await page.getByRole("radio", { name: /Técnico/ }).check();
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByText("Es el único dueño activo: crea otro dueño antes de cambiarle el rol.")).toBeVisible();
});

test("un usuario repetido muestra un error claro", async ({ page }, info) => {
  const usuario = `repetido-${sufijo(info)}`;
  await crearUsuario({ usuario, nombre: "Primero", contrasena: "primero-123", rol: "tecnico" });
  await ingresarComoDueno(page);
  await crearPorPantalla(page, { nombre: "Segundo", usuario: usuario.toUpperCase(), contrasena: "segundo-123", rol: "Técnico" });
  await expect(page.getByText("Ese usuario ya existe. Elige otro.")).toBeVisible();
  await expect(page.getByLabel("Nombre")).toHaveValue("Segundo");
});

test("los errores del formulario se muestran junto a cada campo", async ({ page }) => {
  await ingresarComoDueno(page);
  await page.goto("/panel/usuarios/nuevo");
  await page.getByRole("button", { name: "Crear usuario" }).click();
  await expect(page.getByText("Escribe el nombre completo.")).toBeVisible();
  await expect(page.getByText("La contraseña debe tener al menos 8 caracteres.")).toBeVisible();
  await expect(page.getByLabel("Nombre")).toBeFocused(); // pulido 5.4
});

// Pulido 5.3: "Agregar usuario" en la lista, "(tú)" en el propio y, en la computadora, toda la fila abre el usuario.
test("la lista de usuarios: Agregar usuario, (tú) y la fila que abre el usuario", async ({ page }, info) => {
  await ingresarComoDueno(page);
  await page.goto("/panel/usuarios");
  await page.getByRole("link", { name: "Agregar usuario" }).click();
  await expect(page).toHaveURL(/\/panel\/usuarios\/nuevo$/);
  await page.goto("/panel/usuarios");
  await expect(page.getByText("(tú)").locator("visible=true")).toBeVisible();
  if (info.project.name !== "escritorio") return;
  // Se toca la celda del rol, no el nombre (con el mouse: el enlace de la fila la cubre)
  const rol = (await page.getByRole("row").filter({ hasText: "(tú)" }).getByRole("cell").nth(2).boundingBox())!;
  await page.mouse.click(rol.x + rol.width / 2, rol.y + rol.height / 2);
  await expect(page).toHaveURL(/\/panel\/usuarios\/\d+$/);
});

