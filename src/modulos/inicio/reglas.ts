import type { EstadoTrabajo } from "@/db/esquema/trabajos";
import { fechaCorta } from "@/lib/fechas";
import { estaAtrasada, textoEntrega } from "@/modulos/ordenes/reglas";

// Reglas de la pantalla del día (HU-39). Puras: las prueba tests/unit/inicio.test.ts.
// Especificación: docs/08-desarrollo/etapas/C5-cierre-entrega-2.md §5 y §8.

/** Un ingreso de un día pasado que todavía no llegó: "Debía ingresar el 21/10". Si es de hoy, nada. */
export const textoIngresoAtrasado = (fechaInicio: string, hoy: string) => (fechaInicio < hoy ? `Debía ingresar el ${fechaCorta(fechaInicio, hoy)}` : null);

/**
 * Una orden que se debía entregar antes de hoy y sigue en el taller: "Atrasada desde el 22/10". Una lista que espera
 * al cliente no está atrasada: el trabajo ya se hizo.
 */
export const textoEntregaAtrasada = (o: { estado: EstadoTrabajo; fechaFin: string }, hoy: string) =>
  estaAtrasada(o, hoy) ? `Atrasada desde el ${fechaCorta(o.fechaFin, hoy)}` : null;

type OrdenAbierta = { estado: EstadoTrabajo; fechaFin: string; sinAvisar: boolean };

/**
 * Reparte las órdenes abiertas (en el orden de la lista de Órdenes: la entrega más cercana primero, las listas al final)
 * en los dos bloques que las muestran:
 * - entregas: las que se entregan hoy y las atrasadas. Una lista entra solo si se entrega hoy: la que espera al cliente
 *   desde antes ya no es una entrega del día (si no se le avisó, está en el bloque siguiente);
 * - listas: las listas sin avisar.
 */
export function ordenesDelDia<O extends OrdenAbierta>(abiertas: O[], hoy: string): { entregas: O[]; listas: O[] } {
  return {
    entregas: abiertas.filter((o) => (o.estado === "listo" ? o.fechaFin === hoy : o.fechaFin <= hoy)),
    listas: abiertas.filter((o) => o.sinAvisar),
  };
}

/** Una fila de "Para hoy" (pedido 26): una reserva que ingresa o una orden que se entrega o espera aviso. */
export type FilaDelDia = {
  id: number;
  placa: string;
  cliente: string;
  estado: EstadoTrabajo;
  /** Lo que pide atención, en insignias de aviso: "Debía ingresar el 21/10", "Atrasada desde el 22/10", "Sin avisar". */
  avisos: string[];
  /** Cuándo: "Llega a las 8:30, Espacio 2" o "Entrega hoy". */
  cuando: string;
};

type Ingreso = { id: number; placa: string; cliente: string; espacio: string; fechaInicio: string; horaIngreso: string | null };
type OrdenDelDia = OrdenAbierta & { id: number; placa: string; cliente: string };

/**
 * Lo del día en una sola lista (pedido 26), en el orden en que se atiende: primero lo que llega (las reservas de hoy y
 * las que debían ingresar antes), después las entregas de hoy y las atrasadas y al final las listas sin avisar. Una
 * orden que es entrega y lista sin avisar va una vez, con sus dos avisos.
 */
export function paraHoy(ingresos: Ingreso[], abiertas: OrdenDelDia[], hoy: string): FilaDelDia[] {
  const { entregas, listas } = ordenesDelDia(abiertas, hoy);
  const llegan = ingresos.map((i) => ({
    id: i.id,
    placa: i.placa,
    cliente: i.cliente,
    estado: "agendado" as const,
    avisos: [textoIngresoAtrasado(i.fechaInicio, hoy)].filter((a): a is string => a !== null),
    cuando: [i.horaIngreso ? `Llega ${i.horaIngreso}` : "Llega hoy", i.espacio].join(", "),
  }));
  const vistas = new Set<number>();
  const ordenes = [...entregas, ...listas]
    .filter((o) => !vistas.has(o.id) && vistas.add(o.id))
    .map((o) => ({
      id: o.id,
      placa: o.placa,
      cliente: o.cliente,
      estado: o.estado,
      avisos: [textoEntregaAtrasada(o, hoy), o.sinAvisar ? "Sin avisar" : null].filter((a): a is string => a !== null),
      cuando: `Entrega ${textoEntrega(o.fechaFin, hoy).toLowerCase()}`,
    }));
  return [...llegan, ...ordenes];
}
