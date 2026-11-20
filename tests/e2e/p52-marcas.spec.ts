import { expect, test, type TestInfo } from "@playwright/test";
import { consultar, ingresarComoDueno } from "./apoyo";

// Pedido 52 (etapas/P52-catalogo-de-marcas.md): la marca se elige de la lista (una nueva se suma sola); el modelo es
// un texto simple. Cada proyecto y reintento, sus datos.

const sufijo = (info: TestInfo) => `${info.project.name === "celular" ? "C" : "E"}${info.retry}`;
const telefono = (info: TestInfo, n: number) => `5917${info.project.name === "celular" ? 7 : 8}91${info.retry}0${n}0`;

test("la marca se elige de la lista y una marca nueva se suma a la lista", async ({ page }, info) => {
  const s = sufijo(info);
  await ingresarComoDueno(page);
  await page.goto("/panel/clientes/nuevo");
  await page.getByLabel("Nombre", { exact: true }).fill(`Marca nueva ${s}`);
  await page.getByLabel("WhatsApp").fill(telefono(info, 2).slice(3));
  await page.getByLabel("Placa", { exact: true }).fill(`MA52${s}2`);
  await page.getByLabel("Tamaño", { exact: true }).selectOption({ index: 1 });
  await page.getByText("Agregar marca, modelo, año y color").click();

  // "toy" encuentra Toyota (y no ofrece agregar "toy")
  const marca = page.getByRole("combobox", { name: /^Marca/ });
  await marca.click();
  await marca.pressSequentially("toy");
  await expect(page.getByRole("option", { name: "Toyota" })).toBeVisible();
  await expect(page.getByRole("option", { name: /^Agregar/ })).toHaveCount(0);
  await page.getByRole("option", { name: "Toyota" }).click();
  await expect(marca).toHaveValue("Toyota");

  // El modelo, un texto simple
  await page.getByLabel("Modelo (opcional)").fill("Hilux");

  // Una marca que no está: "Agregar «X»"
  const nueva = `Marca P52 ${s}`;
  await marca.fill("");
  await marca.pressSequentially(nueva);
  await page.getByRole("option", { name: `Agregar «${nueva}»` }).click();
  await expect(marca).toHaveValue(nueva);
  await page.getByRole("button", { name: "Crear cliente" }).click();
  await expect(page).toHaveURL(/\/panel\/clientes\/\d+\?creado=1/);

  const [v] = await consultar<{ marca: string }>("select marca from vehiculo where placa = $1", [`MA52${s}2`]);
  expect(v.marca).toBe(nueva);
  // Quedó en la lista de Configuración → Taller
  await page.goto("/panel/configuracion/taller");
  await expect(page.getByRole("region", { name: "Marcas de vehículo" })).toContainText(nueva);
});
