import "server-only";
import { and, eq } from "drizzle-orm";
import type { Transaccion } from "@/db";
import { trabajoFoto } from "@/db/esquema";
import { eliminarFoto } from "@/lib/fotos";

// Las fotos de ingreso de una reserva que no se recibió: si se reprograma o se cancela, las de hoy no prueban cómo
// llega el vehículo otro día (o nunca). Se quitan de la reserva dentro de la transacción y se borran después.

/** Quita de la reserva sus fotos de ingreso; devuelve los archivos para borrarlos al confirmar la transacción. */
export async function soltarFotosIngreso(tx: Transaccion, trabajoId: number): Promise<number[]> {
  const sueltas = await tx
    .delete(trabajoFoto)
    .where(and(eq(trabajoFoto.trabajoId, trabajoId), eq(trabajoFoto.etapa, "ingreso")))
    .returning({ archivoId: trabajoFoto.archivoId });
  return sueltas.map((f) => f.archivoId);
}

/** Borra los archivos que soltó `soltarFotosIngreso`. Si uno falla, no frena a los demás. */
export async function borrarFotosSueltas(archivos: number[]) {
  await Promise.allSettled(archivos.map((id) => eliminarFoto(id).catch((e) => console.error("No se pudo borrar la foto de ingreso", e))));
}
