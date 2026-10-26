import type { EstadoTrabajo } from "@/db/esquema/trabajos";
import { fechaCorta } from "@/lib/fechas";
import { estaAtrasada } from "@/modulos/ordenes/reglas";

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
