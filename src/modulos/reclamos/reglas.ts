// Reglas de los reclamos (HU-16, HU-17). Puras: se prueban en tests/unit/reclamos.test.ts.

/** Tiempo mínimo para llenar el formulario: una persona tarda más; un robot lo envía al instante. */
export const MILISEGUNDOS_MINIMOS = 3000;
/** Reclamos por hora desde la misma conexión. */
export const LIMITE_POR_HORA = 5;

export type VeredictoSpam = "aceptar" | "descartar" | "limite";

/**
 * Decide qué hacer con un envío del formulario público.
 * - "descartar": la trampa vino llena o se envió demasiado rápido. No se guarda, pero al visitante se le
 *   muestra la misma confirmación, para no darle pistas a un robot.
 * - "limite": demasiados reclamos desde la misma conexión en la última hora.
 */
export function evaluarEnvio(datos: { trampa: string; abiertoEn: number | null; ahora: number; enLaUltimaHora: number }): VeredictoSpam {
  if (datos.trampa.trim() !== "") return "descartar";
  if (datos.abiertoEn === null || !Number.isFinite(datos.abiertoEn)) return "descartar";
  if (datos.ahora - datos.abiertoEn < MILISEGUNDOS_MINIMOS) return "descartar";
  if (datos.enLaUltimaHora >= LIMITE_POR_HORA) return "limite";
  return "aceptar";
}

/** Primer mensaje al cliente desde el panel (HU-17). */
export function mensajeAlCliente(nombre: string, fecha: string): string {
  return `Hola ${nombre}, te escribimos de TocTar Detailing por el reclamo que nos dejaste el ${fecha}.`;
}
