import { expect, test, type TestInfo } from "@playwright/test";
import { consultar, crearClienteEnBase, crearOrdenLista, crearUsuario, ingresar, ingresarComoDueno, PERFIL_TALLER } from "./apoyo";

// Pedido 51 (docs/08-desarrollo/etapas/P51-ficha-del-vehiculo.md): la ficha de un vehículo dentro de Clientes, con su
// dueño, su mantenimiento y su historial, también lo hecho con un dueño anterior (P37). En fila: todas ingresan, y el
// límite de intentos cuenta los ingresos simultáneos.
test.describe.configure({ mode: "serial" });

const s = (info: TestInfo) => `${info.project.name === "celular" ? "C" : "E"}${info.retry}`;
const telefono = (info: TestInfo, n: number) => `5917${info.project.name === "celular" ? 7 : 8}57${info.retry}0${n}0`;

/** Un auto que fue de "anterior" (con una orden a su nombre) y ahora es de "actual" (el cambio de dueño de P37). */
async function autoQueCambioDeDueno(info: TestInfo, n: number) {
  const placa = `VF${s(info)}${n}`;
  const anterior = `Marco Anterior ${s(info)}${n}`;
  const actual = `Lucía Actual ${s(info)}${n}`;
  const anteriorId = await crearClienteEnBase({ nombre: anterior, telefono: telefono(info, n * 2 - 1), placa });
  const actualId = await crearClienteEnBase({ nombre: actual, telefono: telefono(info, n * 2) });
  // Un espacio y un día propios por proyecto y por prueba: las dos corren a la vez y no se pisan en el tablero
  const celular = info.project.name === "celular";
  const ordenId = await crearOrdenLista({ placa, espacio: celular ? 1 : 0, dias: -(40 + n * 3 + info.retry + (celular ? 20 : 0)), precio: 450, pagado: 0 });
  await consultar("update trabajo set estado = 'entregado', entregado_at = now() where id = $1", [ordenId]);
  await consultar("update vehiculo set cliente_id = $1, marca = 'Toyota', modelo = 'Hilux' where placa = $2", [actualId, placa]);
  const [{ id }] = await consultar<{ id: number }>("select id from vehiculo where placa = $1", [placa]);
  return { placa, anterior, actual, anteriorId, actualId, vehiculoId: id, ordenId };
}

test("desde la ficha del cliente se abre la del vehículo, con su dueño y su historial, también el del dueño anterior", async ({ page }, info) => {
  const a = await autoQueCambioDeDueno(info, 1);
  await ingresarComoDueno(page);
  await page.goto(`/panel/clientes/${a.actualId}`, { waitUntil: "networkidle" });
  await page.getByRole("list", { name: "Vehículos", exact: true }).getByRole("link", { name: new RegExp(a.placa) }).click();
  await expect(page).toHaveURL(new RegExp(`/panel/clientes/${a.actualId}/vehiculos/${a.vehiculoId}(?:\\?|$)`));
  await expect(page.getByRole("heading", { level: 1, name: a.placa })).toBeVisible();
  await expect(page.getByRole("region", { name: "Datos" })).toContainText("Toyota Hilux");
  await expect(page.getByRole("list", { name: "Dueño" })).toContainText(a.actual);
  // La orden de cuando era del anterior, con su nombre
  const historial = page.getByRole("list", { name: "Reservas" }).or(page.getByRole("table", { name: "Reservas" }));
  await expect(historial).toContainText(`Con ${a.anterior}`);
  // "Nueva reserva" llega con el cliente y el vehículo elegidos
  await expect(page.getByRole("link", { name: "Nueva reserva" })).toHaveAttribute("href", new RegExp(`/panel/agenda/nueva\\?cliente=${a.actualId}&vehiculo=${a.vehiculoId}`));
  // "Volver" a la ficha del dueño
  await page.getByRole("link", { name: /^Volver/ }).first().click();
  await expect(page).toHaveURL(new RegExp(`/panel/clientes/${a.actualId}(?:\\?|$)`));
});

test("la dirección de antes del cambio de dueño lleva a la de hoy, y la placa se busca en Clientes", async ({ page }, info) => {
  const a = await autoQueCambioDeDueno(info, 2);
  await consultar("update vehiculo set placa = $1 where id = $2", [`VG${s(info)}2`, a.vehiculoId]);
  const placa = `VG${s(info)}2`;
  await ingresarComoDueno(page);
  await page.goto(`/panel/clientes/${a.anteriorId}/vehiculos/${a.vehiculoId}`);
  await expect(page).toHaveURL(new RegExp(`/panel/clientes/${a.actualId}/vehiculos/${a.vehiculoId}$`));
  await expect(page.getByRole("heading", { level: 1, name: placa })).toBeVisible();
  // Un vehículo que no existe: no encontrado
  // Un vehículo que no existe, o un número fuera de lo que guarda la base: no encontrado (no un error)
  for (const id of ["999999", "99999999999"]) {
    await page.goto(`/panel/clientes/${a.actualId}/vehiculos/${id}`);
    await expect(page.getByRole("heading", { level: 1, name: "No encontramos esto" })).toBeVisible();
  }

  // Buscar la placa (como sea que se escriba) lleva directo a su ficha
  await page.goto(`/panel/clientes?q=${placa.toLowerCase()}`, { waitUntil: "networkidle" });
  await page.getByRole("list", { name: "Vehículo con esa placa" }).getByRole("link").click();
  await expect(page.getByRole("heading", { level: 1, name: placa })).toBeVisible();
});

test("en la orden, la placa lleva a la ficha del vehículo; el perfil Taller (sin Clientes) no entra ni la ve como enlace", async ({ page }, info) => {
  const a = await autoQueCambioDeDueno(info, 3);
  await ingresarComoDueno(page);
  await page.goto(`/panel/ordenes/${a.ordenId}`, { waitUntil: "networkidle" });
  await page.getByRole("link", { name: /Ver ficha del vehículo/ }).click();
  // El enlace es al dueño de entonces: lleva a la ficha con el de hoy
  await expect(page).toHaveURL(new RegExp(`/panel/clientes/${a.actualId}/vehiculos/${a.vehiculoId}(?:\\?|$)`));

  const usuario = `taller-p51-${s(info).toLowerCase()}`;
  await crearUsuario({ usuario, nombre: "Taller P51", contrasena: "taller-p51-123", rol: "encargado", permisos: [...PERFIL_TALLER] });
  await page.context().clearCookies();
  await ingresar(page, usuario, "taller-p51-123");
  await expect(page).toHaveURL(/\/panel$/);
  await page.goto(`/panel/ordenes/${a.ordenId}`, { waitUntil: "networkidle" });
  await expect(page.getByRole("link", { name: /Ver ficha del vehículo/ })).toHaveCount(0);
  await page.goto(`/panel/clientes/${a.actualId}/vehiculos/${a.vehiculoId}`);
  await expect(page.getByRole("heading", { level: 1, name: a.placa })).toHaveCount(0);
});
