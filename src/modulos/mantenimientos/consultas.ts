import "server-only";
import { and, asc, desc, eq, inArray, lte, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db";
import { cliente, recordatorioMantenimiento as recordatorio, servicio, trabajo, usuario, vehiculo, type EstadoRecordatorio, type EstadoTrabajo } from "@/db/esquema";
import { ESTADOS_RECORDATORIO_ABIERTO, hastaProximos } from "./reglas";

// Lecturas de los recordatorios de mantenimiento (HU-38). Quien las llama ya pasó por exigirModulo("mantenimientos").
// Especificación: docs/08-desarrollo/etapas/C4-taller-entrega.md §6.

export type MantenimientoPorAvisar = {
  id: number;
  fechaProgramada: string;
  estado: EstadoRecordatorio;
  avisadoAt: Date | null;
  avisadoPor: string | null;
  servicio: string;
  clienteId: number;
  cliente: string;
  telefono: string;
  vehiculoId: number;
  placa: string;
  marca: string | null;
  modelo: string | null;
};

const avisador = alias(usuario, "avisador");

/**
 * Los que hay que avisar hoy (RF-50): sin agendar ni cerrar, vencidos o que vencen en los próximos 15 días, el más
 * antiguo primero. Sin los de un cliente o vehículo desactivado: no se le avisa ni se le puede agendar.
 */
export async function mantenimientosPorAvisar(hoy: string): Promise<MantenimientoPorAvisar[]> {
  return db
    .select({
      id: recordatorio.id,
      fechaProgramada: recordatorio.fechaProgramada,
      estado: recordatorio.estado,
      avisadoAt: recordatorio.avisadoAt,
      avisadoPor: avisador.name,
      servicio: servicio.nombre,
      clienteId: cliente.id,
      cliente: cliente.nombre,
      telefono: cliente.telefono,
      vehiculoId: vehiculo.id,
      placa: vehiculo.placa,
      marca: vehiculo.marca,
      modelo: vehiculo.modelo,
    })
    .from(recordatorio)
    .innerJoin(cliente, eq(recordatorio.clienteId, cliente.id))
    .innerJoin(vehiculo, eq(recordatorio.vehiculoId, vehiculo.id))
    .innerJoin(servicio, eq(recordatorio.servicioId, servicio.id))
    .leftJoin(avisador, eq(recordatorio.avisadoPor, avisador.id))
    .where(porAvisar(hoy))
    .orderBy(asc(recordatorio.fechaProgramada), asc(recordatorio.id));
}

/** Cuáles hay que avisar: la condición de la lista y de su cuenta en el inicio (con `cliente` y `vehiculo` unidos). */
const porAvisar = (hoy: string) =>
  and(
    inArray(recordatorio.estado, [...ESTADOS_RECORDATORIO_ABIERTO]),
    lte(recordatorio.fechaProgramada, hastaProximos(hoy)),
    eq(cliente.activo, true),
    eq(vehiculo.activo, true),
  );

/**
 * Cuántos de la lista de Mantenimientos todavía no se avisaron, vencidos y próximos (HU-39: el inicio). La misma
 * condición que la lista, para que el número y la lista no se separen; sin traer datos del cliente.
 */
export async function contarSinAvisar(hoy: string): Promise<{ vencidos: number; proximos: number }> {
  const [cuenta] = await db
    .select({
      vencidos: sql<number>`(count(*) filter (where ${recordatorio.fechaProgramada} < ${hoy}))::int`,
      proximos: sql<number>`(count(*) filter (where ${recordatorio.fechaProgramada} >= ${hoy}))::int`,
    })
    .from(recordatorio)
    .innerJoin(cliente, eq(recordatorio.clienteId, cliente.id))
    .innerJoin(vehiculo, eq(recordatorio.vehiculoId, vehiculo.id))
    .where(and(porAvisar(hoy), eq(recordatorio.estado, "pendiente")));
  return cuenta;
}

export type MantenimientoDelCliente = {
  id: number;
  fechaProgramada: string;
  estado: EstadoRecordatorio;
  servicio: string;
  placa: string;
  /** Un vehículo desactivado (por ejemplo, lo vendió) no se avisa: la lista de Mantenimientos no lo muestra. */
  vehiculoActivo: boolean;
  /** La reserva con que se agendó y su estado (para abrirla donde corresponde: reserva u orden). */
  agendado: { id: number; estado: EstadoTrabajo } | null;
};

/** Todos los del cliente, para su ficha: el más lejano arriba (los que vienen), los viejos al final. */
export async function mantenimientosDelCliente(clienteId: number): Promise<MantenimientoDelCliente[]> {
  const filas = await db
    .select({
      id: recordatorio.id,
      fechaProgramada: recordatorio.fechaProgramada,
      estado: recordatorio.estado,
      servicio: servicio.nombre,
      placa: vehiculo.placa,
      vehiculoActivo: vehiculo.activo,
      agendadoId: trabajo.id,
      agendadoEstado: trabajo.estado,
    })
    .from(recordatorio)
    .innerJoin(vehiculo, eq(recordatorio.vehiculoId, vehiculo.id))
    .innerJoin(servicio, eq(recordatorio.servicioId, servicio.id))
    .leftJoin(trabajo, eq(recordatorio.trabajoAgendadoId, trabajo.id))
    .where(eq(recordatorio.clienteId, clienteId))
    .orderBy(desc(recordatorio.fechaProgramada), desc(recordatorio.id));
  return filas.map(({ agendadoId, agendadoEstado, ...f }) => ({ ...f, agendado: agendadoId && agendadoEstado ? { id: agendadoId, estado: agendadoEstado } : null }));
}

/** Un recordatorio que todavía se puede agendar, para la nueva reserva (`?recordatorio=`). */
export async function recordatorioParaAgendar(id: number) {
  const [r] = await db
    .select({ id: recordatorio.id, clienteId: recordatorio.clienteId, vehiculoId: recordatorio.vehiculoId, fechaProgramada: recordatorio.fechaProgramada, servicio: servicio.nombre })
    .from(recordatorio)
    .innerJoin(servicio, eq(recordatorio.servicioId, servicio.id))
    .where(and(eq(recordatorio.id, id), inArray(recordatorio.estado, [...ESTADOS_RECORDATORIO_ABIERTO])));
  return r ?? null;
}
