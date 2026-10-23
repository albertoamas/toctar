import type { EstadoTrabajo, EtapaFoto } from "@/db/esquema/trabajos";

// Reglas puras de las órdenes (C4). Una orden es una reserva ya recibida (D-1): el mismo `trabajo`.
// Especificación: docs/08-desarrollo/etapas/C4-taller-entrega.md.

export const NOMBRE_ETAPA: Record<EtapaFoto, string> = { ingreso: "Ingreso", antes: "Antes", durante: "Durante", despues: "Después" };
export const MAXIMO_FOTOS_ETAPA = 20;

/**
 * Una orden abierta: recibida, en proceso o lista (se trabaja, se le suben fotos). Aquí y no desde el esquema de la
 * base: estas reglas también corren en el navegador, que no carga Drizzle.
 */
export const ESTADOS_ORDEN_ABIERTA = ["recibido", "en_proceso", "listo"] as const satisfies readonly EstadoTrabajo[];
const abierta = (estado: EstadoTrabajo) => (ESTADOS_ORDEN_ABIERTA as readonly EstadoTrabajo[]).includes(estado);

/** Ya se recibió: abierta o entregada (los mismos de la restricción `trabajo_recibido_si_orden`). */
export const esOrden = (estado: EstadoTrabajo) => abierta(estado) || estado === "entregado";

/** Una reserva se recibe desde su día de ingreso (en Bolivia): si el cliente llega antes, primero se reprograma. */
export const puedeRecibirse = (r: { estado: EstadoTrabajo; fechaInicio: string }, hoy: string) => r.estado === "agendado" && r.fechaInicio <= hoy;

/**
 * Si a esa etapa todavía se le suben o quitan fotos. Las de ingreso, solo mientras se recibe: después son la prueba de
 * cómo llegó el vehículo (D-6). Las demás, mientras la orden está abierta (no después de la entrega).
 */
export function etapaAbierta(etapa: EtapaFoto, estado: EstadoTrabajo): boolean {
  if (etapa === "ingreso") return estado === "agendado";
  return abierta(estado);
}
