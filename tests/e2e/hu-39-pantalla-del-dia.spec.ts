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

/** Las listas del inicio (19/11): "Urgente", "Hoy" y "Pendientes"; y la línea con los números del día. */
const lista = (page: Page, nombre: "Urgente" | "Hoy" | "Pendientes") => page.getByRole("region", { name: nombre }).getByRole("list", { name: nombre });
const bienvenida = (page: Page) => page.getByRole("region", { name: /^(Buenos días|Buenas tardes|Buenas noches), / });

test("el dueño ve lo atrasado en Urgente, lo de hoy en Hoy con su acción directa y lo que espera en Pendientes", async ({ page }, info) => {
  const { placas, ids } = await prepararDia(info);
  await ingresarComoDueno(page);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^(Buenos días|Buenas tardes|Buenas noches), /);

  const fila = (nombre: "Urgente" | "Hoy", placa: string) => lista(page, nombre).getByRole("listitem").filter({ hasText: placa });
  // Hoy: la reserva de hoy, sin atraso, y su acción va directo a recibirla
  await expect(fila("Hoy", placas.hoy)).toContainText("Reservada");
  await expect(fila("Hoy", placas.hoy)).not.toContainText("Atrasada");
  await expect(fila("Hoy", placas.hoy).getByRole("link", { name: `Recibir ${placas.hoy}` })).toHaveAttribute("href", `/panel/ordenes/${ids.hoy}/recibir?volver=%2Fpanel`);
  // Urgente: la reserva que no llegó y la orden atrasada, con una sola insignia que dice el atraso
  await expect(fila("Urgente", placas.atrasado)).toContainText("Atrasada 2 días: debía ingresar el ");
  await expect(fila("Urgente", placas.entrega)).toContainText("Atrasada 4 días: debía entregarse el ");
  await expect(fila("Urgente", placas.entrega)).toContainText("En proceso");
  await expect(lista(page, "Hoy").getByRole("listitem").filter({ hasText: placas.atrasado })).toHaveCount(0);
  // La lista sin avisar, en Hoy, con "Avisar por WhatsApp" ahí mismo
  await expect(fila("Hoy", placas.lista)).toContainText("Sin avisar");
  await expect(fila("Hoy", placas.lista).getByRole("button", { name: "Avisar por WhatsApp" })).toBeVisible();
  // Los números del día, cada uno a su lista; los mantenimientos vencidos, en Pendientes
  // La bienvenida: el día en una frase, con los atrasos, y los números del dueño, cada uno a su lista
  await expect(bienvenida(page)).toContainText(/Hay \d+ atrasados? que conviene mirar primero\./);
  await expect(bienvenida(page).getByRole("link", { name: /^En el taller \d+/ })).toHaveAttribute("href", "/panel/ordenes");
  await expect(bienvenida(page).getByRole("link", { name: /^Por cobrar [\d.,]+ Bs/ })).toHaveAttribute("href", "/panel/pagos");
  await expect(bienvenida(page).getByRole("link", { name: /^Cobrado este mes [\d.,]+ Bs/ })).toHaveAttribute("href", "/panel/reportes");
  // La orden atrasada, con su botón a la orden
  await expect(fila("Urgente", placas.entrega).getByRole("link", { name: `Ver la orden de ${placas.entrega}` })).toHaveAttribute("href", `/panel/ordenes/${ids.entrega}?volver=%2Fpanel`);
  await expect(lista(page, "Pendientes").getByRole("link", { name: /^\d+ mantenimientos? vencidos?/ })).toBeVisible();
  // Sus dos tareas de todos los días
  await expect(page.getByRole("link", { name: "Nueva reserva" })).toHaveAttribute("href", "/panel/agenda/nueva?volver=%2Fpanel");
  await expect(page.getByRole("link", { name: "Nueva cotización" })).toHaveAttribute("href", "/panel/cotizaciones/nueva?volver=%2Fpanel");

  // Toda la fila (menos su acción) lleva a la pantalla del trabajo
  await fila("Hoy", placas.hoy).getByRole("link", { name: new RegExp(`^${placas.hoy}`) }).click();
  await expect(page).toHaveURL(new RegExp(`/panel/agenda/${ids.hoy}(?:[?&]volver=[^&#]*)?$`));
  await page.goto("/panel");
  await fila("Urgente", placas.entrega).getByRole("link", { name: new RegExp(`^${placas.entrega}`) }).click();
  await expect(page).toHaveURL(new RegExp(`/panel/ordenes/${ids.entrega}(?:[?&]volver=[^&#]*)?$`));
});

test("un encargado solo con Agenda ve solo lo que llega, sin montos; el perfil Taller, también el taller", async ({ page }, info) => {
  const s = sufijo(info).toLowerCase();
  await crearUsuario({ usuario: `enc-hu39-${s}`, nombre: "Encargada de agenda", contrasena: "encargado-123", rol: "encargado", permisos: ["agenda"] });
  await ingresar(page, `enc-hu39-${s}`, "encargado-123");
  await expect(page).toHaveURL(/\/panel$/);
  await expect(page.getByRole("heading", { level: 2, name: "Hoy", exact: true })).toBeVisible();
  // Solo lo que llega: ni los números ni las entregas
  await expect(bienvenida(page)).toContainText(/Hoy (llegan? \d+ vehículos?|no llega ningún vehículo)\./);
  await expect(bienvenida(page).getByRole("link", { name: /^(En el taller|Por cobrar|Cobrado)/ })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Pendientes" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Nueva cotización" })).toHaveCount(0);
  await expect(page.getByRole("main")).not.toContainText(/\bBs\b|\+591/);

  await page.context().clearCookies();
  await crearUsuario({ usuario: `taller-hu39-${s}`, nombre: "Chico del taller", contrasena: "taller-123", rol: "encargado", permisos: PERFIL_TALLER });
  await ingresar(page, `taller-hu39-${s}`, "taller-123");
  await expect(page).toHaveURL(/\/panel$/);
  // Pedido 32: el mismo inicio que el encargado, con lo de su taller y sin montos (no tiene Pagos ni Cotizaciones)
  await expect(bienvenida(page).getByRole("link", { name: /^(En el taller|Por cobrar|Cobrado)/ })).toHaveText([/^En el taller/]);
  await expect(page.getByRole("heading", { name: "Pendientes" })).toHaveCount(0);
  await expect(page.getByRole("main")).not.toContainText(/\bBs\b/);
});

test("a 360 px no se sale nada", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await ingresarComoDueno(page);
  await expect(page.getByRole("heading", { name: "Hoy", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(360);
});
