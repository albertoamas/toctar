import { expect, test, type TestInfo } from "@playwright/test";
import { consultar, ingresarComoDueno } from "./apoyo";

// Pedido 52 (etapas/P52-catalogo-de-marcas.md): la marca se elige de la lista; el modelo es un texto simple. Desde el
// 26/11 la marca es un menú y una nueva solo la suma el dueño en Configuración → Taller. Cada proyecto y reintento, sus datos.

const sufijo = (info: TestInfo) => `${info.project.name === "celular" ? "C" : "E"}${info.retry}`;
const telefono = (info: TestInfo, n: number) => `5917${info.project.name === "celular" ? 7 : 8}91${info.retry}0${n}0`;

test("la marca se elige de la lista; una que no está no se agrega desde el formulario", async ({ page }, info) => {
  const s = sufijo(info);
  await ingresarComoDueno(page);
  await page.goto("/panel/clientes/nuevo", { waitUntil: "networkidle" });
  await page.getByLabel("Nombre", { exact: true }).fill(`Marca nueva ${s}`);
  await page.getByLabel("WhatsApp").fill(telefono(info, 2).slice(3));
  await page.getByLabel("Placa", { exact: true }).fill(`MA52${s}2`);
  await page.getByLabel("Tamaño", { exact: true }).selectOption({ index: 1 });

  // Un menú (no se escribe): las marcas de la lista
  const marca = page.getByLabel("Marca (opcional)", { exact: true });
  await expect(marca).toHaveJSProperty("tagName", "SELECT");
  await marca.selectOption("Toyota");
  await page.getByLabel("Modelo (opcional)").fill("Hilux");

  // Una que no está, aunque llegue al servidor (alguien que arma el pedido a mano), se rechaza y no se suma a la lista
  const nueva = `Marca P52 ${s}`;
  await marca.evaluate((sel: HTMLSelectElement, valor) => {
    sel.add(new Option(valor, valor));
    sel.value = valor;
  }, nueva);
  await page.getByRole("button", { name: "Crear cliente" }).click();
  await expect(page.getByText("Elige una marca de la lista.")).toBeVisible();
  const [{ cuantas }] = await consultar<{ cuantas: string }>("select count(*) as cuantas from marca_vehiculo where nombre = $1", [nueva]);
  expect(Number(cuantas)).toBe(0);

  await page.getByLabel("Marca (opcional)", { exact: true }).selectOption("Toyota");
  await page.getByRole("button", { name: "Crear cliente" }).click();
  await expect(page).toHaveURL(/\/panel\/clientes\/\d+\?creado=1/);
  const [v] = await consultar<{ marca: string; modelo: string }>("select marca, modelo from vehiculo where placa = $1", [`MA52${s}2`]);
  expect(v).toEqual({ marca: "Toyota", modelo: "Hilux" });
});
