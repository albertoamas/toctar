import { expect, test } from "@playwright/test";
import { alertaDeIngreso, crearUsuario, DUENO, ingresar, ingresarComoDueno, PERFIL_TALLER } from "./apoyo";

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

// Pulido visual 4.1; pedido 26: el dueño entra a lo del día (los módulos, en el menú). Pedido 32: el perfil Taller ve
// en el menú la agenda y las órdenes, sin lo que no le toca
test("el dueño ve lo del día y llega a cada módulo por el menú; el perfil Taller ve la agenda y las órdenes", async ({ page }, info) => {
  await ingresarComoDueno(page);
  await expect(page.getByRole("region", { name: "Resumen de hoy" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Ir a" })).toHaveCount(0);
  if (info.project.name === "celular") await page.getByRole("button", { name: "Abrir menú" }).click();
  await page.getByRole("navigation", { name: "Panel" }).getByRole("link", { name: "Usuarios" }).click();
  await expect(page).toHaveURL(/\/panel\/usuarios$/);

  const usuario = `taller-inicio-${info.project.name}`;
  await crearUsuario({ usuario, nombre: "Chico del taller", contrasena: "taller-inicio-1", rol: "encargado", permisos: PERFIL_TALLER });
  await page.context().clearCookies();
  await ingresar(page, usuario, "taller-inicio-1");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Hola, Chico");
  // En el celular el menú se abre (en la computadora es la barra lateral)
  if (info.project.name === "celular") await page.getByRole("button", { name: "Abrir menú" }).click();
  const menu = page.getByRole("navigation", { name: "Panel" });
  await expect(menu.getByRole("link")).toHaveText([/^Inicio/, /^Agenda/, /^Órdenes/]);
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
  await crearUsuario({ usuario, nombre: "Ex encargado", contrasena: "encargado-123", rol: "encargado", desactivado: true });
  await ingresar(page, usuario, "encargado-123");
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

test("el fondo de la página es negro en el ingreso y en el sitio, y claro en el panel después de entrar", async ({ page }) => {
  // Antes, el body quedaba blanco y se veía arriba y abajo al estirar la página o bajo las barras del sistema
  const fondo = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  await page.goto("/contacto");
  await expect.poll(fondo).toBe("rgb(0, 0, 0)");
  await page.goto("/ingresar");
  await expect.poll(fondo).toBe("rgb(0, 0, 0)");
  // Después de entrar, Next deja el ingreso oculto en la página: no cuenta
  await ingresarComoDueno(page);
  await expect.poll(fondo).toBe("rgb(255, 255, 255)");
});
