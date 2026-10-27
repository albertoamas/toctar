import "server-only";
import { and, asc, desc, eq, gt, inArray, lte, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db";
import { cliente, recordatorioMantenimiento as recordatorio, servicio, trabajo, usuario, vehiculo, type EstadoRecordatorio, type EstadoTrabajo } from "@/db/esquema";
import { ESTADOS_RECORDATORIO_ABIERTO, ESTADOS_RECORDATORIO_CERRADO, hastaProximos, MAXIMO_CERRADOS, type VistaMantenimientos } from "./reglas";

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

/** Uno cerrado (pedido 20): agendado, con su reserva, o "No le interesa", con su nota. */
export type MantenimientoCerrado = MantenimientoPorAvisar & {
  nota: string | null;
  /** La reserva con que se agendó y su estado (para abrirla donde corresponde: reserva u orden). */
  agendado: { id: number; estado: EstadoTrabajo } | null;
};

const avisador = alias(usuario, "avisador");

/**
 * Los que hay que avisar hoy (RF-50): sin agendar ni cerrar, vencidos o que vencen en los próximos 15 días, el más
 * antiguo primero. Sin los de un cliente o vehículo desactivado: no se le avisa ni se le puede agendar.
 */
export async function mantenimientosPorAvisar(hoy: string): Promise<MantenimientoPorAvisar[]> {
  return listar(porAvisar(hoy), [asc(recordatorio.fechaProgramada), asc(recordatorio.id)]);
}

/** Pedido 20: los abiertos que vencen después de los próximos 15 días, el más cercano primero (para planificar). */
export async function mantenimientosMasAdelante(hoy: string): Promise<MantenimientoPorAvisar[]> {
  return listar(masAdelante(hoy), [asc(recordatorio.fechaProgramada), asc(recordatorio.id)]);
}

/** Pedido 20: los agendados y los de "No le interesa", el que se cerró más recién primero (los últimos 50). */
export async function mantenimientosCerrados(): Promise<MantenimientoCerrado[]> {
  const filas = await db
    .select({ ...CAMPOS, nota: recordatorio.nota, agendadoId: trabajo.id, agendadoEstado: trabajo.estado })
    .from(recordatorio)
    .innerJoin(cliente, eq(recordatorio.clienteId, cliente.id))
    .innerJoin(vehiculo, eq(recordatorio.vehiculoId, vehiculo.id))
    .innerJoin(servicio, eq(recordatorio.servicioId, servicio.id))
    .leftJoin(avisador, eq(recordatorio.avisadoPor, avisador.id))
    .leftJoin(trabajo, eq(recordatorio.trabajoAgendadoId, trabajo.id))
    .where(cerrados)
    .orderBy(desc(recordatorio.updatedAt), desc(recordatorio.id))
    .limit(MAXIMO_CERRADOS);
  return filas.map(({ agendadoId, agendadoEstado, ...f }) => ({ ...f, agendado: agendadoId && agendadoEstado ? { id: agendadoId, estado: agendadoEstado } : null }));
}

/** Cuántos hay en cada pestaña, con las mismas condiciones que sus listas: el número y la lista no se separan. */
export async function contarPorVista(hoy: string): Promise<Record<VistaMantenimientos, number>> {
  const [cuenta] = await db
    .select({
      "por-avisar": sql<number>`(count(*) filter (where ${porAvisar(hoy)}))::int`,
      "mas-adelante": sql<number>`(count(*) filter (where ${masAdelante(hoy)}))::int`,
      cerrados: sql<number>`(count(*) filter (where ${cerrados}))::int`,
    })
    .from(recordatorio)
    .innerJoin(cliente, eq(recordatorio.clienteId, cliente.id))
    .innerJoin(vehiculo, eq(recordatorio.vehiculoId, vehiculo.id));
  return cuenta;
}

const CAMPOS = {
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
};

function listar(condicion: SQL | undefined, orden: SQL[]): Promise<MantenimientoPorAvisar[]> {
  return db
    .select(CAMPOS)
    .from(recordatorio)
    .innerJoin(cliente, eq(recordatorio.clienteId, cliente.id))
    .innerJoin(vehiculo, eq(recordatorio.vehiculoId, vehiculo.id))
    .innerJoin(servicio, eq(recordatorio.servicioId, servicio.id))
    .leftJoin(avisador, eq(recordatorio.avisadoPor, avisador.id))
    .where(condicion)
    .orderBy(...orden);
}

/** Del cliente y vehículo activos: los de uno desactivado no se avisan ni se agendan (siguen en la ficha del cliente). */
const activos = and(eq(cliente.activo, true), eq(vehiculo.activo, true));

/** Cuáles hay que avisar: la condición de la lista y de su cuenta en el inicio (con `cliente` y `vehiculo` unidos). */
const porAvisar = (hoy: string) => and(inArray(recordatorio.estado, [...ESTADOS_RECORDATORIO_ABIERTO]), lte(recordatorio.fechaProgramada, hastaProximos(hoy)), activos);

/** Abiertos que todavía no entran en la lista de hoy. */
const masAdelante = (hoy: string) => and(inArray(recordatorio.estado, [...ESTADOS_RECORDATORIO_ABIERTO]), gt(recordatorio.fechaProgramada, hastaProximos(hoy)), activos);

const cerrados = and(inArray(recordatorio.estado, [...ESTADOS_RECORDATORIO_CERRADO]), activos);

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
