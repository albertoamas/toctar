import type { EstadoConsulta } from "@/db/esquema/consultas";
import type { EstadoTrabajo } from "@/db/esquema/trabajos";

// Los pasos de un trabajo, de la cotización a la entrega (pedido 31, etapas/P31-flujo-de-un-trabajo.md §2 A1). Puros:
// los prueba tests/unit/pasos-trabajo.test.ts.

/** Los seis pasos, en el orden en que avanza un trabajo. */
export const PASOS_TRABAJO = ["Cotizada", "Aceptada", "Reservada", "En el taller", "Lista", "Entregada"] as const;

/** Donde empieza el camino de una reserva sin cotización (una directa o un mantenimiento): en "Reservada". */
export const PRIMER_PASO_SIN_COTIZACION = 2;

const PASO_DEL_TRABAJO: Record<Exclude<EstadoTrabajo, "cancelado">, number> = {
  agendado: 2,
  recibido: 3,
  en_proceso: 3,
  listo: 4,
  entregado: 5,
};

/**
 * En qué paso está: el del trabajo si tiene uno activo (no cancelado); si no, el de la cotización. Una cotización
 * rechazada, o un trabajo cancelado sin cotización viva, no está en ningún paso (null): su estado ya lo dice.
 */
export function pasoDelTrabajo(t: { cotizacion?: EstadoConsulta | null; trabajo?: EstadoTrabajo | null }): number | null {
  if (t.trabajo && t.trabajo !== "cancelado") return PASO_DEL_TRABAJO[t.trabajo];
  if (t.cotizacion === "cotizado") return 0;
  if (t.cotizacion === "confirmado") return 1;
  return null;
}

/**
 * El paso siguiente de un trabajo del día, con el mismo texto que el botón de su pantalla (para la columna de "Para
 * hoy"): una lista sin avisar espera el aviso; avisada, la entrega.
 */
export function pasoSiguiente(estado: EstadoTrabajo, sinAvisar: boolean): string | null {
  switch (estado) {
    case "agendado":
      return "Recibir vehículo";
    case "recibido":
      return "Empezar trabajo";
    case "en_proceso":
      return "Marcar listo";
    case "listo":
      return sinAvisar ? "Avisar por WhatsApp" : "Entregar vehículo";
    default:
      return null;
  }
}
