import { expect, test } from "@playwright/test";
import { DUENO, alertaDeIngreso, crearUsuario, ingresar, ingresarComoDueno } from "./apoyo";

// HU-01 Iniciar sesión. Criterios en docs/05-analisis/historias-de-usuario/historias.md

test("sin sesión, el panel lleva a la pantalla de ingreso", async ({ page }) => {
  await page.goto("/panel");
  await expect(page).toHaveURL(/\/ingresar$/);
});

test("con datos correctos entra al panel y ve su nombre", async ({ page }) => {
  await ingresarComoDueno(page);
  await expect(page.getByText(`Hola, ${DUENO.nombre}.`)).toBeVisible();
});

test("el usuario se acepta sin importar mayúsculas", async ({ page }) => {
  await ingresar(page, DUENO.usuario.toUpperCase(), DUENO.contrasena);
  await expect(page).toHaveURL(/\/panel$/);
});

test("con contraseña incorrecta ve un mensaje que no dice qué falló", async ({ page }) => {
  await ingresar(page, DUENO.usuario, "contrasena-equivocada");
  await expect(alertaDeIngreso(page)).toHaveText("Usuario o contraseña incorrectos.");
  await expect(page).toHaveURL(/\/ingresar$/);
});

test("un usuario que no existe ve el mismo mensaje", async ({ page }) => {
  await ingresar(page, "nadie", "cualquier-cosa");
  await expect(alertaDeIngreso(page)).toHaveText("Usuario o contraseña incorrectos.");
});

test("un usuario desactivado no puede entrar y ve el mismo mensaje", async ({ page }, info) => {
  const usuario = `desactivado-${info.project.name}`;
  await crearUsuario({ usuario, nombre: "Ex técnico", contrasena: "tecnico-123", rol: "tecnico", desactivado: true });
  await ingresar(page, usuario, "tecnico-123");
  await expect(alertaDeIngreso(page)).toHaveText("Usuario o contraseña incorrectos.");
});

test("cerrar sesión vuelve al ingreso y el panel queda cerrado", async ({ page, isMobile }) => {
  await ingresarComoDueno(page);
  if (isMobile) await page.getByRole("button", { name: "Abrir menú" }).click();
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await expect(page).toHaveURL(/\/ingresar$/);
  await page.goto("/panel");
  await expect(page).toHaveURL(/\/ingresar$/);
});
