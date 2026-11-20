import "server-only";
import { and, asc, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { cliente, espacioTaller, pago, trabajo, vehiculo } from "@/db/esquema";

// Lo del día en el inicio del panel (HU-39, RF-52). Cada bloque lo pide la página solo si quien entra ve ese módulo;
// ninguno trae montos ni teléfonos (RN-12). Aquí, solo lo que no tiene ya su consulta: las entregas y las listas salen
// de las órdenes abiertas (ordenesAbiertas, repartidas con ordenesDelDia) y los mantenimientos, de contarSinAvisar.
// Especificación: docs/08-desarrollo/etapas/C5-cierre-entrega-2.md §5 y §6.

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

/**
 * Lo cobrado por día entre dos fechas (pagos y adelantos sin anular, por la fecha del pago), para "Cobrado este mes"
 * del inicio (19/11). Lo mismo que cuenta Reportes, sin traer el resto de sus datos. Solo para quien ve Reportes.
 */
export async function cobradoPorDia(inicio: string, fin: string): Promise<{ fecha: string; total: number }[]> {
  const filas = await db
    .select({ fecha: sql<string>`${pago.fecha}::text`, total: sql<string>`sum(${pago.monto})` })
    .from(pago)
    .where(and(eq(pago.anulado, false), gte(pago.fecha, inicio), lte(pago.fecha, fin)))
    .groupBy(pago.fecha);
  return filas.map((f) => ({ fecha: f.fecha, total: Number(f.total) }));
}
