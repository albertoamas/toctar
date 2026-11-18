import "server-only";

import { and, asc, count, desc, eq, like, ne, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { cliente, consulta, cotizacion, cotizacionLinea, vehiculo } from "@/db/esquema";
import type { EstadoConsulta } from "@/db/esquema/consultas";
import { escaparLike, nombreVehiculo, normalizarBusqueda } from "@/modulos/clientes/reglas";
import { VISTAS, type Vista } from "../reglas";
import { conReservaActiva, sinFecha, tieneVersiones } from "./comun";

// Lecturas de las cotizaciones (C2, P23, P39, P40, P47). Quien las llama ya pasó por su permiso (Cotizaciones;
// los precios, solo con él). Especificación: docs/08-desarrollo/etapas/C2-consultas-cotizaciones.md.
// Aquí: la lista de cotizaciones con sus vistas y su búsqueda, y las de un cliente o un vehículo.

export type FilaCotizacion = {
  id: number;
  /** La versión que vale: la que se reserva. */
  cotizacionId: number;
  clienteId: number;
  cliente: string;
  placa: string;
  /** Marca y modelo ("Toyota Hilux"); vacío si no se cargaron. */
  vehiculo: string;
  /** Los servicios de la versión que vale, en su orden: "Instalación de PPF, Pulido de vidrios". */
  servicios: string;
  numero: string;
  total: string;
  estado: EstadoConsulta;
  /** Aceptada sin una reserva activa (pedido 31): se reserva después. */
  sinFecha: boolean;
  ultimoMovimientoAt: Date;
};

/** Si la cotización tiene una reserva activa; con `base`, dentro de la transacción que bloqueó su consulta. */
export async function tieneReservaActiva(consultaId: number, base: Pick<typeof db, "select"> = db): Promise<boolean> {
  const [fila] = await base.select({ activa: conReservaActiva }).from(consulta).where(eq(consulta.id, consultaId));
  return !!fila?.activa;
}

/**
 * "Por reservar" (pedido 31): las aceptadas sin reserva que se pueden reservar ya, con el cliente y el vehículo activos y
 * el vehículo todavía de ese cliente; las que esperan hace más tiempo, primero. Para la Agenda y para Inicio. Los montos
 * los muestra solo quien los ve (RN-12): lo decide la pantalla.
 */
export async function cotizacionesPorReservar(): Promise<FilaCotizacion[]> {
  const donde = and(sinFecha, eq(cliente.activo, true), eq(vehiculo.activo, true), eq(vehiculo.clienteId, consulta.clienteId));
  return (await filas(donde).orderBy(asc(consulta.ultimoMovimientoAt), asc(consulta.id))).map(aFila);
}

/**
 * Abierta: una cotización (con versiones) pendiente, o aceptada sin reserva activa. Las que cierra un cambio de dueño
 * (pedido 37): una aceptada con su trabajo, aunque ya se haya entregado, es historia y no se toca.
 */
export const cotizacionAbierta = sql`(${tieneVersiones} and (${consulta.estado} = 'cotizado' or (${consulta.estado} = 'confirmado' and not ${conReservaActiva})))`;

/** La versión que vale de cada cotización: la vigente, o la aceptada. Las reemplazadas quedan solo en su ficha. */
const versionActual = and(eq(cotizacion.consultaId, consulta.id), ne(cotizacion.estado, "reemplazada"));

const columnasFila = {
  id: consulta.id,
  cotizacionId: cotizacion.id,
  clienteId: consulta.clienteId,
  cliente: cliente.nombre,
  placa: vehiculo.placa,
  marca: vehiculo.marca,
  modelo: vehiculo.modelo,
  servicios: sql<string>`coalesce((select string_agg(${cotizacionLinea.descripcion}, ', ' order by ${cotizacionLinea.orden}) from ${cotizacionLinea} where ${cotizacionLinea.cotizacionId} = ${cotizacion.id}), '')`,
  numero: cotizacion.numero,
  total: cotizacion.total,
  estado: consulta.estado,
  sinFecha,
  ultimoMovimientoAt: consulta.ultimoMovimientoAt,
};

/** La fila de la consulta, con el vehículo nombrado como en el resto del panel. */
const aFila = ({ marca, modelo, ...f }: { marca: string | null; modelo: string | null } & Omit<FilaCotizacion, "vehiculo">): FilaCotizacion => ({
  ...f,
  vehiculo: nombreVehiculo({ marca, modelo }),
});

function filas(donde: SQL | undefined) {
  return db
    .select(columnasFila)
    .from(consulta)
    .innerJoin(cotizacion, versionActual)
    .innerJoin(cliente, eq(consulta.clienteId, cliente.id))
    .innerJoin(vehiculo, eq(consulta.vehiculoId, vehiculo.id))
    .where(donde);
}

/** Cuántas filas muestran Aceptadas y Rechazadas sin buscar: son historia, y crecen. */
export const LIMITE_HISTORIA = 50;

/** Lo buscado: por cliente, teléfono, placa o número (de la versión que vale). */
function coincide(q: string): SQL | undefined {
  const busqueda = normalizarBusqueda(q);
  if (!busqueda) return undefined;
  return or(
    sql`unaccent(lower(${cliente.nombre})) like unaccent(lower(${`%${escaparLike(busqueda.texto)}%`}))`,
    busqueda.digitos ? like(cliente.telefono, `%${escaparLike(busqueda.digitos)}%`) : undefined,
    busqueda.placa ? like(vehiculo.placa, `%${escaparLike(busqueda.placa)}%`) : undefined,
    like(cotizacion.numero, `%${escaparLike(busqueda.texto)}%`),
  );
}

/**
 * Las cotizaciones de una pestaña. Las pendientes, las que llevan más tiempo sin respuesta primero (RF-35); las
 * aceptadas y rechazadas, las más nuevas primero y hasta LIMITE_HISTORIA (buscando, se encuentran todas).
 */
export async function listarCotizaciones(vista: Vista, q: string): Promise<{ cotizaciones: FilaCotizacion[]; hayMas: boolean }> {
  const donde = and(eq(consulta.estado, VISTAS[vista]), coincide(q));
  if (vista === "pendientes") return { cotizaciones: (await filas(donde).orderBy(asc(consulta.ultimoMovimientoAt), asc(consulta.id))).map(aFila), hayMas: false };
  const encontradas = (
    await filas(donde)
      // En Aceptadas, primero las que esperan fecha (pedido 31): no quedan detrás de la historia
      .orderBy(...(vista === "aceptadas" ? [desc(sinFecha)] : []), desc(consulta.ultimoMovimientoAt), desc(consulta.id))
      .limit(LIMITE_HISTORIA + 1)
  ).map(aFila);
  return { cotizaciones: encontradas.slice(0, LIMITE_HISTORIA), hayMas: encontradas.length > LIMITE_HISTORIA };
}

/**
 * Cuántas hay en cada pestaña, con la misma búsqueda: así se ve en qué pestaña está lo buscado. Solo las que tienen
 * versiones (la unión con la versión que vale): las consultas de antes sin cotizar no cuentan.
 */
export async function contarPorVista(q: string): Promise<Record<Vista, number>> {
  const porEstado = await db
    .select({ estado: consulta.estado, total: count() })
    .from(consulta)
    .innerJoin(cotizacion, versionActual)
    .innerJoin(cliente, eq(consulta.clienteId, cliente.id))
    .innerJoin(vehiculo, eq(consulta.vehiculoId, vehiculo.id))
    .where(coincide(q))
    .groupBy(consulta.estado);
  const de = (estado: EstadoConsulta) => porEstado.find((f) => f.estado === estado)?.total ?? 0;
  return { pendientes: de(VISTAS.pendientes), aceptadas: de(VISTAS.aceptadas), rechazadas: de(VISTAS.rechazadas) };
}

/** Las cotizaciones de un cliente, de la más nueva a la más vieja (su ficha). */
export async function cotizacionesDelCliente(clienteId: number): Promise<FilaCotizacion[]> {
  return (await filas(eq(consulta.clienteId, clienteId)).orderBy(desc(consulta.createdAt), desc(consulta.id))).map(aFila);
}

/** Las cotizaciones de un vehículo, para su ficha (pedido 51), también las de un dueño anterior. */
export async function cotizacionesDelVehiculo(vehiculoId: number): Promise<FilaCotizacion[]> {
  return (await filas(eq(consulta.vehiculoId, vehiculoId)).orderBy(desc(consulta.createdAt), desc(consulta.id))).map(aFila);
}
