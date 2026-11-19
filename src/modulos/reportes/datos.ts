import "server-only";
import { and, asc, eq, gte, inArray, isNotNull, lte, min, or, sql, type AnyColumn } from "drizzle-orm";
import { db } from "@/db";
import { categoriaGasto, cliente, gasto, pago, servicio, trabajo, trabajoLinea, variante } from "@/db/esquema";
import type { EstadoTrabajo, MetodoPago } from "@/db/esquema/trabajos";
import { sucursalPrincipal } from "@/modulos/configuracion/consultas";

// Reportes v2 (19/11, prototipo aprobado): lo que pasó en unas fechas, en crudo. Las pestañas no consultan cada una lo
// suyo: se trae una vez lo cobrado, lo gastado y las órdenes con sus servicios, y los indicadores y gráficos se
// calculan de eso (calculos.ts, con sus pruebas). Así un mismo número sale igual en todas las pestañas.
// Lo cobrado es por la fecha del pago (no la de la orden): lo que entró, no lo vendido. La hora, la de su registro
// (para "Hoy" por hora y su comparación hasta la misma hora). Todo en hora de Bolivia.

const fechaBolivia = (columna: AnyColumn) => sql<string>`to_char(${columna} at time zone 'America/La_Paz', 'YYYY-MM-DD')`;
const horaBolivia = (columna: AnyColumn) => sql<string>`to_char(${columna} at time zone 'America/La_Paz', 'HH24:MI')`;
const diaBolivia = (columna: AnyColumn) => sql`(${columna} at time zone 'America/La_Paz')::date`;

export type Cobro = { fecha: string; hora: string; monto: number; metodo: MetodoPago; trabajoId: number; clienteId: number };
export type GastoDelPeriodo = { fecha: string; hora: string; monto: number; categoria: string };
export type OrdenDelPeriodo = {
  id: number;
  clienteId: number;
  estado: EstadoTrabajo;
  recibido: string | null;
  horaRecibido: string | null;
  entregado: string | null;
  horaEntregado: string | null;
  /** De recibida a entregada, en días (con decimales); null si no se entregó. */
  dias: number | null;
};
export type LineaDeOrden = { trabajoId: number; servicioId: number; servicio: string; precio: number };

export type DatosDelPeriodo = {
  cobros: Cobro[];
  gastos: GastoDelPeriodo[];
  ordenes: OrdenDelPeriodo[];
  /** Las líneas de las órdenes con cobros o entregadas en las fechas: para repartir lo cobrado por servicio. */
  lineas: LineaDeOrden[];
};

/** Lo cobrado, lo gastado y las órdenes recibidas o entregadas entre dos días (incluidos). */
export async function datosEntre(inicio: string, fin: string): Promise<DatosDelPeriodo> {
  const s = await sucursalPrincipal();
  const [cobros, gastos, ordenes] = await Promise.all([
    db
      .select({ fecha: sql<string>`${pago.fecha}::text`, hora: horaBolivia(pago.createdAt), monto: pago.monto, metodo: pago.metodo, trabajoId: pago.trabajoId, clienteId: trabajo.clienteId })
      .from(pago)
      .innerJoin(trabajo, eq(pago.trabajoId, trabajo.id))
      .where(and(eq(trabajo.sucursalId, s.id), eq(pago.anulado, false), gte(pago.fecha, inicio), lte(pago.fecha, fin))),
    db
      .select({ fecha: sql<string>`${gasto.fecha}::text`, hora: horaBolivia(gasto.createdAt), monto: gasto.monto, categoria: categoriaGasto.nombre })
      .from(gasto)
      .innerJoin(categoriaGasto, eq(gasto.categoriaId, categoriaGasto.id))
      .where(and(eq(gasto.sucursalId, s.id), eq(gasto.anulado, false), gte(gasto.fecha, inicio), lte(gasto.fecha, fin))),
    db
      .select({
        id: trabajo.id,
        clienteId: trabajo.clienteId,
        estado: trabajo.estado,
        recibido: fechaBolivia(trabajo.recibidoAt),
        horaRecibido: horaBolivia(trabajo.recibidoAt),
        entregado: fechaBolivia(trabajo.entregadoAt),
        horaEntregado: horaBolivia(trabajo.entregadoAt),
        dias: sql<string | null>`extract(epoch from (${trabajo.entregadoAt} - ${trabajo.recibidoAt})) / 86400`,
      })
      .from(trabajo)
      .where(
        and(
          eq(trabajo.sucursalId, s.id),
          or(
            and(isNotNull(trabajo.recibidoAt), gte(diaBolivia(trabajo.recibidoAt), inicio), lte(diaBolivia(trabajo.recibidoAt), fin)),
            and(isNotNull(trabajo.entregadoAt), gte(diaBolivia(trabajo.entregadoAt), inicio), lte(diaBolivia(trabajo.entregadoAt), fin)),
          ),
        ),
      ),
  ]);
  const ids = [...new Set([...cobros.map((c) => c.trabajoId), ...ordenes.map((o) => o.id)])];
  const lineas = ids.length
    ? await db
        .select({ trabajoId: trabajoLinea.trabajoId, servicioId: servicio.id, servicio: servicio.nombre, precio: trabajoLinea.precio })
        .from(trabajoLinea)
        .innerJoin(variante, eq(trabajoLinea.varianteId, variante.id))
        .innerJoin(servicio, eq(variante.servicioId, servicio.id))
        .where(inArray(trabajoLinea.trabajoId, ids))
    : [];
  return {
    cobros: cobros.map((c) => ({ ...c, monto: Number(c.monto) })),
    gastos: gastos.map((g) => ({ ...g, monto: Number(g.monto) })),
    ordenes: ordenes.map((o) => ({ ...o, dias: o.dias === null ? null : Number(o.dias) })),
    lineas: lineas.map((l) => ({ ...l, precio: Number(l.precio) })),
  };
}

/** El primer día en que se le entregó algo a cada cliente (en toda la historia): para saber si es nuevo o volvió. */
export async function primerasEntregas(clienteIds: number[]): Promise<Map<number, string>> {
  if (!clienteIds.length) return new Map();
  const filas = await db
    .select({ clienteId: trabajo.clienteId, primera: sql<string>`to_char(${min(diaBolivia(trabajo.entregadoAt))}, 'YYYY-MM-DD')` })
    .from(trabajo)
    .where(and(eq(trabajo.estado, "entregado"), inArray(trabajo.clienteId, clienteIds)))
    .groupBy(trabajo.clienteId);
  return new Map(filas.map((f) => [f.clienteId, f.primera]));
}

/** El nombre y el WhatsApp de unos clientes (el ranking de los que más pagaron). */
export async function clientesPorId(ids: number[]): Promise<Map<number, { nombre: string; telefono: string }>> {
  if (!ids.length) return new Map();
  const filas = await db.select({ id: cliente.id, nombre: cliente.nombre, telefono: cliente.telefono }).from(cliente).where(inArray(cliente.id, ids));
  return new Map(filas.map((f) => [f.id, { nombre: f.nombre, telefono: f.telefono }]));
}

/** Los servicios en el orden del catálogo (por id): el color fijo de cada uno en los gráficos. */
export async function ordenDeServicios(): Promise<Map<number, number>> {
  const filas = await db.select({ id: servicio.id }).from(servicio).orderBy(asc(servicio.id));
  return new Map(filas.map((f, i) => [f.id, i]));
}

/** Las órdenes en el taller ahora (recibidas, en proceso o listas): no depende de las fechas. */
export async function enElTallerAhora(): Promise<number> {
  const s = await sucursalPrincipal();
  const [fila] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(trabajo)
    .where(and(eq(trabajo.sucursalId, s.id), inArray(trabajo.estado, ["recibido", "en_proceso", "listo"])));
  return fila?.n ?? 0;
}
