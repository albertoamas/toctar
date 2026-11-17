import "server-only";

import { and, asc, desc, eq, gte, inArray, like, lte, ne, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { cliente, espacioTaller, trabajo, trabajoLinea, vehiculo } from "@/db/esquema";
import { type EstadoTrabajo } from "@/db/esquema/trabajos";
import { fechaEnBolivia } from "@/lib/fechas";
import { escaparLike, normalizarBusqueda } from "@/modulos/clientes/reglas";
import { sucursalPrincipal } from "@/modulos/configuracion/consultas";
import { entregadasALaVista, seCruzan } from "../reglas";

// Lecturas de la agenda (C3). Quien las llama ya pasó por exigirModulo("agenda"); los montos y pagos solo se piden
// para quien además ve "pagos" (o el dueño). Especificación: docs/08-desarrollo/etapas/C3-agenda-pagos.md.
// Aquí: la semana del tablero de la agenda y la búsqueda de reservas.

export type ReservaTablero = {
  id: number;
  espacioId: number;
  inicio: string;
  fin: string;
  estado: EstadoTrabajo;
  placa: string;
  cliente: string;
  /** La hora de ingreso acordada ("09:00"), si se cargó. */
  hora: string | null;
  /** El primer servicio y cuántos más lleva ("Pulido y nano cerámico — 5 años", 1). */
  servicio: string | null;
  masServicios: number;
};

export type SemanaDeAgenda = {
  /** Los activos y, si tienen reservas esa semana, también los desactivados (`activo: false`): no se pierden de vista. */
  espacios: { id: number; nombre: string; activo: boolean }[];
  reservas: ReservaTablero[];
  /** Días de la semana (1 = lunes … 7 = domingo) que el taller no atiende, según el horario de Configuración. */
  diasCerrados: number[];
};

/**
 * La semana del tablero (HU-29): los espacios y las reservas que caen en alguno de esos días. Pedido 28: también las
 * entregadas, en los días que no usa otra reserva (`entregadasALaVista`); las canceladas no.
 */
export async function semanaDeAgenda(lunes: string, domingo: string): Promise<SemanaDeAgenda> {
  const s = await sucursalPrincipal();
  const enLaSemana = and(eq(trabajo.sucursalId, s.id), ne(trabajo.estado, "cancelado"), lte(trabajo.fechaInicio, domingo), gte(trabajo.fechaFin, lunes));
  const [espacios, reservas, lineas] = await Promise.all([
    db
      .select({ id: espacioTaller.id, nombre: espacioTaller.nombre, activo: espacioTaller.activo })
      .from(espacioTaller)
      .where(eq(espacioTaller.sucursalId, s.id))
      .orderBy(asc(espacioTaller.orden), asc(espacioTaller.id)),
    db
      .select({
        id: trabajo.id,
        espacioId: trabajo.espacioId,
        inicio: trabajo.fechaInicio,
        fin: trabajo.fechaFin,
        estado: trabajo.estado,
        placa: vehiculo.placa,
        cliente: cliente.nombre,
        hora: trabajo.horaIngreso,
      })
      .from(trabajo)
      .innerJoin(vehiculo, eq(trabajo.vehiculoId, vehiculo.id))
      .innerJoin(cliente, eq(trabajo.clienteId, cliente.id))
      .where(enLaSemana)
      .orderBy(asc(trabajo.fechaInicio)),
    db
      .select({ trabajoId: trabajoLinea.trabajoId, descripcion: trabajoLinea.descripcion })
      .from(trabajoLinea)
      .innerJoin(trabajo, eq(trabajoLinea.trabajoId, trabajo.id))
      .where(enLaSemana)
      .orderBy(asc(trabajoLinea.orden)),
  ]);
  const porTrabajo = new Map<number, string[]>();
  for (const l of lineas) porTrabajo.set(l.trabajoId, [...(porTrabajo.get(l.trabajoId) ?? []), l.descripcion]);
  const hoy = fechaEnBolivia();
  // Los tramos de entregadas que caen en la semana (un tramo puede quedar antes del lunes)
  const aLaVista = [...new Set(reservas.map((r) => r.espacioId))]
    .flatMap((espacioId) => entregadasALaVista(reservas.filter((r) => r.espacioId === espacioId), hoy))
    .filter((r) => seCruzan(r, { inicio: lunes, fin: domingo }));
  const conReservas = new Set(aLaVista.map((r) => r.espacioId));
  return {
    espacios: espacios.filter((e) => e.activo || conReservas.has(e.id)),
    // Por espacio, las que ocupan primero: en el día del celular gana la reserva que ocupa sobre la entregada
    reservas: aLaVista.map((r) => {
      const suyas = porTrabajo.get(r.id) ?? [];
      return { ...r, servicio: suyas[0] ?? null, masServicios: Math.max(0, suyas.length - 1) };
    }),
    diasCerrados: s.horarios.filter((d) => d.turnos.length === 0).map((d) => d.dia),
  };
}

export type ReservaEncontrada = Omit<ReservaTablero, "espacioId"> & { espacio: string };

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
      hora: trabajo.horaIngreso,
      espacio: espacioTaller.nombre,
    })
    .from(trabajo)
    .innerJoin(vehiculo, eq(trabajo.vehiculoId, vehiculo.id))
    .innerJoin(cliente, eq(trabajo.clienteId, cliente.id))
    .innerJoin(espacioTaller, eq(trabajo.espacioId, espacioTaller.id))
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
