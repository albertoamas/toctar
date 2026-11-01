import "server-only";
import { and, eq } from "drizzle-orm";
import type { Transaccion } from "@/db";
import { trabajoFoto, trabajoRevision } from "@/db/esquema";
import { eliminarFoto } from "@/lib/fotos";

// Las fotos de ingreso y el checklist (pedido 12) de una reserva que no se recibió: si se reprograma o se cancela, lo de
// hoy no prueba cómo llega el vehículo otro día (o nunca). Se quitan de la reserva dentro de la transacción y los
// archivos se borran después.

/** Quita de la reserva sus fotos de ingreso y los detalles del checklist; devuelve los archivos para borrarlos al confirmar. */
export async function soltarFotosIngreso(tx: Transaccion, trabajoId: number): Promise<number[]> {
  const sueltas = await tx
    .delete(trabajoFoto)
    .where(and(eq(trabajoFoto.trabajoId, trabajoId), eq(trabajoFoto.etapa, "ingreso")))
    .returning({ archivoId: trabajoFoto.archivoId });
  const detalles = await tx.delete(trabajoRevision).where(eq(trabajoRevision.trabajoId, trabajoId)).returning({ archivoId: trabajoRevision.archivoId });
  return [...sueltas.map((f) => f.archivoId), ...detalles.flatMap((d) => (d.archivoId ? [d.archivoId] : []))];
}

/** Borra los archivos que soltó `soltarFotosIngreso`. Si uno falla, no frena a los demás. */
export async function borrarFotosSueltas(archivos: number[]) {
  await Promise.allSettled(archivos.map((id) => eliminarFoto(id).catch((e) => console.error("No se pudo borrar la foto de ingreso", e))));
}
