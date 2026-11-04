import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { consultar, crearClienteEnBase, crearUsuario, ingresar, ingresarComoDueno } from "./apoyo";

// Pedido 31: un trabajo, de la cotización a la entrega (etapas/P31-flujo-de-un-trabajo.md §9). "Aceptó, sin fecha",
// reservar después, la Nueva reserva que ofrece las cotizaciones del cliente, el "Volver" a la cotización y los pasos.
// En serie: las del dueño entran con el mismo usuario.
test.describe.configure({ mode: "serial" });

const sufijo = (info: TestInfo) => `${info.project.name === "celular" ? "C" : info.project.name === "iphone" ? "I" : "E"}${info.retry || ""}`;
const telefono = (info: TestInfo, n: number) => `5917${info.project.name === "celular" ? 1 : 2}31${info.retry}0${n}0`;

/**
 * Un día propio de cada prueba, dentro del año que se puede reservar y lejos de los de otras pruebas (hu-30 usa hasta
 * los 320 días): no choca en los espacios.
 */
async function diaPropio(info: TestInfo, n: number): Promise<string> {
  const [{ dia }] = await consultar<{ dia: string }>("select to_char(current_date + $1::int, 'YYYY-MM-DD') as dia", [
    (info.project.name === "celular" ? 345 : 355) + n * 2 + info.retry,
  ]);
  return dia;
}

/** Una cotización pendiente de 700 Bs, con una línea de un servicio propio, para un cliente nuevo. */
async function cotizacionPendiente(info: TestInfo, n: number): Promise<{ consultaId: number; cotizacionId: number; clienteId: number; vehiculoId: number; numero: string; cliente: string }> {
  const s = sufijo(info);
  const servicio = `Flujo ${s}`;
  await consultar(
    `with sv as (
       insert into servicio (nombre, slug, resumen, orden, duracion_dias) values ($1, $2, 'Servicio de prueba del flujo.', 99, 1)
       on conflict do nothing returning id
     ), v as (insert into variante (servicio_id, nombre, orden) select id, 'Única', 1 from sv returning id)
     insert into precio (variante_id, tamano_id, monto, created_by)
     select v.id, (select id from tamano_vehiculo order by orden limit 1), 700, (select id from usuario where nombre_usuario = 'dueno') from v`,
    [servicio, `flujo-${s.toLowerCase()}`],
  );
  const cliente = `Flujo ${n} ${s}`;
  const placa = `FL31${s}${n}`;
  const clienteId = await crearClienteEnBase({ nombre: cliente, telefono: telefono(info, n), placa });
  const numero = `2031-${s}${n}`;
  const [c] = await consultar<{ consulta: number; cotizacion: number; vehiculo: number }>(
    `with q as (
       insert into consulta (cliente_id, vehiculo_id, estado, created_by)
       select v.cliente_id, v.id, 'cotizado', v.created_by from vehiculo v where v.placa = $1 returning id, vehiculo_id, created_by
     ), c as (
       insert into cotizacion (consulta_id, numero, version, es_estimado, subtotal, descuento, total, adelanto_sugerido, valida_hasta,
         condiciones, garantia, formas_pago, datos_documento, created_by)
       select q.id, $2, 1, false, 700, 0, 700, 0, current_date + 15, 'c', 'g', 'f', '{}'::jsonb, q.created_by from q returning id
     ), l as (
       insert into cotizacion_linea (cotizacion_id, variante_id, tamano_id, descripcion, precio_sugerido, precio, orden)
       select c.id, (select v.id from variante v join servicio s on s.id = v.servicio_id where s.nombre = $3),
         (select id from tamano_vehiculo order by orden limit 1), $3, 700, 700, 0 from c returning cotizacion_id
     )
     select (select id from q) as consulta, (select cotizacion_id from l) as cotizacion, (select vehiculo_id from q) as vehiculo`,
    [placa, numero, servicio],
  );
  return { consultaId: c.consulta, cotizacionId: c.cotizacion, clienteId, vehiculoId: c.vehiculo, numero, cliente };
}

const pasoActual = (page: Page) => page.getByRole("navigation", { name: "Pasos del trabajo" }).locator('[aria-current="step"]');

/** Elige un espacio libre y reserva sin adelanto (o con efectivo, si hay que elegir el método). */
async function reservar(page: Page, dia: string) {
  await page.getByLabel("Ingresa el").fill(dia);
  const espacio = page.getByLabel("Espacio", { exact: true });
  await expect(espacio).toBeEnabled();
  await espacio.selectOption({ index: 1 });
  const sinAdelanto = page.getByRole("checkbox", { name: "Sin adelanto" });
  if (await sinAdelanto.count()) await sinAdelanto.check();
  await page.getByRole("button", { name: "Agendar" }).click();
  await expect(page).toHaveURL(/\/panel\/agenda\/\d+\?agendada=1$/);
}

test("«Aceptó, sin fecha» la deja en Aceptadas e Inicio; después se reserva y «Volver» lleva a la cotización", async ({ page }, info) => {
  const c = await cotizacionPendiente(info, 1);
  const dia = await diaPropio(info, 1);
  await ingresarComoDueno(page);
  await page.goto(`/panel/cotizaciones/${c.consultaId}`);
  // Pendiente: los pasos en "Cotizada" y el paso siguiente, uno solo
  await expect(pasoActual(page)).toContainText("Cotizada");
  await expect(page.getByRole("link", { name: "Aceptó: reservar" })).toHaveAttribute("href", `/panel/agenda/nueva?cotizacion=${c.cotizacionId}`);

  await page.getByRole("button", { name: "Aceptó, sin fecha" }).click();
  await page.getByRole("button", { name: "Sí, aceptada" }).click();
  await expect(page.getByText("Cotización aceptada. Resérvala cuando el cliente tenga fecha.")).toBeVisible();
  await expect(page.getByRole("main").getByText("Sin fecha", { exact: true })).toBeVisible();
  await expect(pasoActual(page)).toContainText("Aceptada");
  await expect(page.getByRole("link", { name: "Aceptó: reservar" })).toHaveCount(0);
  const [antes] = await consultar<{ con: string; cot: string }>(
    "select q.estado as con, c.estado as cot from consulta q join cotizacion c on c.consulta_id = q.id where q.id = $1",
    [c.consultaId],
  );
  expect(antes).toEqual({ con: "confirmado", cot: "aceptada" });

  // En Aceptadas, con "Sin fecha"; en Inicio, para reservarla
  await page.goto("/panel/cotizaciones?vista=aceptadas");
  await expect(page.getByRole("link").filter({ hasText: c.numero })).toContainText("Sin fecha");
  await page.goto("/panel");
  const enInicio = page.getByRole("link").filter({ hasText: `Cotización aceptada de ${c.cliente}` });
  await expect(enInicio).toContainText("Reservar");

  // Reservar: "Volver" a la cotización, el aviso dice qué pasó y la reserva queda en "Reservada"
  await page.goto(`/panel/cotizaciones/${c.consultaId}`);
  await page.getByRole("link", { name: "Reservar", exact: true }).click();
  await expect(page.getByRole("link", { name: `Cotización ${c.numero}` })).toHaveAttribute("href", `/panel/cotizaciones/${c.consultaId}`);
  await reservar(page, dia);
  await expect(page.getByText(`La cotización ${c.numero} quedó aceptada.`)).toBeVisible();
  await expect(pasoActual(page)).toContainText("Reservada");

  // Ya reservada: no se vuelve a reservar ni a cambiar desde la cotización
  await page.goto(`/panel/cotizaciones/${c.consultaId}`);
  await expect(page.getByRole("link", { name: /reservar/i })).toHaveCount(0);
  await expect(page.getByRole("main").getByText("Sin fecha", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Más" })).toHaveCount(0);
});

test("una aceptada sin fecha vuelve a pendiente desde «Más», con su versión vigente", async ({ page }, info) => {
  const c = await cotizacionPendiente(info, 2);
  await ingresarComoDueno(page);
  await page.goto(`/panel/cotizaciones/${c.consultaId}`);
  await page.getByRole("button", { name: "Aceptó, sin fecha" }).click();
  await page.getByRole("button", { name: "Sí, aceptada" }).click();
  await expect(page.getByRole("main").getByText("Sin fecha", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Más" }).click();
  await page.getByRole("menuitem", { name: "Volver a pendiente" }).click();
  await page.getByRole("button", { name: "Sí, volver a pendiente" }).click();
  await expect(page.getByText("La cotización volvió a pendiente.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Aceptó: reservar" })).toBeVisible();
  const [r] = await consultar<{ con: string; cot: string }>(
    "select q.estado as con, c.estado as cot from consulta q join cotizacion c on c.consulta_id = q.id where q.id = $1",
    [c.consultaId],
  );
  expect(r).toEqual({ con: "cotizado", cot: "enviada" });
});

test("Nueva reserva ofrece las cotizaciones del vehículo: los precios llegan sin escribirlos", async ({ page }, info) => {
  const c = await cotizacionPendiente(info, 3);
  const dia = await diaPropio(info, 3);
  await ingresarComoDueno(page);
  await page.goto(`/panel/agenda/nueva?cliente=${c.clienteId}&vehiculo=${c.vehiculoId}`);
  const suyas = page.getByRole("list", { name: "Sus cotizaciones" });
  await expect(suyas.getByRole("link")).toHaveCount(1);
  await expect(suyas).toContainText("700 Bs");
  // También se puede armar una sin cotización
  await expect(page.getByRole("heading", { name: "O una reserva sin cotización" })).toBeVisible();
  await suyas.getByRole("link").click();
  await expect(page).toHaveURL(new RegExp(`cotizacion=${c.cotizacionId}$`));
  await expect(page.getByRole("region", { name: new RegExp(`^Cotización ${c.numero}`) })).toContainText("700 Bs");
  await reservar(page, dia);
  const [r] = await consultar<{ lineas: number; con: string }>(
    "select (select count(*)::int from trabajo_linea l where l.trabajo_id = t.id) as lineas, q.estado as con from trabajo t join consulta q on q.id = t.consulta_id where t.cotizacion_id = $1",
    [c.cotizacionId],
  );
  expect(r).toEqual({ lineas: 1, con: "confirmado" });
  // Reservada, ya no se ofrece
  await page.goto(`/panel/agenda/nueva?cliente=${c.clienteId}&vehiculo=${c.vehiculoId}`);
  await expect(page.getByRole("list", { name: "Sus cotizaciones" })).toHaveCount(0);
});

test("el encargado sin Pagos elige al cliente y reserva su cotización, sin ver montos", async ({ page }, info) => {
  const c = await cotizacionPendiente(info, 4);
  const dia = await diaPropio(info, 4);
  const usuario = `enc-p31-${sufijo(info).toLowerCase()}`;
  await crearUsuario({ usuario, nombre: "Encargado del flujo", contrasena: "encargado-123", rol: "encargado", permisos: ["agenda"] });
  await ingresar(page, usuario, "encargado-123");
  await expect(page).toHaveURL(/\/panel$/);
  await page.goto(`/panel/agenda/nueva?cliente=${c.clienteId}&vehiculo=${c.vehiculoId}`);
  const suyas = page.getByRole("list", { name: "Sus cotizaciones" });
  await expect(suyas.getByRole("link")).toHaveCount(1);
  await expect(suyas).not.toContainText("Bs");
  // Sin Pagos no arma una sin cotización
  await expect(page.getByRole("heading", { name: "O una reserva sin cotización" })).toHaveCount(0);
  await suyas.getByRole("link").click();
  // Sin Cotizaciones, "Volver" lleva a la Agenda
  await expect(page.getByRole("main").getByRole("link", { name: "Agenda", exact: true })).toBeVisible();
  await reservar(page, dia);
  await expect(page.getByText(/Bs/)).toHaveCount(0);
});
