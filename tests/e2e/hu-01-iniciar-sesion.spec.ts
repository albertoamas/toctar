import { expect, test } from "@playwright/test";
import { DUENO, alertaDeIngreso, crearUsuario, ingresar, ingresarComoDueno } from "./apoyo";

// HU-01 Iniciar sesión. Criterios en docs/05-analisis/historias-de-usuario/historias.md

test("sin sesión, el panel lleva a la pantalla de ingreso", async ({ page }) => {
  await page.goto("/panel");
  await expect(page).toHaveURL(/\/ingresar$/);
});

test("con datos correctos entra al panel y ve su nombre", async ({ page }) => {
  await ingresarComoDueno(page);
  // El saludo es el título del inicio, con el primer nombre (pulido 4.1)
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(`Hola, ${DUENO.nombre.split(" ")[0]}`);
});

// Pulido visual 4.1
test("el inicio da un acceso a cada módulo que la persona puede usar; al técnico, solo a sus órdenes", async ({ page }, info) => {
  await ingresarComoDueno(page);
  // Debajo de lo del día (HU-39), en el orden del menú (por grupos)
  const accesos = page.getByRole("navigation", { name: "Ir a" }).getByRole("link");
  await expect(accesos).toHaveText([/^Agenda/, /^Órdenes/, /^Clientes/, /^Consultas/, /^Saldos pendientes/, /^Mantenimientos/, /^Reclamos/, /^Sitio web/, /^Catálogo y precios/, /^Usuarios/, /^Configuración/]);
  await accesos.filter({ hasText: "Usuarios" }).click();
  await expect(page).toHaveURL(/\/panel\/usuarios$/);

  const usuario = `tecnico-inicio-${info.project.name}`;
  await crearUsuario({ usuario, nombre: "Técnico Inicio", contrasena: "tecnico-inicio-1", rol: "tecnico" });
  await page.context().clearCookies();
  await ingresar(page, usuario, "tecnico-inicio-1");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Hola, Técnico");
  await expect(page.getByRole("navigation", { name: "Ir a" }).getByRole("link")).toHaveText([/^Órdenes/]);
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

// Pulido visual 3.1
test("tras un error el foco va a la contraseña; los campos son de 44 px y la contraseña se puede ver", async ({ page }) => {
  await page.goto("/ingresar");
  // Una salida al sitio, de 44 px
  const volver = page.getByRole("link", { name: "Volver al sitio" });
  await expect(volver).toHaveAttribute("href", "/");
  expect((await volver.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  const contrasena = page.getByLabel("Contraseña", { exact: true });
  for (const campo of [page.getByLabel("Usuario"), contrasena, page.getByRole("button", { name: "Ingresar" })]) {
    expect((await campo.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  }

  // Mostrar y ocultar lo escrito
  await contrasena.fill("secreta");
  await page.getByRole("button", { name: "Mostrar la contraseña" }).click();
  await expect(contrasena).toHaveAttribute("type", "text");
  await page.getByRole("button", { name: "Ocultar la contraseña" }).click();
  await expect(contrasena).toHaveAttribute("type", "password");

  // Con error: la contraseña vuelve vacía y con el foco, y el mensaje queda vinculado a los campos
  await page.getByLabel("Usuario").fill("usuario-que-no-existe-31");
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(alertaDeIngreso(page)).toHaveText("Usuario o contraseña incorrectos.");
  await expect(contrasena).toBeFocused();
  await expect(contrasena).toHaveValue("");
  await expect(contrasena).toHaveAccessibleDescription("Usuario o contraseña incorrectos.");
});
