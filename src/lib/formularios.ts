import type { z } from "zod";

// Respuesta común de las acciones de formulario del panel.

export type EstadoFormulario = {
  ok?: boolean;
  mensaje?: string;
  errores?: Partial<Record<string, string>>;
  valores?: Record<string, string>;
};

/**
 * Si el error de la base es por un índice único (código 23505 de PostgreSQL), devuelve el nombre del índice;
 * si no, null. El índice frena repetidos aunque dos personas guarden a la vez: la acción lo traduce a un
 * error del campo. Drizzle envuelve el error de pg en `cause`.
 */
export const indiceUnicoViolado = (error: unknown) => restriccionViolada(error, "23505");

/** La restricción que rechazó la escritura si el error de Postgres tiene ese código; si no, null. */
function restriccionViolada(error: unknown, codigo: string): string | null {
  const e = error as { code?: string; constraint?: string; cause?: { code?: string; constraint?: string } };
  const causa = e?.cause?.code ? e.cause : e;
  if (causa?.code !== codigo) return null;
  return causa.constraint ?? "";
}

/**
 * Nombre de la restricción de exclusión que rechazó la escritura (código 23P01), o null. La de la agenda impide que un
 * espacio tenga dos trabajos el mismo día aunque dos personas reserven a la vez (D-5).
 */
export const exclusionViolada = (error: unknown) => restriccionViolada(error, "23P01");

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
