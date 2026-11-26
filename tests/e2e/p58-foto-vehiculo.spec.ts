import { expect, test, type TestInfo } from "@playwright/test";
import { consultar, crearClienteEnBase, crearOrdenLista, editarVehiculo, ingresarComoDueno, PNG } from "./apoyo";

// Pedido 58 (etapas/P58-foto-del-vehiculo.md): la foto de cada vehículo, para saber cuál es de un vistazo. Se toma al
// registrarlo o editarlo y se llena sola con la primera foto de inicio de su orden. Cada proyecto y reintento, sus datos.

const s = (info: TestInfo) => `${info.project.name === "celular" ? "C" : "E"}${info.retry}`;
const telefono = (info: TestInfo, n: number) => `5917${info.project.name === "celular" ? 6 : 5}58${info.retry}0${n}0`;
const fotoDe = (placa: string) => consultar<{ foto: number | null }>("select foto_archivo_id as foto from vehiculo where placa = $1", [placa]).then(([v]) => v?.foto ?? null);

test("un cliente nuevo con la foto de su auto: se ve en su ficha, en la del vehículo y al elegirlo para cotizar", async ({ page }, info) => {
  const placa = `FV58${s(info)}1`;
  await ingresarComoDueno(page);
  await page.goto("/panel/clientes/nuevo", { waitUntil: "networkidle" });
  await page.getByLabel("Nombre", { exact: true }).fill(`Con foto ${s(info)}`);
  await page.getByLabel("WhatsApp").fill(telefono(info, 1).slice(3));
  await page.getByLabel("Placa", { exact: true }).fill(placa);
  await page.getByLabel("Tamaño", { exact: true }).selectOption({ index: 1 });
  await page.getByLabel("Galería para la foto del vehículo").setInputFiles({ name: "auto.png", mimeType: "image/png", buffer: PNG });
  await expect(page.getByRole("img", { name: "Foto del vehículo elegida" }).or(page.locator("[data-zona-foto] img"))).toBeVisible();
  await page.getByRole("button", { name: "Crear cliente" }).click();
  await expect(page).toHaveURL(/\/panel\/clientes\/\d+\?creado=1/);
  expect(await fotoDe(placa)).not.toBeNull();

  // En la ficha del cliente, la miniatura en su vehículo; en la del vehículo, arriba, y se abre
  const fila = page.getByRole("list", { name: "Vehículos", exact: true }).getByRole("link", { name: new RegExp(placa) });
  await expect(fila.locator("img")).toBeVisible();
  const clienteUrl = page.url().split("?")[0];
  await fila.click();
  await page.getByRole("button", { name: `Ver la foto de ${placa}` }).click();
  await expect(page.getByRole("dialog", { name: placa })).toBeVisible();
  await page.keyboard.press("Escape");

  // Al cotizar, la tarjeta del vehículo con su foto
  await page.goto(`/panel/cotizaciones/nueva?cliente=${clienteUrl.split("/").pop()}`, { waitUntil: "networkidle" });
  await expect(page.getByRole("radio", { name: new RegExp(placa) }).locator("img")).toBeVisible();
});

test("una foto que no es una foto no se guarda y el vehículo queda sin ella", async ({ page }, info) => {
  const placa = `FV58${s(info)}2`;
  const id = await crearClienteEnBase({ nombre: `Foto mala ${s(info)}`, telefono: telefono(info, 2), placa });
  await ingresarComoDueno(page);
  const [{ vehiculo }] = await consultar<{ vehiculo: number }>("select id as vehiculo from vehiculo where placa = $1", [placa]);
  await page.goto(`/panel/clientes/${id}/vehiculos/${vehiculo}`, { waitUntil: "networkidle" });
  // Sin foto: el recuadro
  await expect(page.getByRole("img", { name: "Sin foto" })).toBeVisible();
  const modal = await editarVehiculo(page, placa);
  // La cambia por una buena: queda
  await modal.getByLabel("Galería para la foto del vehículo").setInputFiles({ name: "auto.png", mimeType: "image/png", buffer: PNG });
  await modal.getByRole("button", { name: "Guardar vehículo" }).click();
  await expect(modal).toHaveCount(0);
  await expect(page.getByRole("button", { name: `Ver la foto de ${placa}` })).toBeVisible();
  const primera = await fotoDe(placa);
  expect(primera).not.toBeNull();
  // Otra la reemplaza, y la anterior (subida para el vehículo) se borra
  await editarVehiculo(page, placa);
  await modal.getByLabel("Galería para la foto del vehículo").setInputFiles({ name: "otra.png", mimeType: "image/png", buffer: PNG });
  await modal.getByRole("button", { name: "Guardar vehículo" }).click();
  await expect(modal).toHaveCount(0);
  await expect.poll(() => fotoDe(placa)).not.toBe(primera);
  const [{ queda }] = await consultar<{ queda: string }>("select count(*) as queda from archivo where id = $1", [primera]);
  expect(Number(queda)).toBe(0);
});

test("la primera foto de inicio de la orden pasa a ser la del vehículo si no tiene", async ({ page }, info) => {
  const placa = `FV58${s(info)}3`;
  await crearClienteEnBase({ nombre: `Orden foto ${s(info)}`, telefono: telefono(info, 3), placa });
  const dias = 1800 + (info.project.name === "celular" ? 0 : 10) + info.retry * 2;
  const orden = await crearOrdenLista({ placa, dias, precio: 300, pagado: 0 });
  await consultar("update trabajo set estado = 'en_proceso', listo_at = null where id = $1", [orden]);
  expect(await fotoDe(placa)).toBeNull();
  await ingresarComoDueno(page);
  await page.goto(`/panel/ordenes/${orden}`, { waitUntil: "networkidle" });
  await expect(page.getByRole("button", { name: "Tomar foto" }).first()).toBeEnabled();
  await page.getByLabel("Cámara para fotos del inicio").setInputFiles({ name: "frente.png", mimeType: "image/png", buffer: PNG });
  await expect(page.getByText("Foto guardada.")).toBeVisible();
  await expect.poll(() => fotoDe(placa)).not.toBeNull();
});
