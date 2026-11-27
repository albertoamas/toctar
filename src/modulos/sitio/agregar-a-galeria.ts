import "server-only";
import { max } from "drizzle-orm";
import { db, type Transaccion } from "@/db";
import { galeriaItem } from "@/db/esquema";

type NuevoTrabajo = Omit<typeof galeriaItem.$inferInsert, "id" | "orden" | "visible" | "enPortada">;

/**
 * Agrega un trabajo al final de la galería, visible y fuera de la portada. Lo usan la galería del panel (HU-09) y
 * publicar desde una orden (HU-41): un solo lugar decide cómo nace un trabajo de la galería. Devuelve su id.
 */
export async function agregarAGaleria(trabajo: NuevoTrabajo, base: Transaccion | typeof db = db): Promise<number> {
  const [{ ultimo }] = await base.select({ ultimo: max(galeriaItem.orden) }).from(galeriaItem);
  const [fila] = await base
    .insert(galeriaItem)
    .values({ ...trabajo, orden: (ultimo ?? 0) + 1 })
    .returning({ id: galeriaItem.id });
  return fila.id;
}
