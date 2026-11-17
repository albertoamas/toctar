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

/** Una reserva directa en la base: espacio por su orden (0 = el primero), días desde el lunes. */
async function reserva(placa: string, espacio: number, lunes: string, desde: number, hasta: number) {
  await consultar(
    `insert into trabajo (sucursal_id, cliente_id, vehiculo_id, espacio_id, fecha_inicio, fecha_fin, created_by)
     select e.sucursal_id, v.cliente_id, v.id, e.id, $3::date + $4::int, $3::date + $5::int, v.created_by
     from vehiculo v, (select * from espacio_taller where activo order by orden offset $2 limit 1) e where v.placa = $1`,
    [placa, espacio, lunes, desde, hasta],
  );
}

/** Borra lo que dejó un intento anterior (un reintento en CI): reservas, vehículos y clientes de esta prueba. */
async function limpiar(placas: string[]) {
  await consultar("delete from trabajo_linea where trabajo_id in (select t.id from trabajo t join vehiculo v on v.id = t.vehiculo_id where v.placa = any($1))", [placas]);
  await consultar("delete from trabajo where vehiculo_id in (select id from vehiculo where placa = any($1))", [placas]);
  const clientes = await consultar<{ id: number }>("delete from vehiculo where placa = any($1) returning cliente_id as id", [placas]);
  await consultar("delete from cliente where id = any($1)", [clientes.map((c) => c.id)]);
}

test("las reservas ocupan sus días en su espacio; un día libre lleva a reservar ahí", async ({ page }, info) => {
  const s = sufijo(info);
  const lunes = await lunesPropio(info);
  await limpiar([`TB29${s}1`, `TB29${s}2`]);
  await crearClienteEnBase({ nombre: `Tablero ${s}`, telefono: `5917${s === "C" ? 3 : 4}2900010`, placa: `TB29${s}1` });
  await crearClienteEnBase({ nombre: `Tablero largo ${s}`, telefono: `5917${s === "C" ? 3 : 4}2900020`, placa: `TB29${s}2` });
  // Martes y miércoles en el primer espacio; desde el sábado hasta el martes siguiente en el segundo
  await reserva(`TB29${s}1`, 0, lunes, 1, 2);
  await reserva(`TB29${s}2`, 1, lunes, 5, 8);
  const [espacios, [{ nombre: primero }]] = await Promise.all([
    consultar<{ id: number; nombre: string }>("select id, nombre from espacio_taller where activo order by orden"),
    consultar<{ nombre: string }>("select nombre from espacio_taller where activo order by orden limit 1"),
  ]);
  await ingresarComoDueno(page);
  await page.goto(`/panel/agenda?semana=${lunes}`);

  if (info.project.name === "escritorio") {
    const espacio1 = page.getByRole("region", { name: primero });
    const cinta = espacio1.getByRole("link", { name: new RegExp(`^TB29${s}1`) });
    await expect(cinta).toBeVisible();
    // Abarca dos columnas: el martes y el miércoles
    await expect(cinta).toHaveCSS("grid-column-start", "3");
    await expect(cinta).toHaveCSS("grid-column-end", "span 2");
    // La que sigue la semana siguiente lo dice
    await expect(page.getByRole("link", { name: new RegExp(`^TB29${s}2.*sigue la semana siguiente`) })).toBeVisible();

    // La semana siguiente: la misma reserva, que viene de la anterior
    await page.getByRole("link", { name: "Semana siguiente", exact: true }).click();
    await expect(page).toHaveURL(/\?semana=\d{4}-\d{2}-\d{2}$/);
    await expect(page.getByRole("link", { name: new RegExp(`^TB29${s}2.*sigue desde la semana anterior`) })).toBeVisible();
    await page.getByRole("link", { name: "Semana anterior", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`\\?semana=${lunes}$`));

    // Un día libre: el jueves del primer espacio lleva a reservar ese día en ese espacio
    const [{ jueves }] = await consultar<{ jueves: string }>("select to_char($1::date + 3, 'YYYY-MM-DD') as jueves", [lunes]);
    await espacio1.getByRole("link", { name: new RegExp(`^Reservar en ${primero} el Jueves.*, libre$`) }).click();
    await expect(page).toHaveURL(new RegExp(`/panel/agenda/nueva\\?fecha=${jueves}&espacio=${espacios[0].id}(?:[?&]volver=[^&#]*)?$`));
  } else {
    // Celular: un día a la vez. El martes, la reserva en el primer espacio y los demás libres
    // El martes tiene una reserva: su día lo dice (en la tira, un punto debajo del número)
    const pestanas = page.getByRole("navigation", { name: "Días de la semana" }).getByRole("link");
    await expect(pestanas.nth(1)).toHaveAccessibleName(/, 1 reserva$/);
    // Y no todas: un día sin reservas lo dice
    const nombres = await pestanas.evaluateAll((ps) => ps.map((p) => p.getAttribute("aria-label") ?? ""));
    expect(nombres.some((n) => n.endsWith(", sin reservas") || n.endsWith(", cerrado"))).toBe(true);
    await page.getByRole("navigation", { name: "Días de la semana" }).getByRole("link").nth(1).click();
    await expect(page).toHaveURL(/&dia=\d{4}-\d{2}-\d{2}$/);
    const dia = page.getByRole("list", { name: /^Espacios el Martes/ });
    await expect(dia.getByRole("link", { name: new RegExp(`^TB29${s}1`) })).toBeVisible();
    // Los espacios libres, juntos en una sola fila con "Reservar"
    await expect(dia.getByRole("link", { name: /Reservar/ })).toHaveCount(1);
    // Tocar la reserva la abre
    await dia.getByRole("link", { name: new RegExp(`^TB29${s}1`) }).click();
    await expect(page).toHaveURL(/\/panel\/agenda\/\d+(?:[?&]volver=[^&#]*)?$/);
    await expect(page.getByRole("heading", { level: 1, name: `TB29${s}1` })).toBeVisible();
  }
});

test("el tablero arranca en la semana de hoy y la marca", async ({ page }, info) => {
  await ingresarComoDueno(page);
  await page.goto("/panel/agenda");
  // La guía de colores: los cinco estados, en el orden del trabajo, y el día cerrado (16/11). En el celular no va: cada
  // reserva ya dice su estado escrito
  const guia = page.getByRole("list", { name: "Colores de la agenda" });
  if (info.project.name === "escritorio") await expect(guia.getByRole("listitem")).toHaveText(["Reservada", "Recibida", "En proceso", "Lista", "Entregada", "Cerrado"]);
  else await expect(guia).toBeHidden();
  if (info.project.name === "escritorio") await expect(page.getByText("Hoy", { exact: true })).toBeVisible();
  // En el celular, la pestaña de hoy es la elegida (pulido 10.1: ya no se repite el día debajo)
  else await expect(page.getByRole("navigation", { name: "Días de la semana" }).getByRole("link", { name: /, hoy(,|$)/ })).toHaveAttribute("aria-current", "date");
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
  // El viernes del primer espacio: el martes y el miércoles son de la primera prueba y el jueves queda libre para ella
  await reserva(placa, 0, lunes, 4, 4);
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
