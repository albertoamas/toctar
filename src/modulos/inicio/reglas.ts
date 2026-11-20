import type { EstadoTrabajo } from "@/db/esquema/trabajos";
import { fechaConMes, sumarDias } from "@/lib/fechas";
import { NOMBRE_ESTADO_TRABAJO } from "@/modulos/agenda/reglas";
import { estaAtrasada } from "@/modulos/ordenes/reglas";

// Reglas de la pantalla del día (HU-39). Puras: las prueba tests/unit/inicio.test.ts.
// Especificación: docs/08-desarrollo/etapas/C5-cierre-entrega-2.md §5 y §8.

/** Un ingreso de un día pasado que todavía no llegó: "Debía ingresar el 21 oct.". Si es de hoy, nada. */
export const textoIngresoAtrasado = (fechaInicio: string, hoy: string) => (fechaInicio < hoy ? `Debía ingresar el ${fechaConMes(fechaInicio, hoy)}` : null);

/**
 * Una orden que se debía entregar antes de hoy y sigue en el taller: "Atrasada desde el 22 oct.". Una lista que espera
 * al cliente no está atrasada: el trabajo ya se hizo.
 */
export const textoEntregaAtrasada = (o: { estado: EstadoTrabajo; fechaFin: string }, hoy: string) =>
  estaAtrasada(o, hoy) ? `Atrasada desde el ${fechaConMes(o.fechaFin, hoy)}` : null;

/** Cuándo se entrega: "hoy", "mañana", "ayer" o "16 nov.". */
const diaDeEntrega = (fechaFin: string, hoy: string) =>
  fechaFin === hoy ? "hoy" : fechaFin === sumarDias(hoy, 1) ? "mañana" : fechaFin === sumarDias(hoy, -1) ? "ayer" : fechaConMes(fechaFin, hoy);

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

/**
 * Una fila de "Para hoy" (pedido 26): una reserva que ingresa o una orden que se entrega o espera aviso. Una sola marca
 * por fila (recorrido visual del 19/11, prototipo 4): si algo falla, el problema; si no, el estado.
 */
export type FilaDelDia = {
  id: number;
  placa: string;
  cliente: string;
  estado: EstadoTrabajo;
  /** Lo que falla, en su color: "Debía ingresar el 21 oct." o "Atrasada desde el 22 oct." (rojo), "Sin avisar" (ámbar). */
  problema: { texto: string; tono: "peligro" | "aviso" } | null;
  /** La línea de abajo: cuándo y, si hay un problema, también el estado ("Reservada, por recibir, Espacio 2"). */
  cuando: string;
};

type Ingreso = { id: number; placa: string; cliente: string; espacio: string; fechaInicio: string };
type OrdenDelDia = OrdenAbierta & { id: number; placa: string; cliente: string };

/**
 * Lo del día en una sola lista (pedido 26), en el orden en que se atiende: primero lo que llega (las reservas de hoy y
 * las que debían ingresar antes), después las entregas de hoy y las atrasadas y al final las listas sin avisar. Una
 * orden que es entrega y lista sin avisar va una vez, con sus dos avisos.
 */
export function paraHoy(ingresos: Ingreso[], abiertas: OrdenDelDia[], hoy: string): FilaDelDia[] {
  const { entregas, listas } = ordenesDelDia(abiertas, hoy);
  // Con un problema, el estado va en la línea de abajo, delante de cuándo
  const conEstado = (estado: EstadoTrabajo, problema: FilaDelDia["problema"], cuando: string) =>
    problema ? `${NOMBRE_ESTADO_TRABAJO[estado]}, ${cuando.charAt(0).toLowerCase()}${cuando.slice(1)}` : cuando;
  const llegan = ingresos.map((i) => {
    const atraso = textoIngresoAtrasado(i.fechaInicio, hoy);
    const problema = atraso ? { texto: atraso, tono: "peligro" as const } : null;
    // La que debía llegar antes ya lo dice su problema: aquí, que sigue por recibir
    const cuando = [i.fechaInicio < hoy ? "Por recibir" : "Llega hoy", i.espacio].join(", ");
    return { id: i.id, placa: i.placa, cliente: i.cliente, estado: "agendado" as const, problema, cuando: conEstado("agendado", problema, cuando) };
  });
  const vistas = new Set<number>();
  const ordenes = [...entregas, ...listas]
    .filter((o) => !vistas.has(o.id) && vistas.add(o.id))
    .map((o) => {
      const atraso = textoEntregaAtrasada(o, hoy);
      const problema = atraso ? { texto: atraso, tono: "peligro" as const } : o.sinAvisar ? { texto: "Sin avisar", tono: "aviso" as const } : null;
      return { id: o.id, placa: o.placa, cliente: o.cliente, estado: o.estado, problema, cuando: conEstado(o.estado, problema, `Entrega ${diaDeEntrega(o.fechaFin, hoy)}`) };
    });
  return [...llegan, ...ordenes];
}
