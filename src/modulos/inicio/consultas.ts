import "server-only";
import { and, asc, eq, inArray, isNull, lte } from "drizzle-orm";
import { db } from "@/db";
import { cliente, espacioTaller, trabajo, vehiculo } from "@/db/esquema";
import type { EstadoTrabajo } from "@/db/esquema/trabajos";
import { mantenimientosPorAvisar } from "@/modulos/mantenimientos/consultas";
import { seccionMantenimiento } from "@/modulos/mantenimientos/reglas";
import { ESTADOS_ORDEN_ABIERTA } from "@/modulos/ordenes/reglas";

// Lo del día en el inicio del panel (HU-39, RF-52). Cada bloque lo pide la página solo si quien entra ve ese módulo;
// ninguno trae montos ni teléfonos (RN-12). Especificación: docs/08-desarrollo/etapas/C5-cierre-entrega-2.md §5 y §6.

export type IngresoDelDia = { id: number; placa: string; cliente: string; espacio: string; fechaInicio: string; horaIngreso: string | null };

/** Las reservas que ingresan hoy y las de días pasados que todavía no se recibieron; la más atrasada primero. */
export async function ingresosDeHoy(hoy: string): Promise<IngresoDelDia[]> {
  return db
    .select({
      id: trabajo.id,
      placa: vehiculo.placa,
      cliente: cliente.nombre,
      espacio: espacioTaller.nombre,
      fechaInicio: trabajo.fechaInicio,
      horaIngreso: trabajo.horaIngreso,
    })
    .from(trabajo)
    .innerJoin(vehiculo, eq(trabajo.vehiculoId, vehiculo.id))
    .innerJoin(cliente, eq(trabajo.clienteId, cliente.id))
    .innerJoin(espacioTaller, eq(trabajo.espacioId, espacioTaller.id))
    .where(and(eq(trabajo.estado, "agendado"), lte(trabajo.fechaInicio, hoy)))
    .orderBy(asc(trabajo.fechaInicio), asc(espacioTaller.orden), asc(trabajo.id));
}

export type EntregaDelDia = { id: number; estado: EstadoTrabajo; placa: string; cliente: string; fechaFin: string };

/** Las órdenes abiertas que se entregan hoy y las que ya debían entregarse; la más atrasada primero. */
export async function entregasDeHoy(hoy: string): Promise<EntregaDelDia[]> {
  return db
    .select({ id: trabajo.id, estado: trabajo.estado, placa: vehiculo.placa, cliente: cliente.nombre, fechaFin: trabajo.fechaFin })
    .from(trabajo)
    .innerJoin(vehiculo, eq(trabajo.vehiculoId, vehiculo.id))
    .innerJoin(cliente, eq(trabajo.clienteId, cliente.id))
    .where(and(inArray(trabajo.estado, [...ESTADOS_ORDEN_ABIERTA]), lte(trabajo.fechaFin, hoy)))
    .orderBy(asc(trabajo.fechaFin), asc(trabajo.id));
}

export type ListaSinAvisar = { id: number; placa: string; cliente: string; listoAt: Date | null };

/** Las órdenes listas a cuyo cliente todavía no se le avisó (HU-35); la que espera hace más primero. */
export async function listasSinAvisar(): Promise<ListaSinAvisar[]> {
  return db
    .select({ id: trabajo.id, placa: vehiculo.placa, cliente: cliente.nombre, listoAt: trabajo.listoAt })
    .from(trabajo)
    .innerJoin(vehiculo, eq(trabajo.vehiculoId, vehiculo.id))
    .innerJoin(cliente, eq(trabajo.clienteId, cliente.id))
    .where(and(eq(trabajo.estado, "listo"), isNull(trabajo.avisadoListoAt)))
    .orderBy(asc(trabajo.listoAt), asc(trabajo.id));
}

/**
 * Cuántos mantenimientos vencidos y próximos falta avisar (HU-38). Son los de la lista de Mantenimientos que todavía no
 * se avisaron: la misma consulta, para que el número del inicio y la lista no se separen.
 */
export async function contarMantenimientosPorAvisar(hoy: string): Promise<{ vencidos: number; proximos: number }> {
  const sinAvisar = (await mantenimientosPorAvisar(hoy)).filter((m) => m.estado === "pendiente");
  const cuantos = (seccion: "vencido" | "proximo") => sinAvisar.filter((m) => seccionMantenimiento(m.fechaProgramada, hoy) === seccion).length;
  return { vencidos: cuantos("vencido"), proximos: cuantos("proximo") };
}
