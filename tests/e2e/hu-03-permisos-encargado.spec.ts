import { expect, test, type TestInfo } from "@playwright/test";
import { ingresar, ingresarComoDueno } from "./apoyo";

// HU-03 Permisos del encargado. Criterios: docs/09-pruebas/criterios-entrega-1.md (3.1 a 3.3) y, desde el pedido 32,
// los perfiles (P32-roles-sin-tecnico.md). Cada módulo suma su casilla cuando existe su pantalla; esta prueba usa
// "Autorizar entrega con saldo". El acceso a Reclamos se prueba en hu-17.

const sufijo = (info: TestInfo) => (info.project.name === "celular" ? "C" : "E");

test("los permisos del encargado: el perfil marca sus casillas, se ajustan y se guardan", async ({ page }, info) => {
  const nombre = `Encargado con permiso ${sufijo(info)}`;
  const usuario = `encargado-permiso-${sufijo(info).toLowerCase()}`;
  const casilla = () => page.getByRole("checkbox", { name: /Autorizar entrega con saldo/ });

  await ingresarComoDueno(page);
  await page.goto("/panel/usuarios/nuevo");
  await page.getByLabel("Nombre").fill(nombre);
  await page.getByLabel("Usuario", { exact: true }).fill(usuario);
  await page.getByLabel("Contraseña inicial").fill("encargado-123");

  // Las casillas solo aparecen para el encargado
  await page.getByRole("radio", { name: /Dueño/ }).check();
  await expect(casilla()).toHaveCount(0);
  await page.getByRole("radio", { name: /Encargado/ }).check();
  // El perfil Taller marca la agenda y las órdenes; Todo, todas; ajustar una casilla deja de ser un perfil
  const perfil = (nombre: string) => page.getByRole("button", { name: new RegExp(`^${nombre}`) });
  await expect(perfil("Taller")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("checkbox", { name: /^Órdenes/ })).toBeChecked();
  await expect(casilla()).not.toBeChecked();
  await perfil("Todo").click();
  await expect(casilla()).toBeChecked();
  await perfil("Taller").click();
  await casilla().check();
  await expect(perfil("Taller")).toHaveAttribute("aria-pressed", "false");
  await page.getByRole("button", { name: "Crear usuario" }).click();
  await expect(page.getByText(`Usuario ${nombre} creado`)).toBeVisible();

  // En su ficha, lo marcado se lee (C6) y, al editar, sigue marcado
  await page.getByRole("link", { name: nombre }).first().click();
  await expect(page.getByRole("list", { name: "Permisos" })).toContainText("Agenda");
  await page.getByRole("button", { name: "Editar rol y permisos" }).click();
  const modal = page.getByRole("dialog", { name: "Rol y permisos" });
  await expect(modal.getByRole("checkbox", { name: /^Agenda/ })).toBeChecked();
  await expect(modal.getByRole("checkbox", { name: /^Órdenes/ })).toBeChecked();

  // Se quitan todos: queda sin permisos (solo el inicio). No se lo pasa a dueño: las pruebas corren en paralelo y la del
  // único dueño (hu-02) dejaría de valer
  await modal.getByRole("button", { name: /^Taller/ }).click();
  await modal.getByRole("checkbox", { name: /^Agenda/ }).uncheck();
  await modal.getByRole("checkbox", { name: /^Órdenes/ }).uncheck();
  await modal.getByRole("button", { name: "Guardar rol y permisos" }).click();
  await expect(page.getByText("Rol y permisos guardados.")).toBeVisible();
  await page.reload();
  await expect(page.getByText("Sin permisos: solo ve el inicio.")).toBeVisible();
});

test("el encargado sin permisos solo ve el inicio y no entra a Usuarios", async ({ page, browser }, info) => {
  const nombre = `Encargado sin modulos ${sufijo(info)}`;
  const usuario = `encargado-solo-${sufijo(info).toLowerCase()}`;

  await ingresarComoDueno(page);
  await page.goto("/panel/usuarios/nuevo");
  await page.getByLabel("Nombre").fill(nombre);
  await page.getByLabel("Usuario", { exact: true }).fill(usuario);
  await page.getByLabel("Contraseña inicial").fill("encargado-123");
  await page.getByRole("radio", { name: /Encargado/ }).check();
  // Empieza con el perfil Taller: se desmarca para dejarlo sin permisos
  await page.getByRole("checkbox", { name: /^Agenda/ }).uncheck();
  await page.getByRole("checkbox", { name: /^Órdenes/ }).uncheck();
  await page.getByRole("button", { name: "Crear usuario" }).click();
  await expect(page.getByText(`Usuario ${nombre} creado`)).toBeVisible();

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
