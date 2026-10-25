import "server-only";
import { revalidatePath, updateTag } from "next/cache";
import { ETIQUETA_GALERIA } from "./consultas";

/**
 * La galería cambió: se renueva el sitio público (su caché) y la galería del panel. Lo llaman las acciones de Sitio web
 * (sitio/acciones.ts) y la de publicar desde una orden (ordenes/acciones.ts, HU-41), así ninguna se olvida de una pantalla.
 */
export function galeriaCambiada() {
  updateTag(ETIQUETA_GALERIA);
  revalidatePath("/panel/sitio/galeria");
}
