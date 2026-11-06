import { erroresDe } from "@/lib/formularios";
import { esquemaServiciosReserva } from "./esquemas";

// Nueva reserva en pasos (pedido 41, etapas/P41-reserva-en-pasos.md): el cliente, su vehículo, los servicios y la
// fecha con el adelanto, un paso por pantalla, como Nueva cotización. El cliente y el vehículo se eligen por la
// dirección (?cliente=, ?vehiculo=); los servicios y la fecha son un solo formulario. "Siguiente" revisa los servicios
// con el mismo esquema que la acción. Puro: se prueba en tests/unit/reserva-pasos.test.ts.

export const PASO_CLIENTE = 0;
export const PASO_VEHICULO = 1;
export const PASO_SERVICIOS = 2;
export const PASO_FECHA = 3;

/** Los pasos de la reserva: el adelanto lo registra quien ve pagos (RN-04); los demás solo eligen la fecha. */
export function pasosNuevaReserva(conPagos: boolean) {
  return ["Cliente", "Vehículo", "Servicios", conPagos ? "Fecha y adelanto" : "Fecha"] as const;
}

/** En qué paso está el campo de un error que devolvió la acción: ahí vuelve la pantalla. */
export function pasoDeCampoReserva(campo: string): number {
  return campo === "lineas" || campo.startsWith("lineas.") ? PASO_SERVICIOS : PASO_FECHA;
}

/** Los errores de los servicios (el JSON del editor de líneas), con las mismas claves que devuelve la acción. */
export function erroresServicios(lineas: string): Record<string, string> {
  const r = esquemaServiciosReserva.safeParse({ lineas });
  return r.success ? {} : erroresDe(r.error);
}

/**
 * Dónde empieza el formulario de una reserva sin cotización: en Servicios o, si ya llega con servicios que tienen su
 * precio (un mantenimiento con el suyo, pedido 21), en la fecha.
 */
export function pasoInicialReserva(lineasIniciales: { varianteId: number; precio: string }[]): typeof PASO_SERVICIOS | typeof PASO_FECHA {
  return lineasIniciales.length > 0 && Object.keys(erroresServicios(JSON.stringify(lineasIniciales))).length === 0 ? PASO_FECHA : PASO_SERVICIOS;
}
