"use server";

import { and, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { servicio, servicioFoto } from "@/db/esquema";
import { erroresDe, indiceUnicoViolado, type EstadoFormulario } from "@/lib/formularios";
import { eliminarFoto, eliminarFotosSinFallar, guardarFoto } from "@/lib/fotos";
import { reordenar, type Direccion } from "@/lib/orden";
import { exigirModulo } from "@/lib/sesion";
import { listarServicios } from "../consultas";
import { servicioCambiado } from "../servicio-cambiado";
import { esquemaFotoSeccion, esquemaId, esquemaIdFormulario, esquemaMover, esquemaParteServicio, esquemaQuitarFotoSeccion, esquemaVisibilidad, motivoParaNoMostrar, type ParteServicio } from "../esquemas";
import { ERROR_FOTO, servicioExiste } from "./comun";

// Sitio web (HU-07 a HU-09; RF-10 a RF-12). Entra el dueño o un encargado con el permiso "sitio". Al guardar se
// invalida lo que muestra el sitio, que se renueva sin volver a desplegar (B4).
// Aquí: la página de cada servicio (sus partes, si se muestra, su foto principal, las fotos de sus secciones y su
// orden). El alta, el nombre y las variantes son del catálogo (catalogo/acciones.ts).

const SLUG_REPETIDO = "Ya hay otra página con esa dirección.";

const GUARDADO: Record<ParteServicio, string> = {
  resumen: "Resumen guardado.",
  beneficios: "Beneficios guardados.",
  pasos: "Pasos guardados.",
  colores: "Colores guardados.",
  opciones: "Opciones guardadas.",
  direccion: "Dirección guardada.",
};

/**
 * Una parte de la página del servicio en el sitio (HU-07): el resumen, los beneficios con ícono, los pasos, los colores
 * del probador (pedido 56), cómo se ven las opciones o la dirección. Cada modal de la ficha guarda la suya (pulido 13.19).
 */
export async function guardarParteServicio(_previo: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const autor = await exigirModulo("sitio");
  const valores: Record<string, string> = {};
  for (const c of ["id", "parte", "slug", "resumen", "beneficios", "pasos", "colores"]) {
    const valor = datos.get(c);
    if (typeof valor === "string") valores[c] = valor;
  }
  const opcionesEnEscalera = datos.get("opcionesEnEscalera") === "on";
  // Lo escrito vuelve al formulario si hay un error
  const devolver = { ...valores, opcionesEnEscalera: opcionesEnEscalera ? "on" : "" };
  const entrada = esquemaParteServicio.safeParse({ ...valores, opcionesEnEscalera });
  if (!entrada.success) {
    const errores = erroresDe(entrada.error);
    // Sin una parte válida no hay campo donde mostrar el error: una pestaña abierta con la versión anterior
    if (errores.parte || errores.id) return { mensaje: "No se pudo guardar. Recarga la página." };
    return { errores, valores: devolver };
  }
  const d = entrada.data;

  const [existe] = await db.select({ id: servicio.id }).from(servicio).where(eq(servicio.id, d.id));
  if (!existe) return { mensaje: "Ese servicio ya no existe." };
  if (d.parte === "direccion") {
    const [otro] = await db.select({ id: servicio.id }).from(servicio).where(and(eq(servicio.slug, d.slug), ne(servicio.id, d.id)));
    if (otro) return { errores: { slug: SLUG_REPETIDO }, valores: devolver };
  }
  const cambios =
    d.parte === "resumen"
      ? { resumen: d.resumen }
      : d.parte === "beneficios"
        ? { beneficios: d.beneficios }
        : d.parte === "pasos"
          ? { pasos: d.pasos }
          : d.parte === "colores"
            ? { colores: d.colores }
            : d.parte === "opciones"
              ? { opcionesEnEscalera: d.opcionesEnEscalera }
              : { slug: d.slug };

  try {
    await db
      .update(servicio)
      .set({ ...cambios, updatedAt: new Date(), updatedBy: Number(autor.id) })
      .where(eq(servicio.id, d.id));
  } catch (error) {
    // Otra persona tomó la misma dirección recién: la base frena la segunda
    if (indiceUnicoViolado(error) !== null) return { errores: { slug: SLUG_REPETIDO }, valores: devolver };
    throw error;
  }

  servicioCambiado(d.id);
  return { ok: true, mensaje: GUARDADO[d.parte] };
}

/** Mostrar u ocultar la página del servicio en el sitio, desde "Más" de su ficha. Sin resumen no se muestra. */
export async function cambiarVisibilidadServicio(datos: { id: number; visible: boolean }): Promise<EstadoFormulario> {
  const autor = await exigirModulo("sitio");
  const entrada = esquemaVisibilidad.safeParse(datos);
  if (!entrada.success) return { mensaje: "Ese servicio ya no existe. Recarga la página." };
  const { id, visible } = entrada.data;
  const [actual] = await db.select({ resumen: servicio.resumen, activo: servicio.activo }).from(servicio).where(eq(servicio.id, id));
  if (!actual) return { mensaje: "Ese servicio ya no existe. Recarga la página." };
  const motivo = visible ? motivoParaNoMostrar(actual) : null;
  if (motivo) return { mensaje: motivo };
  await db.update(servicio).set({ visibleSitio: visible, updatedAt: new Date(), updatedBy: Number(autor.id) }).where(eq(servicio.id, id));
  servicioCambiado(id);
  return { ok: true, mensaje: visible ? "Se muestra en el sitio." : "Oculto en el sitio." };
}

const BORRAR_FOTO_SERVICIO_FALLO = "No se pudo borrar del almacenamiento la foto principal de un servicio";

/**
 * Cambia la foto principal del servicio con el servicio bloqueado y devuelve la anterior (null si no había), o
 * `undefined` si el servicio ya no existe. Con el bloqueo, dos cambios a la vez (dos pestañas, subir y quitar) no se
 * pisan ni dejan una foto sin usar: la anterior se lee con el bloqueo tomado (auditoría QA-08).
 */
async function cambiarFotoPrincipal(id: number, fotoArchivoId: number | null, autorId: number): Promise<number | null | undefined> {
  return db.transaction(async (tx) => {
    const [actual] = await tx.select({ fotoArchivoId: servicio.fotoArchivoId }).from(servicio).where(eq(servicio.id, id)).for("update");
    if (!actual) return undefined;
    if (actual.fotoArchivoId === fotoArchivoId) return null;
    await tx.update(servicio).set({ fotoArchivoId, updatedAt: new Date(), updatedBy: autorId }).where(eq(servicio.id, id));
    return actual.fotoArchivoId;
  });
}

/** Foto principal del servicio. La anterior se borra: ningún otro registro la usa. */
export async function subirFotoServicio(_previo: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const autor = await exigirModulo("sitio");
  const entrada = esquemaIdFormulario.safeParse(datos.get("servicioId"));
  if (!entrada.success) return { mensaje: "Ese servicio ya no existe." };
  const id = entrada.data;
  // Antes de subir: con una pestaña vieja de un servicio que ya no está, no se sube nada
  if (!(await servicioExiste(id))) return { mensaje: "Ese servicio ya no existe." };

  const foto = await guardarFoto(datos.get("foto"), { carpeta: "servicios", miniatura: true, autorId: Number(autor.id) });
  if (!foto.ok) return { errores: { foto: foto.motivo === "vacia" ? "Elige una foto." : ERROR_FOTO } };

  let anterior: number | null | undefined;
  try {
    anterior = await cambiarFotoPrincipal(id, foto.archivoId, Number(autor.id));
  } catch (error) {
    await eliminarFotosSinFallar([foto.archivoId], BORRAR_FOTO_SERVICIO_FALLO);
    throw error;
  }
  if (anterior === undefined) {
    await eliminarFotosSinFallar([foto.archivoId], BORRAR_FOTO_SERVICIO_FALLO);
    return { mensaje: "Ese servicio ya no existe." };
  }

  // Primero se renueva el sitio (la foto nueva ya quedó guardada); después se borra la anterior, y si el almacenamiento
  // falla no se avisa como error (auditoría QA-07)
  servicioCambiado(id);
  await eliminarFotosSinFallar([anterior], BORRAR_FOTO_SERVICIO_FALLO);
  return { ok: true, mensaje: "Foto guardada." };
}

export async function quitarFotoServicio(datoId: number): Promise<EstadoFormulario> {
  const autor = await exigirModulo("sitio");
  const entrada = esquemaId.safeParse(datoId);
  if (!entrada.success) return { mensaje: "Ese servicio ya no existe." };
  const id = entrada.data;
  const anterior = await cambiarFotoPrincipal(id, null, Number(autor.id));
  if (!anterior) return { ok: true };
  servicioCambiado(id);
  await eliminarFotosSinFallar([anterior], BORRAR_FOTO_SERVICIO_FALLO);
  return { ok: true, mensaje: "Foto quitada. El sitio muestra la imagen de reemplazo." };
}

// La foto al lado de cada sección de la página de un servicio (pedido de la demo del 24/10). Una por sección: subir otra
// la reemplaza.

const BORRAR_FOTO_FALLO = "No se pudo borrar del almacenamiento la foto de una sección";

export async function subirFotoDeSeccion(_previo: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const autor = await exigirModulo("sitio");
  const entrada = esquemaFotoSeccion.safeParse({ servicioId: datos.get("servicioId"), seccion: datos.get("seccion") });
  if (!entrada.success) return { mensaje: "No se pudo guardar la foto en esa sección. Recarga la página." };
  const { servicioId, seccion } = entrada.data;
  // Antes de subir: con una pestaña vieja de un servicio que ya no está, no se sube nada
  const [existe] = await db.select({ id: servicio.id }).from(servicio).where(eq(servicio.id, servicioId));
  if (!existe) return { mensaje: "Ese servicio ya no existe." };

  const foto = await guardarFoto(datos.get("foto"), { carpeta: "servicios", miniatura: true, autorId: Number(autor.id) });
  if (!foto.ok) return { errores: { foto: foto.motivo === "vacia" ? "Elige una foto." : ERROR_FOTO } };

  // Con el servicio bloqueado (también lo bloquea quitar): subir y quitar en la misma sección no se cruzan. Si no se
  // guarda, la foto subida se borra para que no quede huérfana.
  let resultado: { anterior: number | null } | null;
  try {
    resultado = await db.transaction(async (tx) => {
      const [existe] = await tx.select({ id: servicio.id }).from(servicio).where(eq(servicio.id, servicioId)).for("update");
      if (!existe) return null;
      const donde = and(eq(servicioFoto.servicioId, servicioId), eq(servicioFoto.seccion, seccion));
      const [anterior] = await tx.select({ archivoId: servicioFoto.archivoId }).from(servicioFoto).where(donde);
      // Reemplazada: quién y cuándo son de la foto nueva
      if (anterior) await tx.update(servicioFoto).set({ archivoId: foto.archivoId, createdAt: new Date(), createdBy: Number(autor.id) }).where(donde);
      else await tx.insert(servicioFoto).values({ servicioId, seccion, archivoId: foto.archivoId, createdBy: Number(autor.id) });
      return { anterior: anterior?.archivoId ?? null };
    });
  } catch (error) {
    await eliminarFoto(foto.archivoId).catch((e) => console.error(BORRAR_FOTO_FALLO, e));
    throw error;
  }
  if (!resultado) {
    await eliminarFoto(foto.archivoId).catch((e) => console.error(BORRAR_FOTO_FALLO, e));
    return { mensaje: "Ese servicio ya no existe." };
  }

  servicioCambiado(servicioId);
  // La que había en esa sección se borra después: ningún otro registro la usa. Si el almacenamiento falla, la nueva ya
  // quedó guardada: no se avisa como error.
  if (resultado.anterior) await eliminarFoto(resultado.anterior).catch((e) => console.error(BORRAR_FOTO_FALLO, e));
  return { ok: true, mensaje: "Foto guardada." };
}

export async function quitarFotoDeSeccion(datos: { servicioId: number; seccion: string }): Promise<EstadoFormulario> {
  await exigirModulo("sitio");
  const entrada = esquemaQuitarFotoSeccion.safeParse(datos);
  if (!entrada.success) return { mensaje: "Esa foto ya no existe. Recarga la página." };
  const { servicioId, seccion } = entrada.data;
  // Con el mismo bloqueo que subir: no se cruza con un cambio de foto en curso
  const fila = await db.transaction(async (tx) => {
    await tx.select({ id: servicio.id }).from(servicio).where(eq(servicio.id, servicioId)).for("update");
    const [borrada] = await tx
      .delete(servicioFoto)
      .where(and(eq(servicioFoto.servicioId, servicioId), eq(servicioFoto.seccion, seccion)))
      .returning();
    return borrada;
  });
  if (!fila) return { mensaje: "Esa foto ya no existe. Recarga la página." };
  // Primero sale del sitio; después se borra el archivo (si el almacenamiento falla, la foto ya no se ve)
  servicioCambiado(servicioId);
  await eliminarFoto(fila.archivoId).catch((e) => console.error(BORRAR_FOTO_FALLO, e));
  return { ok: true, mensaje: "Foto quitada." };
}

export async function moverServicio(datos: { id: number; direccion: Direccion }): Promise<EstadoFormulario> {
  await exigirModulo("sitio");
  const entrada = esquemaMover.safeParse(datos);
  if (!entrada.success) return { mensaje: "No se pudo mover." };
  const servicios = (await listarServicios()).map((s) => ({ id: s.id, orden: s.orden, activo: true }));
  const nuevoOrden = reordenar(servicios, entrada.data.id, entrada.data.direccion);
  if (!nuevoOrden) return { ok: true };
  await db.transaction(async (tx) => {
    for (const o of nuevoOrden) await tx.update(servicio).set({ orden: o.orden }).where(eq(servicio.id, o.id));
  });
  servicioCambiado();
  return { ok: true };
}

// ---------------------------------------------------------------------------------------------
// HU-08 Textos del sitio y preguntas frecuentes. Al guardar se invalida la etiqueta "contenido".
