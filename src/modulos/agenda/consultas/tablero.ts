import "server-only";

import { and, asc, desc, eq, gte, inArray, like, lte, ne, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { cliente, trabajo, trabajoLinea, vehiculo } from "@/db/esquema";
import { type EstadoTrabajo } from "@/db/esquema/trabajos";
import { fechaEnBolivia } from "@/lib/fechas";
import { escaparLike, normalizarBusqueda } from "@/modulos/clientes/reglas";
import { sucursalPrincipal } from "@/modulos/configuracion/consultas";
import { diasDeLaSemana, ocupadosEnDia, seCruzan, ultimoDiaOcupado } from "../reglas";

// Lecturas de la agenda (C3). Quien las llama ya pasó por exigirModulo("agenda"); los montos y pagos solo se piden
// para quien además ve "pagos" (o el dueño). Especificación: docs/08-desarrollo/etapas/C3-agenda-pagos.md.
// Aquí: la semana del tablero de la agenda y la búsqueda de reservas.

export type ReservaTablero = {
  id: number;
  /** La entrega aproximada que tiene: una orden atrasada se ve hasta hoy (`fin`), pero se atrasó desde esta. */
  entrega: string;
  inicio: string;
  fin: string;
  estado: EstadoTrabajo;
  placa: string;
  cliente: string;
  /** La hora de ingreso acordada ("09:00"), si se cargó. */
  /** El primer servicio y cuántos más lleva ("Pulido y nano cerámico — 5 años", 1). */
  servicio: string | null;
  masServicios: number;
};

export type SemanaDeAgenda = {
  /** Cuántos autos hay cada día de la semana ("AAAA-MM-DD" → n): las reservas y las órdenes en el taller. */
  autos: Record<string, number>;
  reservas: ReservaTablero[];
  /** Días de la semana (1 = lunes … 7 = domingo) que el taller no atiende, según el horario de Configuración. */
  diasCerrados: number[];
};

/**
 * La semana de la Agenda (HU-29): las reservas que caen en alguno de esos días (pedido 55: sin espacios ni límite). Una
 * orden que sigue en el taller con la entrega pasada (atrasada) llega hasta hoy. Pedido 28: las entregadas, en los días
 * que estuvieron, solo con `conEntregadas` (20/11: llenaban la semana; ahora se ven al pedirlas). Las canceladas, nunca.
 */
export async function semanaDeAgenda(lunes: string, domingo: string, conEntregadas = false): Promise<SemanaDeAgenda> {
  const s = await sucursalPrincipal();
  const hoy = fechaEnBolivia();
  const enLaSemana = and(
    eq(trabajo.sucursalId, s.id),
    conEntregadas ? ne(trabajo.estado, "cancelado") : inArray(trabajo.estado, ["agendado", "recibido", "en_proceso", "listo"]),
    lte(trabajo.fechaInicio, domingo),
    // Las que siguen en el taller llegan hasta hoy aunque su entrega haya pasado
    or(gte(trabajo.fechaFin, lunes), inArray(trabajo.estado, ["recibido", "en_proceso", "listo"])),
  );
  const [reservas, lineas] = await Promise.all([
    db
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
      .where(enLaSemana)
      .orderBy(asc(trabajo.fechaInicio), asc(trabajo.id)),
    db
      .select({ trabajoId: trabajoLinea.trabajoId, descripcion: trabajoLinea.descripcion })
      .from(trabajoLinea)
      .innerJoin(trabajo, eq(trabajoLinea.trabajoId, trabajo.id))
      .where(enLaSemana)
      .orderBy(asc(trabajoLinea.orden)),
  ]);
  const porTrabajo = new Map<number, string[]>();
  for (const l of lineas) porTrabajo.set(l.trabajoId, [...(porTrabajo.get(l.trabajoId) ?? []), l.descripcion]);
  // Hasta dónde se ve cada una: una atrasada, hasta hoy; una entregada, hasta el día que salió (y no después de hoy)
  const aLaVista = reservas
    .map((r) => ({ ...r, entrega: r.fin, fin: ultimoDiaOcupado(r, hoy) ?? (r.fin > hoy ? hoy : r.fin) }))
    .filter((r) => r.inicio <= r.fin && seCruzan(r, { inicio: lunes, fin: domingo }));
  const autos = Object.fromEntries(diasDeLaSemana(lunes).map((dia) => [dia, ocupadosEnDia(reservas, dia, hoy)]));
  return {
    autos,
    reservas: aLaVista.map((r) => {
      const suyas = porTrabajo.get(r.id) ?? [];
      return { ...r, servicio: suyas[0] ?? null, masServicios: Math.max(0, suyas.length - 1) };
    }),
    diasCerrados: s.horarios.filter((d) => d.turnos.length === 0).map((d) => d.dia),
  };
}

export type ReservaEncontrada = Omit<ReservaTablero, "entrega">;

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
