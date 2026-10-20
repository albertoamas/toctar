import { expect, test, type TestInfo } from "@playwright/test";
import { crearUsuario, ingresar, ingresarComoDueno } from "./apoyo";

// HU-21 Registrar clientes y vehículos. Especificación: docs/08-desarrollo/etapas/C1-catalogo-clientes.md §9.
// Cada proyecto (celular o escritorio) usa su propio teléfono y su propia placa, para no pisarse al correr en paralelo.

const sufijo = (info: TestInfo) => (info.project.name === "celular" ? "C" : "E");
const telefono = (info: TestInfo, n: number) => `7${info.project.name === "celular" ? 1 : 2}00000${n}`;

test("el personal registra un cliente con su primer vehículo; los obligatorios vacíos muestran su error", async ({ page }, info) => {
  const nombre = `Cliente HU21 ${sufijo(info)}`;
  await ingresarComoDueno(page);
  if (info.project.name === "celular") await page.getByRole("button", { name: "Abrir menú" }).click();
  await page.getByRole("navigation", { name: "Panel" }).getByRole("link", { name: "Clientes" }).click();
  await page.getByRole("link", { name: "Agregar cliente" }).click();

  // Vacío: nombre y WhatsApp son obligatorios; el foco va al primero
  await page.getByRole("button", { name: "Agregar cliente" }).click();
  await expect(page.getByText("Escribe el nombre.")).toBeVisible();
  await expect(page.getByText("Escribe los 8 dígitos del celular.")).toBeVisible();
  await expect(page.getByLabel("Nombre", { exact: true })).toBeFocused();

  await page.getByLabel("Nombre", { exact: true }).fill(nombre);
  await page.getByLabel("WhatsApp").fill(telefono(info, 1));
  // Un dato del vehículo sin placa ni tamaño: el vehículo queda a medias y se avisa
  await page.getByLabel("Marca").fill("Toyota");
  await page.getByRole("button", { name: "Agregar cliente" }).click();
  await expect(page.getByText("Escribe la placa.")).toBeVisible();
  await expect(page.getByText("Elige el tamaño.")).toBeVisible();

  await page.getByLabel("Placa", { exact: true }).fill(`hu21 ${sufijo(info)}-01`);
  await page.getByLabel("Tamaño").selectOption({ label: "Compactos" });
  await page.getByLabel("Modelo").fill("Yaris");
  await page.getByLabel("Año", { exact: true }).fill("2019");
  await page.getByRole("button", { name: "Agregar cliente" }).click();

  await expect(page).toHaveURL(/\/panel\/clientes\/\d+\?creado=1$/);
  await expect(page.getByRole("status")).toContainText(`Cliente ${nombre} creado.`);
  await expect(page.getByRole("heading", { level: 1, name: nombre })).toBeVisible();
  // La placa se guarda normalizada: mayúsculas, sin espacios ni guiones
  const vehiculos = page.getByRole("list", { name: "Vehículos" });
  await expect(vehiculos).toContainText(`HU21${sufijo(info)}01`);
  await expect(vehiculos).toContainText("Compactos");
  await expect(vehiculos).toContainText("Toyota Yaris");
});

test("un teléfono o una placa repetidos avisan de quién son y llevan a su ficha", async ({ page }, info) => {
  const nombre = `Cliente repetido ${sufijo(info)}`;
  await ingresarComoDueno(page);
  await page.goto("/panel/clientes/nuevo");
  await page.getByLabel("Nombre", { exact: true }).fill(nombre);
  await page.getByLabel("WhatsApp").fill(telefono(info, 2));
  await page.getByLabel("Placa", { exact: true }).fill(`REP${sufijo(info)}1`);
  await page.getByLabel("Tamaño").selectOption({ label: "Compactos" });
  await page.getByRole("button", { name: "Agregar cliente" }).click();
  await expect(page).toHaveURL(/\/panel\/clientes\/\d+\?creado=1$/);
  const ficha = page.url().replace("?creado=1", "");

  // El mismo número, escrito con el código de país y espacios
  await page.goto("/panel/clientes/nuevo");
  await page.getByLabel("Nombre", { exact: true }).fill("Otra persona");
  await page.getByLabel("WhatsApp").fill(`+591 ${telefono(info, 2)}`);
  await page.getByRole("button", { name: "Agregar cliente" }).click();
  await expect(page.getByText(`Ese número ya es de ${nombre}.`)).toBeVisible();
  await expect(page.getByLabel("WhatsApp")).toBeFocused();

  // Otro número, pero la misma placa escrita distinto
  await page.getByLabel("WhatsApp").fill(telefono(info, 3));
  await page.getByLabel("Placa", { exact: true }).fill(`rep-${sufijo(info).toLowerCase()} 1`);
  await page.getByLabel("Tamaño").selectOption({ label: "Compactos" });
  await page.getByRole("button", { name: "Agregar cliente" }).click();
  await expect(page.getByText(`La placa REP${sufijo(info)}1 ya está registrada a nombre de ${nombre}.`)).toBeVisible();
  await page.getByRole("link", { name: `Abrir la ficha de ${nombre}` }).click();
  await expect(page).toHaveURL(ficha);
});

test("un cliente se registra sin vehículo", async ({ page }, info) => {
  await ingresarComoDueno(page);
  await page.goto("/panel/clientes/nuevo");
  await page.getByLabel("Nombre", { exact: true }).fill(`Sin auto ${sufijo(info)}`);
  await page.getByLabel("WhatsApp").fill(telefono(info, 4));
  await page.getByRole("button", { name: "Agregar cliente" }).click();
  await expect(page).toHaveURL(/\/panel\/clientes\/\d+\?creado=1$/);
  await expect(page.getByText("Todavía no tiene vehículos.")).toBeVisible();
});

test("el encargado entra a Clientes solo con el permiso; el técnico nunca", async ({ page }, info) => {
  const casos = [
    { usuario: `enc-clientes-${sufijo(info).toLowerCase()}`, rol: "encargado" as const, permisos: ["clientes"], entra: true },
    { usuario: `enc-sin-clientes-${sufijo(info).toLowerCase()}`, rol: "encargado" as const, permisos: ["sitio"], entra: false },
    { usuario: `tec-clientes-${sufijo(info).toLowerCase()}`, rol: "tecnico" as const, permisos: [], entra: false },
  ];
  for (const c of casos) {
    await crearUsuario({ usuario: c.usuario, nombre: c.usuario, contrasena: "clave-clientes-1", rol: c.rol, permisos: c.permisos });
    await page.context().clearCookies();
    await ingresar(page, c.usuario, "clave-clientes-1");
    await expect(page).toHaveURL(/\/panel$/);
    await page.goto("/panel/clientes/nuevo");
    if (c.entra) await expect(page.getByRole("heading", { level: 1, name: "Agregar cliente" })).toBeVisible();
    else await expect(page).toHaveURL(/\/panel\/sin-acceso$/);
  }
});
