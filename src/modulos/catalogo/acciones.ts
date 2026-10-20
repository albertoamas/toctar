"use server";

import { eq } from "drizzle-orm";
import { revalidatePath, updateTag } from "next/cache";
import { db } from "@/db";
import { servicio } from "@/db/esquema";
import { erroresDe, type EstadoFormulario } from "@/lib/formularios";
import { exigirModulo } from "@/lib/sesion";
import { ETIQUETA_SERVICIOS } from "@/modulos/sitio/consultas";
import { esquemaDatosCatalogo } from "./esquemas";

// Catálogo y precios (HU-19, HU-20). Solo el dueño (módulo "catalogo", RN-01).

/** Duración, mantenimiento y si el servicio está activo (HU-19, RF-27, RF-28, RN-08). */
export async function guardarDatosCatalogo(_previo: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const autor = await exigirModulo("catalogo");
  const generaMantenimiento = datos.get("generaMantenimiento") === "on";
  const activo = datos.get("activo") === "on";
  const valores = {
    id: String(datos.get("id") ?? ""),
    duracionDias: String(datos.get("duracionDias") ?? ""),
    generaMantenimiento: generaMantenimiento ? "on" : "",
    activo: activo ? "on" : "",
  };
  const entrada = esquemaDatosCatalogo.safeParse({ ...valores, generaMantenimiento, activo });
  if (!entrada.success) return { errores: erroresDe(entrada.error), valores };
  const { id, duracionDias } = entrada.data;

  const [actualizado] = await db
    .update(servicio)
    .set({ duracionDias, generaMantenimiento, activo, updatedAt: new Date(), updatedBy: Number(autor.id) })
    .where(eq(servicio.id, id))
    .returning({ id: servicio.id });
  if (!actualizado) return { mensaje: "Ese servicio ya no existe. Recarga la página." };

  // Un servicio inactivo deja de salir en el sitio: se invalida su caché.
  updateTag(ETIQUETA_SERVICIOS);
  revalidatePath("/panel/catalogo");
  revalidatePath(`/panel/catalogo/${id}`);
  revalidatePath("/panel/sitio");
  return { ok: true, mensaje: "Cambios guardados." };
}
