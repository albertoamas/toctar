import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { consultar, crearClienteEnBase, crearUsuario, ingresar, ingresarComoDueno } from "./apoyo";

// HU-39 Pantalla del día. Especificación: docs/08-desarrollo/etapas/C5-cierre-entrega-2.md §9.
// Los trabajos van directo a la base, en días cercanos a hoy (es lo que muestra el inicio). Para no chocar con las
// reservas de otras pruebas, en un espacio propio y desactivado, uno por proyecto y por intento. Otras pruebas también
// dejan trabajos de hoy: se buscan las filas propias por su placa, no se cuentan.

const sufijo = (info: TestInfo) => `${info.project.name === "celular" ? "C" : "E"}${info.retry}`;
const hoy = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/La_Paz" }).format(new Date());
/** La fecha a `n` días de hoy (AAAA-MM-DD) y cómo se muestra ("21/10"). */
function dia(n: number) {
  const fecha = new Date(`${hoy()}T12:00:00Z`);
  fecha.setUTCDate(fecha.getUTCDate() + n);
  const iso = fecha.toISOString().slice(0, 10);
  return { iso, corta: `${iso.slice(8, 10)}/${iso.slice(5, 7)}` };
}

/** Un trabajo del vehículo, en el espacio y los días dados, con el estado dado. Devuelve su id. */
async function trabajo(placa: string, espacio: number, desde: number, hasta: number, estado: string): Promise<number> {
  const [{ id }] = await consultar<{ id: number }>(
    `insert into trabajo (sucursal_id, cliente_id, vehiculo_id, espacio_id, fecha_inicio, fecha_fin, estado, recibido_at, listo_at, created_by)
     select e.sucursal_id, v.cliente_id, v.id, e.id, $3::date, $4::date, $5,
       case when $5 = 'agendado' then null else now() end, case when $5 = 'listo' then now() end, v.created_by
     from vehiculo v, espacio_taller e where v.placa = $1 and e.id = $2 returning id`,
    [placa, espacio, dia(desde).iso, dia(hasta).iso, estado],
  );
  return id;
}

async function prepararDia(info: TestInfo) {
  const s = sufijo(info);
  const [{ id: espacio }] = await consultar<{ id: number }>(
    `insert into espacio_taller (sucursal_id, nombre, orden, activo) select sucursal_id, $1, 91, false from espacio_taller limit 1 returning id`,
    [`Espacio HU-39 ${s}`],
  );
  const placas = { hoy: `DI39${s}A`, atrasado: `DI39${s}B`, entrega: `DI39${s}C`, lista: `DI39${s}D` };
  for (const [n, placa] of Object.values(placas).entries()) {
    await crearClienteEnBase({ nombre: `Cliente del día ${s} ${n}`, telefono: `5917${info.project.name === "celular" ? 5 : 6}39${info.retry}0${n}0`, placa });
  }
  // Días separados en el mismo espacio: un espacio no tiene dos trabajos el mismo día (RN-06)
  const ids = {
    hoy: await trabajo(placas.hoy, espacio, 0, 1, "agendado"),
    atrasado: await trabajo(placas.atrasado, espacio, -2, -2, "agendado"),
    entrega: await trabajo(placas.entrega, espacio, -5, -4, "en_proceso"),
    lista: await trabajo(placas.lista, espacio, -7, -6, "listo"),
  };
  // Un mantenimiento vencido, del vehículo de la entrega
  await consultar(
    `insert into recordatorio_mantenimiento (trabajo_origen_id, cliente_id, vehiculo_id, servicio_id, servicio_mantenimiento_id, intervalo_meses, fecha_programada)
     select id, cliente_id, vehiculo_id, (select id from servicio where slug = 'pulido-y-nano-ceramico'), (select id from servicio where slug = 'mantenimiento-del-nano-ceramico'), 3, $2::date
     from trabajo where id = $1`,
    [ids.entrega, dia(-10).iso],
  );
  return { placas, ids };
}

const bloque = (page: Page, titulo: string) => page.getByRole("region", { name: titulo });

test("el dueño ve lo del día: ingresos (y el atrasado), entregas, listas sin avisar y mantenimientos; cada fila lleva a su pantalla", async ({ page }, info) => {
  const { placas, ids } = await prepararDia(info);
  await ingresarComoDueno(page);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^Hola, /);

  const ingresos = bloque(page, "Ingresos de hoy");
  await expect(ingresos.getByRole("link", { name: new RegExp(`^${placas.hoy}`) })).not.toContainText("Debía ingresar");
  await expect(ingresos.getByRole("link", { name: new RegExp(`^${placas.atrasado}`) })).toContainText(`Debía ingresar el ${dia(-2).corta}`);
  await expect(bloque(page, "Entregas de hoy").getByRole("link", { name: new RegExp(`^${placas.entrega}`) })).toContainText(`Atrasada desde el ${dia(-4).corta}`);
  // Con el aviso, también su estado (pulido 9.1: la fila muestra los dos)
  await expect(bloque(page, "Entregas de hoy").getByRole("link", { name: new RegExp(`^${placas.entrega}`) })).toContainText("En proceso");
  await expect(bloque(page, "Listas sin avisar").getByRole("link", { name: new RegExp(`^${placas.lista}`) })).toBeVisible();
  await expect(bloque(page, "Mantenimientos por avisar").getByRole("link", { name: /^\d+ vencidos?, \d+ próximos?/ })).toBeVisible();
  // Sin montos ni teléfonos (RN-12)
  await expect(page.getByRole("main")).not.toContainText(/\bBs\b|\+591/);
  await expect(page.getByRole("navigation", { name: "Ir a" }).getByRole("link", { name: /^Agenda/ })).toBeVisible();

  // Cada fila, a su pantalla: el ingreso a la reserva, la entrega a la orden
  await ingresos.getByRole("link", { name: new RegExp(`^${placas.hoy}`) }).click();
  await expect(page).toHaveURL(new RegExp(`/panel/agenda/${ids.hoy}$`));
  await page.goto("/panel");
  await bloque(page, "Entregas de hoy").getByRole("link", { name: new RegExp(`^${placas.entrega}`) }).click();
  await expect(page).toHaveURL(new RegExp(`/panel/ordenes/${ids.entrega}$`));
});

test("un encargado solo con Agenda ve solo los ingresos; el técnico sigue con sus órdenes", async ({ page }, info) => {
  const s = sufijo(info).toLowerCase();
  await crearUsuario({ usuario: `enc-hu39-${s}`, nombre: "Encargada de agenda", contrasena: "encargado-123", rol: "encargado", permisos: ["agenda"] });
  await ingresar(page, `enc-hu39-${s}`, "encargado-123");
  await expect(page).toHaveURL(/\/panel$/);
  await expect(page.getByRole("heading", { level: 2, name: "Ingresos de hoy" })).toBeVisible();
  for (const otro of ["Reclamos pendientes", "Entregas de hoy", "Listas sin avisar", "Mantenimientos por avisar"]) {
    await expect(page.getByRole("heading", { name: otro })).toHaveCount(0);
  }

  await page.context().clearCookies();
  await crearUsuario({ usuario: `tec-hu39-${s}`, nombre: "Técnico del día", contrasena: "tecnico-123", rol: "tecnico" });
  await ingresar(page, `tec-hu39-${s}`, "tecnico-123");
  await expect(page).toHaveURL(/\/panel$/);
  await expect(page.getByRole("navigation", { name: "Ir a" }).getByRole("link")).toHaveText([/^Mis órdenes/]);
  await expect(page.getByRole("main").getByRole("heading", { level: 2 })).toHaveCount(0);
});

test("a 360 px no se sale nada", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await ingresarComoDueno(page);
  await expect(page.getByRole("heading", { name: "Ingresos de hoy" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(360);
});
