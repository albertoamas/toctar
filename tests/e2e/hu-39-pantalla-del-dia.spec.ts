import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { consultar, crearClienteEnBase, crearUsuario, ingresar, ingresarComoDueno, PERFIL_TALLER } from "./apoyo";

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

/** "Para hoy" (pedido 26): lo que llega, lo que se entrega y lo que espera aviso, en una tabla. */
const delDia = (page: Page) => page.getByRole("region", { name: "Para hoy" }).getByRole("list", { name: "Para hoy" });
const resumen = (page: Page) => page.getByRole("region", { name: "Resumen de hoy" });

test("el dueño ve los números del día, lo que llega (y el atrasado), las entregas y las listas sin avisar; cada fila lleva a su pantalla", async ({ page }, info) => {
  const { placas, ids } = await prepararDia(info);
  await ingresarComoDueno(page);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^Hola, /);

  const fila = (placa: string) => delDia(page).getByRole("link", { name: new RegExp(`^${placa}`) });
  await expect(fila(placas.hoy)).toContainText("Reservada");
  await expect(fila(placas.hoy)).not.toContainText("Debía ingresar");
  await expect(fila(placas.atrasado)).toContainText(`Debía ingresar el ${dia(-2).corta}`);
  await expect(fila(placas.entrega)).toContainText(`Atrasada desde el ${dia(-4).corta}`);
  await expect(fila(placas.entrega)).toContainText("En proceso");
  await expect(fila(placas.lista)).toContainText("Sin avisar");
  // Los números del día, cada uno a su lista; el dueño ve lo que hay por cobrar
  await expect(resumen(page).getByRole("link", { name: /^En el taller \d+/ })).toHaveAttribute("href", "/panel/ordenes");
  await expect(resumen(page).getByRole("link", { name: /^Mantenimientos \d+/ })).toHaveAttribute("href", "/panel/mantenimientos");
  await expect(resumen(page).getByRole("link", { name: /^Por cobrar [\d.,]+ Bs/ })).toBeVisible();
  await expect(page.getByRole("region", { name: "Para atender" }).getByRole("link", { name: /mantenimientos? vencidos?/ })).toBeVisible();
  // Sus dos tareas de todos los días
  await expect(page.getByRole("link", { name: "Nueva reserva" })).toHaveAttribute("href", "/panel/agenda/nueva?volver=%2Fpanel");
  await expect(page.getByRole("link", { name: "Nueva cotización" })).toHaveAttribute("href", "/panel/cotizaciones/nueva?volver=%2Fpanel");

  await fila(placas.hoy).click();
  await expect(page).toHaveURL(new RegExp(`/panel/agenda/${ids.hoy}(?:[?&]volver=[^&#]*)?$`));
  await page.goto("/panel");
  await fila(placas.entrega).click();
  await expect(page).toHaveURL(new RegExp(`/panel/ordenes/${ids.entrega}(?:[?&]volver=[^&#]*)?$`));
});

test("un encargado solo con Agenda ve solo lo que llega, sin montos; el perfil Taller, también el taller", async ({ page }, info) => {
  const s = sufijo(info).toLowerCase();
  await crearUsuario({ usuario: `enc-hu39-${s}`, nombre: "Encargada de agenda", contrasena: "encargado-123", rol: "encargado", permisos: ["agenda"] });
  await ingresar(page, `enc-hu39-${s}`, "encargado-123");
  await expect(page).toHaveURL(/\/panel$/);
  await expect(page.getByRole("heading", { level: 2, name: "Para hoy" })).toBeVisible();
  await expect(resumen(page).getByRole("link")).toHaveText([/^Llegan hoy/]);
  await expect(page.getByRole("heading", { name: "Para atender" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Nueva cotización" })).toHaveCount(0);
  await expect(page.getByRole("main")).not.toContainText(/\bBs\b|\+591/);

  await page.context().clearCookies();
  await crearUsuario({ usuario: `taller-hu39-${s}`, nombre: "Chico del taller", contrasena: "taller-123", rol: "encargado", permisos: PERFIL_TALLER });
  await ingresar(page, `taller-hu39-${s}`, "taller-123");
  await expect(page).toHaveURL(/\/panel$/);
  // Pedido 32: el mismo inicio que el encargado, con lo de su taller y sin montos (no tiene Pagos ni Cotizaciones)
  await expect(resumen(page).getByRole("link")).toHaveText([/^En el taller/, /^Llegan hoy/]);
  await expect(page.getByRole("heading", { name: "Para atender" })).toHaveCount(0);
  await expect(page.getByRole("main")).not.toContainText(/\bBs\b/);
});

test("a 360 px no se sale nada", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await ingresarComoDueno(page);
  await expect(page.getByRole("heading", { name: "Para hoy" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(360);
});
