import type { EstadoTrabajo } from "@/db/esquema/trabajos";
import { fechaCorta } from "@/lib/fechas";
import { estaAtrasada } from "@/modulos/ordenes/reglas";

// Textos de la pantalla del día (HU-39). Reglas puras: las prueba tests/unit/inicio.test.ts.
// Especificación: docs/08-desarrollo/etapas/C5-cierre-entrega-2.md §5 y §8.

/** Un ingreso de un día pasado que todavía no llegó: "Debía ingresar el 21/10". Si es de hoy, nada. */
export const textoIngresoAtrasado = (fechaInicio: string, hoy: string) => (fechaInicio < hoy ? `Debía ingresar el ${fechaCorta(fechaInicio, hoy)}` : null);

/**
 * Una orden que se debía entregar antes de hoy y sigue en el taller: "Atrasada desde el 22/10". Una lista que espera
 * al cliente no está atrasada: el trabajo ya se hizo.
 */
export const textoEntregaAtrasada = (o: { estado: EstadoTrabajo; fechaFin: string }, hoy: string) =>
  estaAtrasada(o, hoy) ? `Atrasada desde el ${fechaCorta(o.fechaFin, hoy)}` : null;

/** "3 vencidos", "1 vencido": la cantidad con su palabra. */
export const cantidad = (n: number, singular: string, plural: string) => `${n} ${n === 1 ? singular : plural}`;
