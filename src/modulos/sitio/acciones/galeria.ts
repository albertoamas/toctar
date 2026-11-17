"use server";

import { and, eq, inArray, isNotNull, TransactionRollbackError } from "drizzle-orm";
import { db } from "@/db";
import { galeriaItem, servicio } from "@/db/esquema";
import { erroresDe, indiceUnicoViolado, type EstadoFormulario } from "@/lib/formularios";
import { eliminarFotosSinFallar, guardarFoto } from "@/lib/fotos";
import { reordenar, type Direccion } from "@/lib/orden";
import { exigirModulo } from "@/lib/sesion";
import { agregarAGaleria } from "../agregar-a-galeria";
import { listarGaleria, servicioEnSitio } from "../consultas";
import { galeriaCambiada } from "../galeria-cambiada";
import { esquemaEditarGaleria, esquemaGaleria, esquemaId, esquemaMover, esquemaVisibilidad } from "../esquemas";
import { ERROR_FOTO, servicioExiste } from "./comun";

// Sitio web (HU-07 a HU-09; RF-10 a RF-12). Entra el dueño o un encargado con el permiso "sitio". Al guardar se
// invalida lo que muestra el sitio, que se renueva sin volver a desplegar (B4).
// Aquí: la galería de trabajos y cuál va en la portada.

/** Sube un par antes y después, o una foto sola (va como "después"). */
const SIN_FOTO_DESPUES = "Elige la foto del resultado.";

export async function subirGaleria(_previo: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const autor = await exigirModulo("sitio");
  const valores = { servicioId: String(datos.get("servicioId") ?? ""), descripcion: String(datos.get("descripcion") ?? "") };
  // Si falta la foto del resultado, se avisa junto con los demás errores y no en un segundo intento (pulido 4.7)
  const archivoDespues = datos.get("despues");
  const sinDespues = !(archivoDespues instanceof File && archivoDespues.size > 0) ? { despues: SIN_FOTO_DESPUES } : {};
  const entrada = esquemaGaleria.safeParse(valores);
  if (!entrada.success) return { errores: { ...sinDespues, ...erroresDe(entrada.error) }, valores };
  if (!(await servicioExiste(entrada.data.servicioId))) return { errores: { ...sinDespues, servicioId: "Elige el servicio." }, valores };

  const opciones = { carpeta: "galeria", miniatura: true, autorId: Number(autor.id) };
  const despues = await guardarFoto(datos.get("despues"), opciones);
  if (!despues.ok) {
    return { errores: { despues: despues.motivo === "vacia" ? SIN_FOTO_DESPUES : ERROR_FOTO }, valores };
  }
  const entradaAntes = datos.get("antes");
  const conAntes = entradaAntes instanceof File && entradaAntes.size > 0;
  // Si falla la foto del antes o el registro, no queda ninguna foto suelta (auditoría QA-06)
  const subidas = [despues.archivoId];
  const deshacer = () => eliminarFotosSinFallar(subidas, "No se pudo borrar una foto de la galería que no se guardó");
  let antes: Awaited<ReturnType<typeof guardarFoto>> | null;
  try {
    antes = conAntes ? await guardarFoto(entradaAntes, opciones) : null;
    if (antes && !antes.ok) {
      await deshacer();
      return { errores: { antes: ERROR_FOTO }, valores };
    }
    if (antes) subidas.push(antes.archivoId);
    await agregarAGaleria({
      servicioId: entrada.data.servicioId,
      descripcion: entrada.data.descripcion,
      fotoDespuesId: despues.archivoId,
      fotoAntesId: antes?.archivoId ?? null,
      createdBy: Number(autor.id),
    });
  } catch (error) {
    await deshacer();
    throw error;
  }

  galeriaCambiada();
  return { ok: true, mensaje: antes ? "Fotos guardadas." : "Foto guardada." };
}

export async function guardarGaleriaItem(_previo: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  await exigirModulo("sitio");
  const valores = { servicioId: String(datos.get("servicioId") ?? ""), descripcion: String(datos.get("descripcion") ?? "") };
  const entrada = esquemaEditarGaleria.safeParse({ ...valores, id: datos.get("id") });
  if (!entrada.success) return { errores: erroresDe(entrada.error), valores };
  if (!(await servicioExiste(entrada.data.servicioId))) return { errores: { servicioId: "Elige el servicio." }, valores };

  const [fila] = await db
    .update(galeriaItem)
    .set({ servicioId: entrada.data.servicioId, descripcion: entrada.data.descripcion })
    .where(eq(galeriaItem.id, entrada.data.id))
    .returning({ id: galeriaItem.id });
  if (!fila) return { mensaje: "Esa foto ya no existe. Recarga la página." };
  galeriaCambiada();
  return { ok: true, mensaje: "Cambios guardados." };
}

export async function moverGaleriaItem(datos: { id: number; direccion: Direccion }): Promise<EstadoFormulario> {
  await exigirModulo("sitio");
  const entrada = esquemaMover.safeParse(datos);
  if (!entrada.success) return { mensaje: "No se pudo mover." };
  const items = (await listarGaleria()).map((g) => ({ id: g.id, orden: g.orden, activo: true }));
  const nuevoOrden = reordenar(items, entrada.data.id, entrada.data.direccion);
  if (!nuevoOrden) return { ok: true };
  await db.transaction(async (tx) => {
    for (const o of nuevoOrden) await tx.update(galeriaItem).set({ orden: o.orden }).where(eq(galeriaItem.id, o.id));
  });
  galeriaCambiada();
  return { ok: true };
}

export async function cambiarVisibilidadGaleria(datos: { id: number; visible: boolean }): Promise<EstadoFormulario> {
  await exigirModulo("sitio");
  const entrada = esquemaVisibilidad.safeParse(datos);
  if (!entrada.success) return { mensaje: "Esa foto ya no existe. Recarga la página." };
  const { id, visible } = entrada.data;
  // Oculto, deja de ser el elegido de la portada: si no, al volver a mostrarlo la portada cambiaría sola
  const cambios = visible ? { visible } : { visible, enPortada: false };
  const [fila] = await db.update(galeriaItem).set(cambios).where(eq(galeriaItem.id, id)).returning({ id: galeriaItem.id });
  if (!fila) return { mensaje: "Esa foto ya no existe. Recarga la página." };
  galeriaCambiada();
  return { ok: true, mensaje: visible ? "La foto se ve en el sitio." : "Foto oculta: no se ve en el sitio." };
}

/**
 * Elige el trabajo del comparador de la portada (pedido de la demo del 24/10). Uno solo, con foto de antes y que se
 * vea en el sitio (visible, de un servicio visible): la misma regla que `trabajoDePortada`, así el aviso no miente.
 */
const NO_VA_EN_PORTADA = "Ese trabajo ya no se puede mostrar en la portada. Recarga la página.";

export async function elegirParaPortada(datoId: number): Promise<EstadoFormulario> {
  await exigirModulo("sitio");
  const entrada = esquemaId.safeParse(datoId);
  if (!entrada.success) return { mensaje: NO_VA_EN_PORTADA };
  // Primero se quita la anterior (el índice único admite una sola) y después se marca la nueva, solo si todavía
  // cumple todo: si la borraron u ocultaron entretanto, no se marca nada y se deshace también lo primero.
  const marcada = await db
    .transaction(async (tx) => {
      await tx.update(galeriaItem).set({ enPortada: false }).where(eq(galeriaItem.enPortada, true));
      const [fila] = await tx
        .update(galeriaItem)
        .set({ enPortada: true })
        .where(
          and(
            eq(galeriaItem.id, entrada.data),
            eq(galeriaItem.visible, true),
            isNotNull(galeriaItem.fotoAntesId),
            inArray(galeriaItem.servicioId, tx.select({ id: servicio.id }).from(servicio).where(servicioEnSitio)),
          ),
        )
        .returning({ id: galeriaItem.id });
      if (!fila) tx.rollback();
      return true;
    })
    .catch((error: unknown) => {
      if (error instanceof TransactionRollbackError) return false;
      // Otra persona eligió al mismo tiempo: el índice único frena la segunda elección
      if (indiceUnicoViolado(error) !== null) return false;
      throw error;
    });
  if (!marcada) return { mensaje: NO_VA_EN_PORTADA };
  galeriaCambiada();
  return { ok: true, mensaje: "Listo: este trabajo se ve en la portada." };
}

/** Las fotos de la galería no tienen historial: se borran, también del almacenamiento. */
export async function eliminarGaleriaItem(datoId: number): Promise<EstadoFormulario> {
  await exigirModulo("sitio");
  const entrada = esquemaId.safeParse(datoId);
  if (!entrada.success) return { mensaje: "Esa foto ya no existe. Recarga la página." };
  const [fila] = await db.delete(galeriaItem).where(eq(galeriaItem.id, entrada.data)).returning();
  if (!fila) return { mensaje: "Esa foto ya no existe. Recarga la página." };
  // Primero sale del sitio; después se borran los archivos (si el almacenamiento falla, ya no se ven: auditoría QA-07)
  galeriaCambiada();
  await eliminarFotosSinFallar([fila.fotoDespuesId, fila.fotoAntesId], "No se pudo borrar del almacenamiento una foto de la galería");
  return { ok: true, mensaje: "Foto eliminada." };
}
