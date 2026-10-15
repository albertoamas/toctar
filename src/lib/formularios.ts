import type { z } from "zod";

// Respuesta común de las acciones de formulario del panel.

export type EstadoFormulario = {
  ok?: boolean;
  mensaje?: string;
  errores?: Partial<Record<string, string>>;
  valores?: Record<string, string>;
};

/**
 * Errores por campo: el primero de cada uno. En los campos que son listas (beneficios, pasos)
 * el error va a la fila: "pasos.2" es el tercer paso.
 */
export function erroresDe(error: z.ZodError): Record<string, string> {
  const errores: Record<string, string> = {};
  for (const i of error.issues) {
    const clave = typeof i.path[1] === "number" ? `${String(i.path[0])}.${i.path[1]}` : String(i.path[0]);
    errores[clave] ??= i.message;
  }
  return errores;
}
