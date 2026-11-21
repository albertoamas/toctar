import { expect, test, type TestInfo } from "@playwright/test";
import { consultar, crearClienteEnBase, ingresarComoDueno } from "./apoyo";

// HU-29 Tablero de la agenda. Especificación: docs/08-desarrollo/etapas/C3-agenda-pagos.md §9.
// Cada proyecto mira su propia semana, lejos de hoy, para no chocar con las reservas de otras pruebas.

const sufijo = (info: TestInfo) => (info.project.name === "celular" ? "C" : "E");

/** El lunes de una semana propia: dentro de 400 (celular) o 500 (escritorio) días. */
async function lunesPropio(info: TestInfo): Promise<string> {
  const [{ lunes }] = await consultar<{ lunes: string }>(
    "select to_char(d - (extract(isodow from d)::int - 1), 'YYYY-MM-DD') as lunes from (select (now() at time zone 'America/La_Paz')::date + $1::int as d) x",
    [info.project.name === "celular" ? 400 : 500],
  );
  return lunes;
}

/** Una reserva directa en la base, en días desde el lunes. */
async function reserva(placa: string, lunes: string, desde: number, hasta: number) {
  await consultar(
    `insert into trabajo (sucursal_id, cliente_id, vehiculo_id, fecha_inicio, fecha_fin, created_by)
     select e.sucursal_id, v.cliente_id, v.id, $2::date + $3::int, $2::date + $4::int, v.created_by
     from vehiculo v, (select id as sucursal_id from sucursal order by id limit 1) e where v.placa = $1`,
    [placa, lunes, desde, hasta],
  );
}

/** Borra lo que dejó un intento anterior (un reintento en CI): reservas, vehículos y clientes de esta prueba. */
async function limpiar(placas: string[]) {
  await consultar("delete from trabajo_linea where trabajo_id in (select t.id from trabajo t join vehiculo v on v.id = t.vehiculo_id where v.placa = any($1))", [placas]);
  await consultar("delete from trabajo where vehiculo_id in (select id from vehiculo where placa = any($1))", [placas]);
  const clientes = await consultar<{ id: number }>("delete from vehiculo where placa = any($1) returning cliente_id as id", [placas]);
  await consultar("delete from cliente where id = any($1)", [clientes.map((c) => c.id)]);
}

test("cada día dice cuántos autos tiene, con sus reservas; un día que viene lleva a reservar (pedido 55)", async ({ page }, info) => {
  const s = sufijo(info);
  const lunes = await lunesPropio(info);
  await limpiar([`TB29${s}1`, `TB29${s}2`]);
  await crearClienteEnBase({ nombre: `Tablero ${s}`, telefono: `5917${s === "C" ? 3 : 4}2900010`, placa: `TB29${s}1` });
  await crearClienteEnBase({ nombre: `Tablero largo ${s}`, telefono: `5917${s === "C" ? 3 : 4}2900020`, placa: `TB29${s}2` });
  // Martes y miércoles; desde el sábado hasta el martes siguiente
  await reserva(`TB29${s}1`, lunes, 1, 2);
  await reserva(`TB29${s}2`, lunes, 5, 8);
  const [{ martes, miercoles, jueves }] = await consultar<{ martes: string; miercoles: string; jueves: string }>(
    "select to_char($1::date + 1, 'YYYY-MM-DD') as martes, to_char($1::date + 2, 'YYYY-MM-DD') as miercoles, to_char($1::date + 3, 'YYYY-MM-DD') as jueves",
    [lunes],
  );
  const nombreDia = (fecha: string) => new RegExp(`^${["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"][new Date(`${fecha}T12:00:00Z`).getUTCDay() === 0 ? 6 : new Date(`${fecha}T12:00:00Z`).getUTCDay() - 1]} ${Number(fecha.slice(8))}$`);
  await ingresarComoDueno(page);
  await page.goto(`/panel/agenda?semana=${lunes}`);
  const dia = (fecha: string) => page.getByRole("region", { name: nombreDia(fecha) }).locator("visible=true");

  // El martes: su reserva y cuántos autos hay
  await expect(dia(martes).getByRole("link", { name: new RegExp(`^TB29${s}1`) })).toBeVisible();
  await expect(dia(martes)).toContainText("1 auto");
  if (info.project.name === "escritorio") {
    // En la computadora, la de dos días va en los dos, con "Día 1 de 2" y "Día 2 de 2"
    await expect(dia(martes)).toContainText("Día 1 de 2");
    await expect(dia(miercoles).getByRole("link", { name: new RegExp(`^TB29${s}1`) })).toContainText("Día 2 de 2");
  } else {
    // En la lista, entera el primer día y nombrada los siguientes
    await expect(dia(miercoles)).toContainText("Siguen en el taller:");
  }
  // Un día sin reservas lo dice y lleva a reservar ese día
  await expect(dia(jueves)).toContainText("Sin reservas");
  await dia(jueves).getByRole("link", { name: /Reservar el Jueves/ }).click();
  await expect(page).toHaveURL(new RegExp(`/panel/agenda/nueva\\?fecha=${jueves}(?:[?&]volver=[^&#]*)?$`));
});

test("el tablero arranca en la semana de hoy y la marca", async ({ page }, info) => {
  await ingresarComoDueno(page);
  await page.goto("/panel/agenda");
  // Sin la guía de colores (19/11): cada reserva ya dice su estado escrito
  await expect(page.getByRole("list", { name: "Colores de la agenda" })).toHaveCount(0);
  if (info.project.name === "escritorio") await expect(page.getByText("Hoy", { exact: true }).locator("visible=true")).toBeVisible();
  // En el celular, la lista empieza hoy (20/11)
  else await expect(page.getByRole("heading", { level: 2, name: /^Hoy, / })).toBeVisible();
  // Lejos de hoy aparece el atajo para volver
  await page.getByRole("link", { name: "Semana siguiente", exact: true }).click();
  await page.getByRole("link", { name: "Hoy", exact: true }).click();
  await expect(page).toHaveURL(/\/panel\/agenda$/);
});

test("el buscador encuentra una reserva de otra semana por su placa y la abre; volver regresa a la búsqueda", async ({ page }, info) => {
  const s = sufijo(info);
  const placa = `BU29${s}1`;
  const lunes = await lunesPropio(info);
  await limpiar([placa]);
  await crearClienteEnBase({ nombre: `Buscada en agenda ${s}`, telefono: `5917${s === "C" ? 3 : 4}2900030`, placa });
  // El viernes: el martes y el miércoles son de la primera prueba y el jueves queda libre para ella
  await reserva(placa, lunes, 4, 4);
  await ingresarComoDueno(page);
  await page.goto("/panel/agenda");

  await page.getByRole("searchbox", { name: "Buscar reservas por placa, cliente o teléfono" }).fill(placa.toLowerCase());
  const fila = page.getByRole("link", { name: new RegExp(`^${placa}`) });
  await expect(fila).toBeVisible();
  await expect(page.getByText(`1 reserva con «${placa.toLowerCase()}»`)).toBeVisible();
  // Mientras se busca, la semana no se ve
  await expect(page.getByRole("navigation", { name: "Semanas" })).toHaveCount(0);
  await fila.click();
  await expect(page.getByRole("heading", { level: 1, name: placa })).toBeVisible();
  await page.getByRole("main").getByRole("link", { name: "Volver a Agenda" }).click();
  await expect(page).toHaveURL(/\/panel\/agenda\?q=/);
  await expect(page.getByRole("link", { name: new RegExp(`^${placa}`) })).toBeVisible();

  // Sin coincidencias, lo dice
  await page.getByRole("searchbox", { name: "Buscar reservas por placa, cliente o teléfono" }).fill("ZZZZ999");
  await expect(page.getByText("Ninguna reserva coincide con «ZZZZ999». Revisa la placa o el nombre.")).toBeVisible();
});
