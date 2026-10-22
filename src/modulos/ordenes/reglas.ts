import type { EstadoTrabajo, EtapaFoto } from "@/db/esquema/trabajos";
import type { Rol } from "@/lib/roles";

// Reglas puras de las órdenes (C4). Una orden es una reserva ya recibida (D-1): el mismo `trabajo`.
// Especificación: docs/08-desarrollo/etapas/C4-taller-entrega.md.

export const NOMBRE_ETAPA: Record<EtapaFoto, string> = { ingreso: "Ingreso", antes: "Antes", durante: "Durante", despues: "Después" };
export const MAXIMO_FOTOS_ETAPA = 20;

/** Ya se recibió: recibido, en proceso, listo o entregado (los mismos de la restricción `trabajo_recibido_si_orden`). */
export const esOrden = (estado: EstadoTrabajo) => estado === "recibido" || estado === "en_proceso" || estado === "listo" || estado === "entregado";

/** Una reserva se recibe desde su día de ingreso (en Bolivia): si el cliente llega antes, primero se reprograma. */
export const puedeRecibirse = (r: { estado: EstadoTrabajo; fechaInicio: string }, hoy: string) => r.estado === "agendado" && r.fechaInicio <= hoy;

/**
 * Si a esa etapa todavía se le suben o quitan fotos. Las de ingreso, solo mientras se recibe: después son la prueba de
 * cómo llegó el vehículo (D-6). Las demás, mientras la orden está abierta (no después de la entrega).
 */
export function etapaAbierta(etapa: EtapaFoto, estado: EstadoTrabajo): boolean {
  if (etapa === "ingreso") return estado === "agendado";
  return estado === "recibido" || estado === "en_proceso" || estado === "listo";
}

/** El técnico solo ve las órdenes asignadas a él (RN-12, S-1); el dueño y el encargado con "Órdenes", todas. */
export const puedeVerOrden = (usuario: { id: string; rol: Rol }, tecnicoId: number | null) => usuario.rol !== "tecnico" || tecnicoId === Number(usuario.id);
