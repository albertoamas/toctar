import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { consultar, crearClienteEnBase, crearCotizacionEnBase, ingresarComoDueno, verPorReservar } from "./apoyo";

// Hallazgo 9 de la prueba en celulares (15/11, 08-desarrollo/hallazgos-prueba-celulares.md): Nueva reserva es una sola
// pantalla para los tres caminos y solo cambia la dirección. Al reservar un mantenimiento, salir sin guardar (con Atrás o
// con "Volver") y entrar a reservar otro, el formulario traía lo llenado en el anterior: el servicio con su precio, la
// fecha y el espacio. Ahora empieza de cero cada vez que cambia lo que se reserva. Nunca se envía: no ocupa espacios.
test.describe.configure({ mode: "serial" });

const sufijo = (info: TestInfo) => (info.project.name === "celular" ? "C" : "E");
const telefono = (info: TestInfo, n: number) => `5917${info.project.name === "celular" ? 7 : 8}53${info.retry}0${n}0`;
/** Hoy en Bolivia (la base corre en UTC: de noche ya sería mañana). */
const hoy = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/La_Paz" }).format(new Date());

/** Un recordatorio vencido de "Pulido y nano cerámico" para el vehículo de esa placa. Devuelve su id. */
async function recordatorio(placa: string): Promise<number> {
  const [{ id }] = await consultar<{ id: number }>(
    `with t as (
       insert into trabajo (sucursal_id, cliente_id, vehiculo_id, espacio_id, fecha_inicio, fecha_fin, estado, recibido_at, listo_at, entregado_at, created_by)
       select e.sucursal_id, v.cliente_id, v.id, e.id, (now() at time zone 'America/La_Paz')::date - 100, (now() at time zone 'America/La_Paz')::date - 100, 'entregado', now(), now(), now() - interval '100 days', v.created_by
       from vehiculo v, (select * from espacio_taller where activo order by orden limit 1) e where v.placa = $1 returning id, cliente_id, vehiculo_id
     )
     insert into recordatorio_mantenimiento (trabajo_origen_id, cliente_id, vehiculo_id, servicio_id, servicio_mantenimiento_id, intervalo_meses, fecha_programada)
     select t.id, t.cliente_id, t.vehiculo_id, (select id from servicio where slug = 'pulido-y-nano-ceramico'),
       (select id from servicio where slug = 'mantenimiento-del-nano-ceramico'), 3, $2::date - 5 from t returning id`,
    [placa, hoy()],
  );
  return id;
}

const precio = (page: Page) => page.getByLabel("Precio del servicio 1");
const fila = (page: Page, placa: string) => page.getByRole("list", { name: "Vencidos" }).getByRole("listitem").filter({ hasText: placa });

/** Llena el mantenimiento hasta la fecha y el espacio, sin reservar. */
async function llenar(page: Page) {
  await expect(precio(page)).toBeEnabled();
  await precio(page).fill("350");
  await page.getByRole("button", { name: "Siguiente: fecha y adelanto" }).click();
  const [{ d }] = await consultar<{ d: string }>("select to_char($1::date + 30, 'YYYY-MM-DD') as d", [hoy()]);
  await page.getByLabel("Ingresa el").fill(d);
  const espacio = page.getByLabel("Espacio", { exact: true });
  await expect(espacio).toBeEnabled();
  await espacio.selectOption({ index: 1 });
}

/** Lo de un mantenimiento recién abierto: en Servicios, sin precio, para el cliente de esa placa. */
async function empiezaDeCero(page: Page, nombre: string) {
  await expect(page.getByText(nombre).filter({ visible: true }).first()).toBeVisible();
  await expect(precio(page)).toBeVisible();
  await expect(precio(page)).toHaveValue("");
  await expect(page.getByRole("button", { name: "Siguiente: fecha y adelanto" })).toBeVisible();
}

test("al pasar de un mantenimiento a otro, la reserva empieza de cero (con Atrás y con Volver)", async ({ page }, info) => {
  const s = sufijo(info);
  const [placaA, placaB] = [`RC${s}${info.retry}A`, `RC${s}${info.retry}B`];
  const [nombreA, nombreB] = [`Ana Primera ${s}${info.retry}`, `Beto Segundo ${s}${info.retry}`];
  await crearClienteEnBase({ nombre: nombreA, telefono: telefono(info, 1), placa: placaA });
  await crearClienteEnBase({ nombre: nombreB, telefono: telefono(info, 2), placa: placaB });
  await recordatorio(placaA);
  await recordatorio(placaB);

  await ingresarComoDueno(page);
  await page.goto("/panel/mantenimientos");

  // El primero, a medio llenar, y Atrás del navegador (no pregunta: no se puede detener)
  await fila(page, placaA).getByRole("link", { name: "Reservar" }).click();
  await empiezaDeCero(page, nombreA);
  await llenar(page);
  // Cada paso del formulario es una entrada del historial: Atrás hasta salir de la reserva
  for (let i = 0; i < 4 && !/\/panel\/mantenimientos$/.test(page.url()); i++) {
    const antes = page.url();
    await page.goBack();
    await expect.poll(() => page.url()).not.toBe(antes);
  }
  await expect(page).toHaveURL(/\/panel\/mantenimientos$/);

  // El segundo: su cliente y nada del primero
  await fila(page, placaB).getByRole("link", { name: "Reservar" }).click();
  await empiezaDeCero(page, nombreB);

  // A medio llenar, y "Volver" de la pantalla: pregunta y se sale sin guardar
  await llenar(page);
  await page.locator('main a[href^="/panel/mantenimientos"]').filter({ visible: true }).first().click();
  const pregunta = page.getByRole("alertdialog", { name: "¿Salir sin guardar?" });
  await pregunta.getByRole("button", { name: "Salir sin guardar" }).click();
  await expect(page).toHaveURL(/\/panel\/mantenimientos$/);

  // El primero otra vez: tampoco trae lo del segundo
  await fila(page, placaA).getByRole("link", { name: "Reservar" }).click();
  await empiezaDeCero(page, nombreA);

  // Y el mismo mantenimiento, después de salir sin guardar: tampoco trae lo que se descartó
  await llenar(page);
  await page.locator('main a[href^="/panel/mantenimientos"]').filter({ visible: true }).first().click();
  await pregunta.getByRole("button", { name: "Salir sin guardar" }).click();
  await expect(page).toHaveURL(/\/panel\/mantenimientos$/);
  await fila(page, placaA).getByRole("link", { name: "Reservar" }).click();
  await empiezaDeCero(page, nombreA);
});

test("desde una cotización (Por reservar de la Agenda), también empieza de cero al volver a entrar", async ({ page }, info) => {
  const s = sufijo(info);
  const placa = `RQ${s}${info.retry}A`;
  const nombre = `Cotizada Cero ${s}${info.retry}`;
  await crearClienteEnBase({ nombre, telefono: telefono(info, 3), placa });
  await crearCotizacionEnBase({ placa, numero: `RC-${s}${info.retry}`, estado: "confirmado" });
  await ingresarComoDueno(page);
  const reservar = async () => {
    await page.goto("/panel/agenda");
    await (await verPorReservar(page)).getByRole("link").filter({ hasText: nombre }).click();
    await expect(page.getByLabel("Espacio", { exact: true })).toBeEnabled();
  };

  // A medio llenar: el espacio
  await reservar();
  await page.getByLabel("Espacio", { exact: true }).selectOption({ index: 1 });
  const elegido = await page.getByLabel("Espacio", { exact: true }).inputValue();
  expect(elegido).not.toBe("");
  // "Volver a Agenda", sin guardar
  await page.getByRole("main").getByRole("link", { name: "Volver a Agenda" }).click();
  await page.getByRole("alertdialog", { name: "¿Salir sin guardar?" }).getByRole("button", { name: "Salir sin guardar" }).click();
  await expect(page).toHaveURL(/\/panel\/agenda$/);

  // La misma cotización otra vez: sin el espacio elegido antes
  await (await verPorReservar(page)).getByRole("link").filter({ hasText: nombre }).click();
  await expect(page.getByLabel("Espacio", { exact: true })).toBeEnabled();
  await expect(page.getByLabel("Espacio", { exact: true })).toHaveValue("");
});
