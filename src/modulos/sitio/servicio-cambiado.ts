import "server-only";
import { revalidatePath, updateTag } from "next/cache";
import { ETIQUETA_SERVICIOS } from "./consultas";

/**
 * Un servicio cambió (su página, su nombre, sus variantes o si está activo): se renueva lo que lo muestra. El sitio
 * público (su caché), la lista y la página del servicio en Sitio web, y el catálogo. Lo llaman las acciones de los dos
 * lados (sitio/acciones.ts y catalogo/acciones.ts), así ninguno se olvida de una pantalla.
 */
export function servicioCambiado(id?: number) {
  updateTag(ETIQUETA_SERVICIOS);
  revalidatePath("/panel/sitio");
  revalidatePath("/panel/catalogo");
  if (id) {
    revalidatePath(`/panel/sitio/servicios/${id}`);
    revalidatePath(`/panel/catalogo/${id}`);
  }
}
