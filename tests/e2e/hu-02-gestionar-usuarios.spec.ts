import { expect, test, type Browser, type Page, type TestInfo } from "@playwright/test";
import { alertaDeIngreso, crearUsuario, ingresar, ingresarComoDueno } from "./apoyo";

// HU-02 Gestionar usuarios y roles. Criterios: docs/08-desarrollo/etapas/B1-acceso.md §10.
// Los nombres llevan el proyecto (celular o escritorio) porque ambos corren a la vez sobre la misma base.

const sufijo = (info: TestInfo) => (info.project.name === "celular" ? "c" : "e");

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
  await crearPorPantalla(page, { nombre: "Técnico de prueba", usuario, contrasena: "tecnico-123", rol: "Técnico" });
  await expect(page.getByRole("status")).toContainText("Usuario Técnico de prueba creado");

  const { ctx, page: tecnico } = await otraPersona(browser, info);
  await ingresar(tecnico, usuario, "tecnico-123");
  await expect(tecnico).toHaveURL(/\/panel$/);
  if (info.project.name === "celular") await tecnico.getByRole("button", { name: "Abrir menú" }).click();
  await expect(tecnico.getByRole("navigation", { name: "Panel" }).getByRole("link", { name: "Usuarios" })).toHaveCount(0);

  await tecnico.goto("/panel/usuarios");
  await expect(tecnico).toHaveURL(/\/panel\/sin-acceso$/);
  await expect(tecnico.getByRole("heading", { name: "Sin acceso" })).toBeVisible();
  await ctx.close();
});

test("restablecer la contraseña: la anterior deja de servir y la nueva funciona", async ({ page, browser }, info) => {
  const usuario = `olvido-${sufijo(info)}`;
  await crearUsuario({ usuario, nombre: "Encargado olvidadizo", contrasena: "vieja-1234", rol: "encargado" });
  await ingresarComoDueno(page);
  await page.goto("/panel/usuarios");
  await page.getByRole("link", { name: "Encargado olvidadizo" }).first().click();
  await page.getByRole("button", { name: "Restablecer contraseña" }).click();
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
  await crearUsuario({ usuario, nombre: "Técnico saliente", contrasena: "saliente-123", rol: "tecnico" });

  const { ctx, page: tecnico } = await otraPersona(browser, info);
  await ingresar(tecnico, usuario, "saliente-123");
  await expect(tecnico).toHaveURL(/\/panel$/);

  await ingresarComoDueno(page);
  await page.goto("/panel/usuarios");
  await page.getByRole("link", { name: "Técnico saliente" }).first().click();
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
});
