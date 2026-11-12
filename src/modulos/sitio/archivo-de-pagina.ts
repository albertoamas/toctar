import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { contenidoPagina } from "@/db/esquema";

/** Las columnas de `contenido_pagina` que apuntan a un archivo: la foto (HU-08) y el video de la portada (pedido 48). */
type CampoArchivo = "fotoArchivoId" | "videoArchivoId";

/**
 * Pone el archivo de una página (o ninguno) y devuelve el que tenía, en una transacción con la fila bloqueada: dos
 * cambios a la vez no dejan un archivo sin borrar. Si falta la fila, es un error de datos (como en `leerContenido`).
 */
export async function cambiarArchivoDePagina(pagina: string, campo: CampoArchivo, archivoId: number | null, autorId: number): Promise<number | null> {
  return db.transaction(async (tx) => {
    const donde = eq(contenidoPagina.clave, pagina);
    const [fila] = await tx.select({ actual: contenidoPagina[campo] }).from(contenidoPagina).where(donde).for("update");
    if (!fila) throw new Error(`Falta la fila "${pagina}" en contenido_pagina: aplica las migraciones.`);
    await tx.update(contenidoPagina).set({ [campo]: archivoId, updatedAt: new Date(), updatedBy: autorId }).where(donde);
    return fila.actual;
  });
}
