import "server-only";

import { eq } from "drizzle-orm";
import { revalidatePath, updateTag } from "next/cache";
import { db } from "@/db";
import { servicio } from "@/db/esquema";
import { ETIQUETA_CONTENIDO } from "../consultas";

// Sitio web (HU-07 a HU-09; RF-10 a RF-12). Entra el dueño o un encargado con el permiso "sitio". Al guardar se
// invalida lo que muestra el sitio, que se renueva sin volver a desplegar (B4).
// Aquí: lo que comparten las acciones del sitio (el error de una foto, si un servicio existe y la actualización de las
// pantallas después de cambiar un texto).

const RUTA = "/panel/sitio";

export const ERROR_FOTO = "La foto debe ser JPG, PNG o WebP de hasta 5 MB.";

export function despuesDeCambiarContenido(ruta: "textos" | "preguntas") {
  updateTag(ETIQUETA_CONTENIDO);
  revalidatePath(`${RUTA}/${ruta}`);
}

export async function servicioExiste(id: number): Promise<boolean> {
  const [fila] = await db.select({ id: servicio.id }).from(servicio).where(eq(servicio.id, id));
  return !!fila;
}
