import "server-only";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { recordatorioMantenimiento as recordatorio, servicio, trabajoLinea, variante } from "@/db/esquema";
import { ESTADOS_PLAN_ABIERTO, planesAlEntregar, type PlanAbierto, type PlanNuevo, type ServicioEntregado } from "./reglas";

// Los planes de mantenimiento de un vehículo al entregar una orden (pedido 21, D-11): qué servicios lleva la orden con
// el mantenimiento de su catálogo y qué planes tiene abiertos el vehículo. La regla que decide es pura
// (`planesAlEntregar`); aquí se lee y se escribe. Especificación: docs/08-desarrollo/etapas/P21-planes-mantenimiento.md §6.

type Transaccion = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Base = typeof db | Transaccion;

/** Lo que la regla necesita. En la entrega, dentro de la transacción y con los planes del vehículo bloqueados. */
async function leer(base: Base, trabajoId: number, vehiculoId: number, bloquear: boolean): Promise<{ servicios: ServicioEntregado[]; abiertos: PlanAbierto[] }> {
  const delVehiculo = base
    .select({
      id: recordatorio.id,
      servicioId: recordatorio.servicioId,
      servicioMantenimientoId: recordatorio.servicioMantenimientoId,
      intervaloMeses: recordatorio.intervaloMeses,
      trabajoAgendadoId: recordatorio.trabajoAgendadoId,
    })
    .from(recordatorio)
    .where(and(eq(recordatorio.vehiculoId, vehiculoId), inArray(recordatorio.estado, [...ESTADOS_PLAN_ABIERTO])));
  const [servicios, abiertos] = await Promise.all([
    base
      .selectDistinct({ servicioId: servicio.id, mantenimientoServicioId: servicio.mantenimientoServicioId, mantenimientoMeses: servicio.mantenimientoMeses })
      .from(trabajoLinea)
      .innerJoin(variante, eq(trabajoLinea.varianteId, variante.id))
      .innerJoin(servicio, eq(variante.servicioId, servicio.id))
      .where(eq(trabajoLinea.trabajoId, trabajoId)),
    bloquear ? delVehiculo.for("update") : delVehiculo,
  ]);
  return {
    servicios: servicios.map((s) => ({
      servicioId: s.servicioId,
      mantenimiento: s.mantenimientoServicioId && s.mantenimientoMeses ? { servicioId: s.mantenimientoServicioId, meses: s.mantenimientoMeses } : null,
    })),
    abiertos,
  };
}

/**
 * Aplica los planes al entregar (RN-08): los que se hicieron quedan "hechos" con la orden y nacen los siguientes. Dentro
 * de la transacción de la entrega, con la orden ya bloqueada. Devuelve cuántos para la auditoría.
 */
export async function aplicarPlanesAlEntregar(
  tx: Transaccion,
  datos: { trabajoId: number; clienteId: number; vehiculoId: number; hoy: string },
): Promise<{ hechos: number[]; nuevos: PlanNuevo[] }> {
  const { trabajoId, clienteId, vehiculoId, hoy } = datos;
  const resultado = planesAlEntregar({ ...(await leer(tx, trabajoId, vehiculoId, true)), trabajoId, hoy });
  if (resultado.hechos.length > 0) {
    await tx
      .update(recordatorio)
      .set({ estado: "hecho", trabajoHechoId: trabajoId, trabajoAgendadoId: null, updatedAt: sql`now()` })
      .where(inArray(recordatorio.id, resultado.hechos));
  }
  if (resultado.nuevos.length > 0) {
    await tx
      .insert(recordatorio)
      .values(resultado.nuevos.map((n) => ({ ...n, trabajoOrigenId: trabajoId, clienteId, vehiculoId })))
      .onConflictDoNothing();
  }
  return resultado;
}

/** Lo que va a pasar al entregar, para anticiparlo en la pantalla de Entregar: con los nombres de los servicios. */
export async function vistaPreviaPlanes(trabajoId: number, vehiculoId: number, hoy: string): Promise<{ programa: { servicio: string; fecha: string }[]; hechos: string[] }> {
  const datos = await leer(db, trabajoId, vehiculoId, false);
  const { hechos, nuevos } = planesAlEntregar({ ...datos, trabajoId, hoy });
  const ids = [...new Set([...nuevos.map((n) => n.servicioMantenimientoId), ...datos.abiertos.map((a) => a.servicioId)])];
  const nombres = new Map(ids.length === 0 ? [] : (await db.select({ id: servicio.id, nombre: servicio.nombre }).from(servicio).where(inArray(servicio.id, ids))).map((s) => [s.id, s.nombre]));
  return {
    programa: nuevos.map((n) => ({ servicio: nombres.get(n.servicioMantenimientoId) ?? "", fecha: n.fechaProgramada })),
    hechos: datos.abiertos.filter((a) => hechos.includes(a.id)).map((a) => nombres.get(a.servicioId) ?? ""),
  };
}

