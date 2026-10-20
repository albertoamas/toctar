"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath, updateTag } from "next/cache";
import { db } from "@/db";
import { precio, servicio, variante } from "@/db/esquema";
import { erroresDe, type EstadoFormulario } from "@/lib/formularios";
import { exigirModulo } from "@/lib/sesion";
import { ETIQUETA_SERVICIOS } from "@/modulos/sitio/consultas";
import { tamanosActivos } from "@/modulos/configuracion/consultas";
import { historialPrecios, preciosVigentes, type CambioPrecio } from "./consultas";
import { esquemaDatosCatalogo, esquemaIdVariante, esquemaVarianteCatalogo } from "./esquemas";
import { leerMonto, MONTO_MAXIMO, preciosCambiados, type Monto } from "./reglas";

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

const ERROR_MONTO = `Escribe solo números, mayor a cero y hasta ${MONTO_MAXIMO}, por ejemplo 250 o 250,50.`;

/**
 * Precios de una variante por tamaño y su duración propia (HU-20, RF-26, RF-27). Los precios nunca se pisan: solo se
 * inserta una fila nueva por cada tamaño que cambió (D-3), con quién y cuándo (RNF-10). Cada campo se llama
 * "precio-<id del tamaño>"; vacío es "según evaluación".
 */
export async function guardarPreciosVariante(_previo: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const autor = await exigirModulo("catalogo");
  const valores: Record<string, string> = {};
  for (const [clave, valor] of datos.entries()) if (typeof valor === "string") valores[clave] = valor;

  const entrada = esquemaVarianteCatalogo.safeParse({ varianteId: valores.varianteId, duracionDias: valores.duracionDias });
  const errores: Record<string, string> = entrada.success ? {} : erroresDe(entrada.error);
  const tamanos = await tamanosActivos();
  const enviados = new Map<number, Monto>();
  for (const t of tamanos) {
    const monto = leerMonto(valores[`precio-${t.id}`] ?? "");
    if (monto === undefined) errores[`precio-${t.id}`] = ERROR_MONTO;
    else enviados.set(t.id, monto);
  }
  if (!entrada.success || Object.keys(errores).length > 0) return { errores, valores };
  const { varianteId, duracionDias } = entrada.data;

  const [elegida] = await db
    .select({ servicioId: variante.servicioId })
    .from(variante)
    .where(and(eq(variante.id, varianteId), eq(variante.activo, true)));
  if (!elegida) return { mensaje: "Esa variante ya no existe o está desactivada. Recarga la página." };

  const vigentes = new Map((await preciosVigentes([varianteId])).map((p) => [p.tamanoId, p.monto]));
  const cambios = preciosCambiados(vigentes, enviados);
  const [antes] = await db.select({ duracionDias: variante.duracionDias }).from(variante).where(eq(variante.id, varianteId));
  if (cambios.length === 0 && antes.duracionDias === duracionDias) return { ok: true, mensaje: "No había cambios." };

  await db.transaction(async (tx) => {
    if (antes.duracionDias !== duracionDias) await tx.update(variante).set({ duracionDias }).where(eq(variante.id, varianteId));
    if (cambios.length > 0) {
      await tx.insert(precio).values(cambios.map((c) => ({ varianteId, tamanoId: c.tamanoId, monto: c.monto, createdBy: Number(autor.id) })));
    }
  });

  revalidatePath("/panel/catalogo");
  revalidatePath(`/panel/catalogo/${elegida.servicioId}`);
  return { ok: true, mensaje: "Precios guardados." };
}

/** Historial de precios de una variante, para el diálogo "Ver historial" (RF-28, RNF-10). */
export async function verHistorialPrecios(varianteId: number): Promise<CambioPrecio[]> {
  await exigirModulo("catalogo");
  const id = esquemaIdVariante.parse(varianteId);
  return historialPrecios(id);
}
