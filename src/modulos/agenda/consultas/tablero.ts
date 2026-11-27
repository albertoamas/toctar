import "server-only";

import { and, asc, desc, eq, gte, inArray, like, lt, lte, ne, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { cliente, trabajo, trabajoLinea, vehiculo } from "@/db/esquema";
import { type EstadoTrabajo } from "@/db/esquema/trabajos";
import { fechaEnBolivia } from "@/lib/fechas";
import { escaparLike, normalizarBusqueda } from "@/modulos/clientes/reglas";
import { sucursalPrincipal } from "@/modulos/configuracion/consultas";

// Lecturas de la agenda (C3). Quien las llama ya pasó por exigirModulo("agenda"); los montos y pagos solo se piden
// para quien además ve "pagos" (o el dueño). Especificación: docs/08-desarrollo/etapas/C3-agenda-pagos.md.
// Aquí: la semana del tablero de la agenda y la búsqueda de reservas.

export type ReservaTablero = {
  id: number;
  inicio: string;
  fin: string;
  estado: EstadoTrabajo;
  placa: string;
  cliente: string;
  /** El primer servicio y cuántos más lleva ("Pulido y nano cerámico — 5 años", 1). */
  servicio: string | null;
  masServicios: number;
};

/** Lo que muestra la Agenda: las reservas por recibir de un tramo de días y los autos que hoy están en el taller. */
export type DatosAgenda = {
  reservas: ReservaTablero[];
  /** Los que están en el taller (recibidos, en proceso o listos): se trabajan en Órdenes; la Agenda solo los resume. */
  enTaller: { id: number; placa: string; estado: EstadoTrabajo }[];
  /** Días de la semana (1 = lunes … 7 = domingo) que el taller no atiende, según el horario de Configuración. */
  diasCerrados: number[];
};

/**
 * La Agenda (HU-29), como el calendario de citas de los sistemas de talleres (pedido 55, 20/11): las reservas por recibir
 * que caen entre `desde` y `hasta` (también las de varios días que empezaron antes) y las que no llegaron en su día (se
 * muestran hoy, en rojo). Lo que ya está en el taller se trabaja en Órdenes: aquí solo va contado.
 */
export async function datosAgenda(desde: string, hasta: string): Promise<DatosAgenda> {
  const s = await sucursalPrincipal();
  const hoy = fechaEnBolivia();
  const reservadas = and(
    eq(trabajo.sucursalId, s.id),
    eq(trabajo.estado, "agendado"),
    lte(trabajo.fechaInicio, hasta),
    or(gte(trabajo.fechaFin, desde), lt(trabajo.fechaInicio, hoy)),
  );
  const [reservas, lineas, enTaller] = await Promise.all([
    db
      .select({ id: trabajo.id, inicio: trabajo.fechaInicio, fin: trabajo.fechaFin, estado: trabajo.estado, placa: vehiculo.placa, cliente: cliente.nombre })
      .from(trabajo)
      .innerJoin(vehiculo, eq(trabajo.vehiculoId, vehiculo.id))
      .innerJoin(cliente, eq(trabajo.clienteId, cliente.id))
      .where(reservadas)
      .orderBy(asc(trabajo.fechaInicio), asc(trabajo.id)),
    db
      .select({ trabajoId: trabajoLinea.trabajoId, descripcion: trabajoLinea.descripcion })
      .from(trabajoLinea)
      .innerJoin(trabajo, eq(trabajoLinea.trabajoId, trabajo.id))
      .where(reservadas)
      .orderBy(asc(trabajoLinea.orden)),
    db
      .select({ id: trabajo.id, placa: vehiculo.placa, estado: trabajo.estado })
      .from(trabajo)
      .innerJoin(vehiculo, eq(trabajo.vehiculoId, vehiculo.id))
      .where(and(eq(trabajo.sucursalId, s.id), inArray(trabajo.estado, ["recibido", "en_proceso", "listo"])))
      .orderBy(asc(trabajo.fechaFin), asc(trabajo.id)),
  ]);
  const porTrabajo = new Map<number, string[]>();
  for (const l of lineas) porTrabajo.set(l.trabajoId, [...(porTrabajo.get(l.trabajoId) ?? []), l.descripcion]);
  return {
    reservas: reservas.map((r) => {
      const suyas = porTrabajo.get(r.id) ?? [];
      return { ...r, servicio: suyas[0] ?? null, masServicios: Math.max(0, suyas.length - 1) };
    }),
    enTaller,
    diasCerrados: s.horarios.filter((d) => d.turnos.length === 0).map((d) => d.dia),
  };
}

export type ReservaEncontrada = ReservaTablero;

/** Cuántas reservas muestra la búsqueda de la Agenda: si hay más, se pide escribir más. */
const RESERVAS_POR_BUSQUEDA = 30;

/**
 * El buscador de la Agenda (lavado de cara, 16/11): las reservas de cualquier semana por placa, nombre del cliente (sin
 * importar tildes ni mayúsculas) o parte del teléfono, sin las canceladas. Primero las abiertas (en el taller o por
 * recibir, también una atrasada que no vino) y las que vienen, de la más próxima a la más lejana; después las
 * entregadas, de la más reciente a la más vieja.
 */
export async function buscarReservas(q: string): Promise<{ reservas: ReservaEncontrada[]; hayMas: boolean }> {
  const busqueda = normalizarBusqueda(q);
  if (!busqueda) return { reservas: [], hayMas: false };
  const s = await sucursalPrincipal();
  const coincide = or(
    sql`unaccent(lower(${cliente.nombre})) like unaccent(lower(${`%${escaparLike(busqueda.texto)}%`}))`,
    busqueda.digitos ? like(cliente.telefono, `%${escaparLike(busqueda.digitos)}%`) : undefined,
    busqueda.placa ? like(vehiculo.placa, `%${escaparLike(busqueda.placa)}%`) : undefined,
  );
  // Abierta: todo lo que no se entregó (las canceladas ya no están)
  const viene = sql`${trabajo.estado} <> 'entregado'`;
  const filas = await db
    .select({
      id: trabajo.id,
      inicio: trabajo.fechaInicio,
      fin: trabajo.fechaFin,
      estado: trabajo.estado,
      placa: vehiculo.placa,
      cliente: cliente.nombre,
    })
    .from(trabajo)
    .innerJoin(vehiculo, eq(trabajo.vehiculoId, vehiculo.id))
    .innerJoin(cliente, eq(trabajo.clienteId, cliente.id))
    .where(and(eq(trabajo.sucursalId, s.id), ne(trabajo.estado, "cancelado"), coincide))
    .orderBy(sql`case when ${viene} then 0 else 1 end`, sql`case when ${viene} then ${trabajo.fechaInicio} end asc`, desc(trabajo.fechaInicio), desc(trabajo.id))
    .limit(RESERVAS_POR_BUSQUEDA + 1);
  const reservas = filas.slice(0, RESERVAS_POR_BUSQUEDA);
  const lineas = reservas.length
    ? await db
        .select({ trabajoId: trabajoLinea.trabajoId, descripcion: trabajoLinea.descripcion })
        .from(trabajoLinea)
        .where(inArray(trabajoLinea.trabajoId, reservas.map((r) => r.id)))
        .orderBy(asc(trabajoLinea.orden))
    : [];
  const porTrabajo = new Map<number, string[]>();
  for (const l of lineas) porTrabajo.set(l.trabajoId, [...(porTrabajo.get(l.trabajoId) ?? []), l.descripcion]);
  return {
    reservas: reservas.map((r) => {
      const suyas = porTrabajo.get(r.id) ?? [];
      return { ...r, servicio: suyas[0] ?? null, masServicios: Math.max(0, suyas.length - 1) };
    }),
    hayMas: filas.length > RESERVAS_POR_BUSQUEDA,
  };
}
