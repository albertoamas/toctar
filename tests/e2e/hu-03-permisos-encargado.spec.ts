import { expect, test, type TestInfo } from "@playwright/test";
import { ingresar, ingresarComoDueno } from "./apoyo";

// HU-03 Permisos del encargado. Criterios: docs/09-pruebas/criterios-entrega-1.md (3.1 a 3.3).
// Cada módulo suma su casilla cuando existe su pantalla (Sitio web en B3, Reclamos en B5);
// esta prueba usa "Autorizar entrega con saldo". El acceso a Reclamos se prueba en hu-17.

const sufijo = (info: TestInfo) => (info.project.name === "celular" ? "C" : "E");

test("el permiso del encargado se guarda y se borra al cambiarle el rol", async ({ page }, info) => {
  const nombre = `Encargado con permiso ${sufijo(info)}`;
  const usuario = `encargado-permiso-${sufijo(info).toLowerCase()}`;
  const casilla = () => page.getByRole("checkbox", { name: /Autorizar entrega con saldo/ });

  await ingresarComoDueno(page);
  await page.goto("/panel/usuarios/nuevo");
  await page.getByLabel("Nombre").fill(nombre);
  await page.getByLabel("Usuario", { exact: true }).fill(usuario);
  await page.getByLabel("Contraseña inicial").fill("encargado-123");

  // Las casillas solo aparecen para el encargado
  await expect(casilla()).toHaveCount(0);
  await page.getByRole("radio", { name: /Encargado/ }).check();
  await casilla().check();
  await page.getByRole("button", { name: "Crear usuario" }).click();
  await expect(page.getByRole("status")).toContainText(`Usuario ${nombre} creado`);

  // Al abrirlo, el permiso sigue marcado
  await page.getByRole("link", { name: nombre }).first().click();
  await expect(casilla()).toBeChecked();

  // Pasa a técnico: los permisos de encargado se borran (B1 §4)
  await page.getByRole("radio", { name: /Técnico/ }).check();
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByText("Cambios guardados.")).toBeVisible();

  // Vuelve a encargado: empieza sin permisos
  await page.reload();
  await page.getByRole("radio", { name: /Encargado/ }).check();
  await expect(casilla()).not.toBeChecked();
});

test("el encargado sin módulos solo ve el inicio y no entra a Usuarios", async ({ page, browser }, info) => {
  const nombre = `Encargado sin modulos ${sufijo(info)}`;
  const usuario = `encargado-solo-${sufijo(info).toLowerCase()}`;

  await ingresarComoDueno(page);
  await page.goto("/panel/usuarios/nuevo");
  await page.getByLabel("Nombre").fill(nombre);
  await page.getByLabel("Usuario", { exact: true }).fill(usuario);
  await page.getByLabel("Contraseña inicial").fill("encargado-123");
  await page.getByRole("radio", { name: /Encargado/ }).check();
  await page.getByRole("button", { name: "Crear usuario" }).click();
  await expect(page.getByRole("status")).toContainText(`Usuario ${nombre} creado`);

  const ctx = await browser.newContext(info.project.use);
  const encargado = await ctx.newPage();
  await ingresar(encargado, usuario, "encargado-123");
  await expect(encargado).toHaveURL(/\/panel$/);
  if (info.project.name === "celular") await encargado.getByRole("button", { name: "Abrir menú" }).click();
  const menu = encargado.getByRole("navigation", { name: "Panel" });
  await expect(menu.getByRole("link")).toHaveText(["Inicio"]);

  // Nunca gestiona usuarios ni cotiza, aunque escriba la dirección (3.2, 3.3)
  await encargado.goto("/panel/usuarios/nuevo");
  await expect(encargado).toHaveURL(/\/panel\/sin-acceso$/);
  await ctx.close();
});
