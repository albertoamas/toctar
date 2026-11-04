import { expect, test, type TestInfo } from "@playwright/test";
import { consultar, crearClienteEnBase, crearCotizacionEnBase, ingresarComoDueno } from "./apoyo";

// Pedido 37: un vehículo cambia de dueño (etapas/P37-cambio-de-dueno.md §9). Pasa el mismo vehículo, con su plan de
// mantenimiento; las cotizaciones abiertas del anterior se cierran y lo suyo queda a su nombre. En serie: las del dueño
// entran con el mismo usuario.
test.describe.configure({ mode: "serial" });

const sufijo = (info: TestInfo) => `${info.project.name === "celular" ? "C" : "E"}${info.retry || ""}`;
const telefono = (info: TestInfo, n: number) => `5917${info.project.name === "celular" ? 1 : 2}37${info.retry}0${n}0`;

/** El anterior con su vehículo y el nuevo dueño, sin vehículos. */
async function dosClientes(info: TestInfo, n: number) {
  const s = sufijo(info);
  const placa = `CD37${s}${n}`;
  const anterior = `Anterior ${n} ${s}`;
  const nuevo = `Comprador ${n} ${s}`;
  const anteriorId = await crearClienteEnBase({ nombre: anterior, telefono: telefono(info, n), placa });
  const nuevoId = await crearClienteEnBase({ nombre: nuevo, telefono: telefono(info, n + 5) });
  const [{ vehiculoId }] = await consultar<{ vehiculoId: number }>('select id as "vehiculoId" from vehiculo where placa = $1 and activo', [placa]);
  return { placa, anterior, nuevo, anteriorId, nuevoId, vehiculoId };
}

/** Un mantenimiento por avisar del vehículo, con su trabajo entregado de origen (como lo deja una entrega, P21). */
async function mantenimientoAbierto(placa: string): Promise<number> {
  const [{ id }] = await consultar<{ id: number }>(
    `with t as (
       insert into trabajo (sucursal_id, cliente_id, vehiculo_id, espacio_id, fecha_inicio, fecha_fin, estado, recibido_at, listo_at, entregado_at, created_by)
       select e.sucursal_id, v.cliente_id, v.id, e.id, current_date - 90, current_date - 90, 'entregado', now(), now(), now() - interval '90 days', v.created_by
       from vehiculo v, (select * from espacio_taller where activo order by orden limit 1) e where v.placa = $1 and v.activo returning id, cliente_id, vehiculo_id
     )
     insert into recordatorio_mantenimiento (trabajo_origen_id, cliente_id, vehiculo_id, servicio_id, servicio_mantenimiento_id, intervalo_meses, fecha_programada)
     select t.id, t.cliente_id, t.vehiculo_id, (select id from servicio where slug = 'pulido-y-nano-ceramico'),
       (select id from servicio where slug = 'mantenimiento-del-nano-ceramico'), 3, current_date + 5 from t returning id`,
    [placa],
  );
  return id;
}

test("desde la edición del vehículo: pasa al comprador con su mantenimiento y se cierra la cotización abierta del anterior", async ({ page }, info) => {
  const d = await dosClientes(info, 1);
  const recordatorioId = await mantenimientoAbierto(d.placa);
  // Ya se le avisó al anterior: al comprador todavía no
  await consultar("update recordatorio_mantenimiento set estado = 'avisado', avisado_at = now(), avisado_por = (select id from usuario where nombre_usuario = 'dueno') where id = $1", [recordatorioId]);
  const consultaId = await crearCotizacionEnBase({ placa: d.placa, numero: `2037-${sufijo(info)}1` });
  await ingresarComoDueno(page);
  await page.goto(`/panel/clientes/${d.anteriorId}`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: `Editar ${d.placa}` }).click();
  await page.getByRole("button", { name: "Más" }).click();
  // Con la máquina muy cargada, un toque justo al abrirse el menú puede no contar: se repite mientras el menú siga abierto
  const opcion = page.getByRole("menuitem", { name: "Cambiar de dueño" });
  await expect(async () => {
    if (await opcion.isVisible()) await opcion.click({ timeout: 1000 });
    await expect(page).toHaveURL(/\/dueno$/, { timeout: 1000 });
  }).toPass({ timeout: 10000 });
  await expect(page.getByRole("heading", { name: `Cambiar de dueño ${d.placa}` })).toBeVisible();

  // Se elige al comprador con el buscador de Clientes
  // (el dueño actual no se ofrece)
  await page.goto(`${new URL(page.url()).pathname}?q=${encodeURIComponent(d.anterior)}`);
  await expect(page.getByRole("list", { name: "Elegir cliente" })).toHaveCount(0);
  await page.goto(`${new URL(page.url()).pathname}?q=${encodeURIComponent(d.nuevo)}`);
  await page.getByRole("list", { name: "Elegir cliente" }).getByRole("link").filter({ hasText: d.nuevo }).click();
  await expect(page.getByText(`De ${d.anterior} a ${d.nuevo}.`)).toBeVisible();
  await expect(page.getByText("1 mantenimiento por avisar")).toBeVisible();
  await expect(page.getByText("1 cotización abierta")).toBeVisible();
  await page.getByRole("button", { name: "Cambiar de dueño" }).click();

  await expect(page).toHaveURL(new RegExp(`/panel/clientes/${d.nuevoId}\\?recibido=${d.placa}$`));
  await expect(page.getByText(`${d.placa} ahora es de ${d.nuevo}, con su plan de mantenimiento.`)).toBeVisible();
  await expect(page.getByRole("list", { name: "Vehículos" })).toContainText(d.placa);

  const [r] = await consultar<{ vehiculo: number; recordatorio: number; consulta: string; detalle: string; cotizacion: string; auditoria: number }>(
    `select (select cliente_id from vehiculo where id = $1) as vehiculo,
       (select cliente_id from recordatorio_mantenimiento where id = $2) as recordatorio,
       (select estado from consulta where id = $3) as consulta, (select detalle_perdida from consulta where id = $3) as detalle,
       (select estado from cotizacion where consulta_id = $3) as cotizacion,
       (select count(*)::int from auditoria where entidad = 'vehiculo' and entidad_id = $1 and accion = 'cambiar_dueno') as auditoria`,
    [d.vehiculoId, recordatorioId, consultaId],
  );
  expect(r).toEqual({ vehiculo: d.nuevoId, recordatorio: d.nuevoId, consulta: "perdido", detalle: "El vehículo cambió de dueño.", cotizacion: "enviada", auditoria: 1 });
  const [aviso] = await consultar<{ estado: string; avisado_at: Date | null; avisado_por: number | null }>("select estado, avisado_at, avisado_por from recordatorio_mantenimiento where id = $1", [recordatorioId]);
  expect(aviso).toEqual({ estado: "pendiente", avisado_at: null, avisado_por: null });
  // Lo del anterior queda a su nombre: su trabajo entregado y su cotización
  const [{ trabajos, consultas }] = await consultar<{ trabajos: number; consultas: number }>(
    "select (select count(*)::int from trabajo where cliente_id = $1) as trabajos, (select count(*)::int from consulta where cliente_id = $1) as consultas",
    [d.anteriorId],
  );
  expect({ trabajos, consultas }).toEqual({ trabajos: 1, consultas: 1 });
  // En la ficha del anterior ya no está entre sus vehículos
  await page.goto(`/panel/clientes/${d.anteriorId}`);
  await expect(page.getByText("Todavía no tiene vehículos.")).toBeVisible();
});

test("desde la placa repetida al agregar un vehículo en la ficha del comprador", async ({ page }, info) => {
  const d = await dosClientes(info, 2);
  await ingresarComoDueno(page);
  await page.goto(`/panel/clientes/${d.nuevoId}`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Agregar vehículo" }).click();
  const dialogo = page.getByRole("dialog");
  await dialogo.getByLabel("Placa").fill(d.placa);
  await dialogo.getByLabel("Tamaño").selectOption({ index: 1 });
  await dialogo.getByRole("button", { name: "Agregar vehículo" }).click();
  await expect(dialogo.getByText(`La placa ${d.placa} ya está registrada a nombre de ${d.anterior}.`)).toBeVisible();
  await dialogo.getByRole("link", { name: "Cambiar de dueño a este cliente" }).click();
  // Desde su placa repetida, "Cancelar" vuelve a la ficha del comprador
  await expect(page.getByRole("link", { name: "Cancelar" })).toHaveAttribute("href", `/panel/clientes/${d.nuevoId}`);
  await expect(page.getByText(`De ${d.anterior} a ${d.nuevo}.`)).toBeVisible();
  await page.getByRole("button", { name: "Cambiar de dueño" }).click();
  await expect(page).toHaveURL(new RegExp(`/panel/clientes/${d.nuevoId}\\?recibido=${d.placa}$`));
  await expect(page.getByRole("list", { name: "Vehículos" })).toContainText(d.placa);
});

test("con una reserva activa no se pasa: primero se entrega o se cancela", async ({ page }, info) => {
  const d = await dosClientes(info, 3);
  // Una reserva agendada en un día propio (las de otras pruebas llegan hasta los 363 días): no choca en los espacios
  await consultar(
    `insert into trabajo (sucursal_id, cliente_id, vehiculo_id, espacio_id, fecha_inicio, fecha_fin, estado, created_by)
     select e.sucursal_id, v.cliente_id, v.id, e.id, current_date + $2::int, current_date + $2::int, 'agendado', v.created_by
     from vehiculo v, (select * from espacio_taller where activo order by orden limit 1) e where v.id = $1`,
    [d.vehiculoId, (info.project.name === "celular" ? 358 : 364) - info.retry],
  );
  await ingresarComoDueno(page);
  await page.goto(`/panel/clientes/${d.anteriorId}/vehiculos/${d.vehiculoId}/dueno?nuevo=${d.nuevoId}`);
  await expect(page.getByText(`${d.placa} tiene una reserva o está en el taller`)).toBeVisible();
  await expect(page.getByRole("button", { name: "Cambiar de dueño" })).toHaveCount(0);
  const [{ cliente }] = await consultar<{ cliente: number }>("select cliente_id as cliente from vehiculo where id = $1", [d.vehiculoId]);
  expect(cliente).toBe(d.anteriorId);
});

test("lo entregado al anterior no se toca, y su cotización cerrada no vuelve a abrirse", async ({ page }, info) => {
  const d = await dosClientes(info, 4);
  // Una cotización aceptada con su trabajo ya entregado (historia) y otra pendiente (abierta)
  const entregada = await crearCotizacionEnBase({ placa: d.placa, numero: `2037-${sufijo(info)}4a`, estado: "confirmado" });
  await consultar(
    `insert into trabajo (sucursal_id, cliente_id, vehiculo_id, consulta_id, espacio_id, fecha_inicio, fecha_fin, estado, recibido_at, listo_at, entregado_at, created_by)
     select e.sucursal_id, q.cliente_id, q.vehiculo_id, q.id, e.id, current_date - 30, current_date - 30, 'entregado', now(), now(), now(), q.created_by
     from consulta q, (select * from espacio_taller where activo order by orden limit 1) e where q.id = $1`,
    [entregada],
  );
  const abierta = await crearCotizacionEnBase({ placa: d.placa, numero: `2037-${sufijo(info)}4b` });
  await ingresarComoDueno(page);
  await page.goto(`/panel/clientes/${d.anteriorId}/vehiculos/${d.vehiculoId}/dueno?nuevo=${d.nuevoId}`);
  await expect(page.getByText("1 cotización abierta")).toBeVisible();
  await page.getByRole("button", { name: "Cambiar de dueño" }).click();
  await expect(page).toHaveURL((url) => url.pathname === `/panel/clientes/${d.nuevoId}` && url.searchParams.has("recibido"));
  const filas = await consultar<{ id: number; estado: string; version: string }>(
    "select q.id, q.estado, c.estado as version from consulta q join cotizacion c on c.consulta_id = q.id where q.id = any($1) order by q.id",
    [[entregada, abierta]],
  );
  expect(filas).toEqual([
    { id: entregada, estado: "confirmado", version: "aceptada" },
    { id: abierta, estado: "perdido", version: "enviada" },
  ]);
  // La cerrada no vuelve a pendiente: el vehículo ya es de otro cliente
  await page.goto(`/panel/cotizaciones/${abierta}`);
  await page.getByRole("button", { name: "Más" }).click();
  await page.getByRole("menuitem", { name: "Volver a pendiente" }).click();
  await page.getByRole("button", { name: "Sí, volver a pendiente" }).click();
  await expect(page.getByRole("dialog").getByText("El vehículo de esta cotización ya es de otro cliente: cotízale a él.")).toBeVisible();
});
