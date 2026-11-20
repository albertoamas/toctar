import { erroresDe } from "@/lib/formularios";
import { esquemaFechas, esquemaServiciosReserva } from "./esquemas";

// Nueva reserva en pasos (pedido 41, etapas/P41-reserva-en-pasos.md): el cliente, su vehículo, los servicios y la
// fecha con el adelanto, un paso por pantalla, como Nueva cotización. El cliente y el vehículo se eligen por la
// dirección (?cliente=, ?vehiculo=); los servicios y la fecha son un solo formulario. "Siguiente" revisa los servicios
// con el mismo esquema que la acción. Puro: se prueba en tests/unit/reserva-pasos.test.ts.
// Recorrido visual del 20/11 (a pedido del dueño): la fecha y el adelanto, en pasos separados. Antes iban juntos con la
// fecha de hoy y el adelanto sugerido ya puestos, y un "Reservar" apurado registraba una fecha que no se eligió o un
// adelanto que el cliente no dejó. Ahora la fecha llega vacía (salvo desde un día libre de la Agenda) y el adelanto
// pregunta "¿Dejó adelanto?" sin respuesta elegida.

export const PASO_CLIENTE = 0;
export const PASO_VEHICULO = 1;
export const PASO_SERVICIOS = 2;
export const PASO_FECHA = 3;
export const PASO_ADELANTO = 4;

/** Los pasos de la reserva: el adelanto lo registra quien ve pagos (RN-04), en su propio paso; los demás terminan en la fecha. */
export function pasosNuevaReserva(conPagos: boolean): readonly string[] {
  return conPagos ? ["Cliente", "Vehículo", "Servicios", "Fecha", "Adelanto"] : ["Cliente", "Vehículo", "Servicios", "Fecha"];
}

/** Los campos del paso del adelanto. */
const CAMPOS_ADELANTO = new Set(["dejoAdelanto", "adelanto", "metodo", "comprobante"]);

/** En qué paso está el campo de un error que devolvió la acción: ahí vuelve la pantalla. */
export function pasoDeCampoReserva(campo: string): number {
  if (campo === "lineas" || campo.startsWith("lineas.")) return PASO_SERVICIOS;
  return CAMPOS_ADELANTO.has(campo) ? PASO_ADELANTO : PASO_FECHA;
}

/**
 * Los errores del paso de la fecha antes de pasar al adelanto: las fechas con el mismo esquema que la acción y el espacio
 * elegido. Que el espacio siga libre lo mira el servidor al reservar.
 */
export function erroresFecha(datos: { fechaInicio: string; fechaFin: string; espacioId: string }): Record<string, string> {
  const r = esquemaFechas.safeParse({ fechaInicio: datos.fechaInicio, fechaFin: datos.fechaFin });
  const errores = r.success ? {} : erroresDe(r.error);
  return datos.espacioId ? errores : { ...errores, espacioId: "Elige el espacio." };
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
