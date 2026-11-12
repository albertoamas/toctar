import { expect, test, type TestInfo } from "@playwright/test";
import { consultar, crearClienteEnBase, crearOrdenLista, crearUsuario, ingresar, ingresarComoDueno } from "./apoyo";

// Pulido 13.52: una pantalla por trabajo. Recibido el vehículo, quien ve las órdenes abre la orden aunque llegue por la
// reserva, y la orden trae lo que solo tenía la reserva (la nota y, en el historial, quién la reservó). Quien no ve las
// órdenes sigue viendo la reserva, para cobrar.

const sufijo = (info: TestInfo) => (info.project.name === "celular" ? "c" : "e");

/** `n`: cada prueba, su cliente y su día (dos órdenes en el mismo espacio y día no caben). */
async function ordenConNota(info: TestInfo, n: number) {
  const s = sufijo(info);
  const placa = `UP52${s.toUpperCase()}${n}${info.retry}`;
  await crearClienteEnBase({ nombre: `Una pantalla ${s}`, telefono: `5917${s === "c" ? 7 : 8}5200${n}${info.retry}0`, placa });
  const id = await crearOrdenLista({ placa, espacio: 2, dias: (info.project.name === "celular" ? 360 : 370) + n * 2 + info.retry, precio: 900, pagado: 300 });
  await consultar("update trabajo set nota = 'Trae las llaves de repuesto' where id = $1", [id]);
  return id;
}

test("con Órdenes, la reserva de un trabajo recibido lleva a la orden, con la nota y quién la reservó", async ({ page }, info) => {
  const id = await ordenConNota(info, 1);
  await ingresarComoDueno(page);
  await page.goto(`/panel/agenda/${id}`);
  await expect(page).toHaveURL(new RegExp(`/panel/ordenes/${id}(?:[?&]volver=[^&#]*)?$`));
  await expect(page.getByRole("region", { name: "Nota de la reserva" })).toContainText("Trae las llaves de repuesto");
  // El historial empieza cuando se reservó: lo más viejo, al final
  await expect(page.getByRole("list", { name: "Historial de la orden" }).getByRole("listitem").last()).toContainText("Reservada.");
  // Ya no se va y se vuelve entre dos pantallas
  await expect(page.getByRole("link", { name: "Ver la reserva" })).toHaveCount(0);
});

test("sin Órdenes, la reserva de un trabajo recibido se sigue viendo, con su saldo para cobrarlo", async ({ page }, info) => {
  const id = await ordenConNota(info, 2);
  const usuario = `caja-up52-${sufijo(info)}${info.retry}`;
  await crearUsuario({ usuario, nombre: "Atiende y cobra", contrasena: "encargado-123", rol: "encargado", permisos: ["agenda", "pagos"] });
  await ingresar(page, usuario, "encargado-123");
  await expect(page).toHaveURL(/\/panel$/);
  await page.goto(`/panel/agenda/${id}`);
  await expect(page).toHaveURL(new RegExp(`/panel/agenda/${id}$`));
  await expect(page.getByText("Ya se recibió: es una orden del taller.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Registrar pago" })).toBeVisible();
});
