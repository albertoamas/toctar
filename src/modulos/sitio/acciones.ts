"use server";

import { eq, max } from "drizzle-orm";
import { revalidatePath, updateTag } from "next/cache";
import { db } from "@/db";
import { contenidoPagina, faq, galeriaItem, servicio } from "@/db/esquema";
import { erroresDe, indiceUnicoViolado, type EstadoFormulario } from "@/lib/formularios";
import { eliminarFoto, guardarFoto } from "@/lib/fotos";
import { reordenar, type Direccion } from "@/lib/orden";
import { exigirModulo } from "@/lib/sesion";
import { CLAVES_PAGINA, PAGINAS, PORTADA, datosDelFormulario, esquemaPagina, esquemaPregunta, type Pagina } from "./contenido";
import { ETIQUETA_CONTENIDO, ETIQUETA_GALERIA, listarGaleria, listarPreguntas, listarServicios } from "./consultas";
import { servicioCambiado } from "./servicio-cambiado";
import { esquemaEditarGaleria, esquemaGaleria, esquemaId, esquemaIdFormulario, esquemaMover, esquemaServicio, esquemaVisibilidad } from "./esquemas";

// Servicios del sitio (HU-07, RF-11), textos (HU-08, RF-10) y galería (HU-09, RF-12). Entra el dueño o un encargado con el permiso "sitio".
// Del servicio, aquí solo su página: el alta, el nombre y las variantes son del catálogo (catalogo/acciones.ts).
// Al guardar se invalida la etiqueta "servicios": el sitio muestra los cambios sin volver a desplegar (B4).

const RUTA = "/panel/sitio";

const SLUG_REPETIDO = "Ya hay otra página con esa dirección.";

/** La página del servicio en el sitio: dirección, textos, beneficios, pasos y si se muestra (HU-07). */
export async function guardarServicio(_previo: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const autor = await exigirModulo("sitio");
  const valores = Object.fromEntries(
    ["id", "slug", "resumen", "descripcion", "beneficios", "pasos"].map((c) => [c, String(datos.get(c) ?? "")]),
  );
  const visible = datos.get("visible") === "on";
  // Lo escrito vuelve al formulario si hay un error
  const devolver = { ...valores, visible: visible ? "on" : "" };
  const entrada = esquemaServicio.safeParse({ ...valores, visible });
  if (!entrada.success) return { errores: erroresDe(entrada.error), valores: devolver };
  const d = entrada.data;

  const existentes = await db.select({ id: servicio.id, slug: servicio.slug }).from(servicio);
  if (!existentes.some((s) => s.id === d.id)) return { mensaje: "Ese servicio ya no existe." };
  if (existentes.some((s) => s.id !== d.id && s.slug === d.slug)) {
    return { errores: { slug: SLUG_REPETIDO }, valores: devolver };
  }

  try {
    await db
      .update(servicio)
      .set({
        slug: d.slug,
        resumen: d.resumen,
        descripcion: d.descripcion,
        beneficios: d.beneficios,
        pasos: d.pasos,
        visibleSitio: d.visible,
        updatedAt: new Date(),
        updatedBy: Number(autor.id),
      })
      .where(eq(servicio.id, d.id));
  } catch (error) {
    // Otra persona tomó la misma dirección recién: la base frena la segunda
    if (indiceUnicoViolado(error) !== null) return { errores: { slug: SLUG_REPETIDO }, valores: devolver };
    throw error;
  }

  servicioCambiado(d.id);
  return { ok: true, mensaje: "Cambios guardados." };
}

const ERROR_FOTO = "La foto debe ser JPG, PNG o WebP de hasta 5 MB.";

/** Foto principal del servicio. La anterior se borra: ningún otro registro la usa. */
export async function subirFotoServicio(_previo: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const autor = await exigirModulo("sitio");
  const entrada = esquemaIdFormulario.safeParse(datos.get("servicioId"));
  if (!entrada.success) return { mensaje: "Ese servicio ya no existe." };
  const id = entrada.data;
  const [actual] = await db.select({ fotoArchivoId: servicio.fotoArchivoId }).from(servicio).where(eq(servicio.id, id));
  if (!actual) return { mensaje: "Ese servicio ya no existe." };

  const foto = await guardarFoto(datos.get("foto"), { carpeta: "servicios", miniatura: true, autorId: Number(autor.id) });
  if (!foto.ok) return { errores: { foto: foto.motivo === "vacia" ? "Elige una foto." : ERROR_FOTO } };

  await db.update(servicio).set({ fotoArchivoId: foto.archivoId, updatedAt: new Date(), updatedBy: Number(autor.id) }).where(eq(servicio.id, id));
  if (actual.fotoArchivoId) await eliminarFoto(actual.fotoArchivoId);

  servicioCambiado(id);
  return { ok: true, mensaje: "Foto guardada." };
}

export async function quitarFotoServicio(datoId: number): Promise<EstadoFormulario> {
  const autor = await exigirModulo("sitio");
  const entrada = esquemaId.safeParse(datoId);
  if (!entrada.success) return { mensaje: "Ese servicio ya no existe." };
  const id = entrada.data;
  const [actual] = await db.select({ fotoArchivoId: servicio.fotoArchivoId }).from(servicio).where(eq(servicio.id, id));
  if (!actual?.fotoArchivoId) return { ok: true };
  await db.update(servicio).set({ fotoArchivoId: null, updatedAt: new Date(), updatedBy: Number(autor.id) }).where(eq(servicio.id, id));
  await eliminarFoto(actual.fotoArchivoId);
  servicioCambiado(id);
  return { ok: true, mensaje: "Foto quitada. El sitio muestra la imagen de reemplazo." };
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

function despuesDeCambiarContenido(ruta: "textos" | "preguntas") {
  updateTag(ETIQUETA_CONTENIDO);
  revalidatePath(`${RUTA}/${ruta}`);
}

export async function guardarContenido(_previo: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const autor = await exigirModulo("sitio");
  const pagina = String(datos.get("pagina")) as Pagina;
  if (!CLAVES_PAGINA.includes(pagina)) return { mensaje: "Página desconocida. Recarga la página." };

  const valores = Object.fromEntries(PAGINAS[pagina].campos.map((c) => [c.clave, String(datos.get(c.clave) ?? "")]));
  const entrada = esquemaPagina(pagina).safeParse(datosDelFormulario(pagina, valores));
  if (!entrada.success) return { errores: erroresDe(entrada.error), valores };

  const fila = { clave: pagina, datos: entrada.data, updatedAt: new Date(), updatedBy: Number(autor.id) };
  await db.insert(contenidoPagina).values(fila).onConflictDoUpdate({ target: contenidoPagina.clave, set: fila });

  despuesDeCambiarContenido("textos");
  return { ok: true, mensaje: `${PAGINAS[pagina].titulo}: cambios guardados.` };
}

/** Foto que tiene hoy la portada. Si falta su fila, es un error de datos (como en `leerContenido`): falta la migración. */
async function fotoActualPortada(): Promise<number | null> {
  const [fila] = await db.select({ fotoArchivoId: contenidoPagina.fotoArchivoId }).from(contenidoPagina).where(eq(contenidoPagina.clave, PORTADA));
  if (!fila) throw new Error("Falta la fila de la portada en contenido_pagina: aplica las migraciones.");
  return fila.fotoArchivoId;
}

async function cambiarFotoPortada(fotoArchivoId: number | null, autorId: number) {
  await db.update(contenidoPagina).set({ fotoArchivoId, updatedAt: new Date(), updatedBy: autorId }).where(eq(contenidoPagina.clave, PORTADA));
  despuesDeCambiarContenido("textos");
}

/** Foto del taller detrás del lema de la portada (opcional). La anterior se borra: ningún otro registro la usa. */
export async function subirFotoPortada(_previo: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const autor = await exigirModulo("sitio");
  const anterior = await fotoActualPortada();
  const foto = await guardarFoto(datos.get("foto"), { carpeta: "portada", miniatura: true, autorId: Number(autor.id) });
  if (!foto.ok) return { errores: { foto: foto.motivo === "vacia" ? "Elige una foto." : ERROR_FOTO } };

  await cambiarFotoPortada(foto.archivoId, Number(autor.id));
  if (anterior) await eliminarFoto(anterior);
  return { ok: true, mensaje: "Foto guardada." };
}

export async function quitarFotoPortada(): Promise<EstadoFormulario> {
  const autor = await exigirModulo("sitio");
  const anterior = await fotoActualPortada();
  if (!anterior) return { ok: true };
  await cambiarFotoPortada(null, Number(autor.id));
  await eliminarFoto(anterior);
  return { ok: true, mensaje: "Foto quitada. La portada muestra el arte de TocTar." };
}

/** Agrega (sin id) o edita (con id) una pregunta frecuente. */
export async function guardarPregunta(_previo: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  await exigirModulo("sitio");
  const valores = { pregunta: String(datos.get("pregunta") ?? ""), respuesta: String(datos.get("respuesta") ?? "") };
  const entrada = esquemaPregunta.safeParse({ ...valores, id: datos.get("id") || undefined });
  if (!entrada.success) return { errores: erroresDe(entrada.error), valores };
  const { id, pregunta, respuesta } = entrada.data;

  if (id) {
    const [editada] = await db.update(faq).set({ pregunta, respuesta }).where(eq(faq.id, id)).returning({ id: faq.id });
    if (!editada) return { mensaje: "Esa pregunta ya no existe. Recarga la página." };
  } else {
    const [{ ultimo }] = await db.select({ ultimo: max(faq.orden) }).from(faq);
    await db.insert(faq).values({ pregunta, respuesta, orden: (ultimo ?? 0) + 1 });
  }

  despuesDeCambiarContenido("preguntas");
  return { ok: true, mensaje: id ? "Cambios guardados." : "Pregunta agregada." };
}

export async function moverPregunta(datos: { id: number; direccion: Direccion }): Promise<EstadoFormulario> {
  await exigirModulo("sitio");
  const entrada = esquemaMover.safeParse(datos);
  if (!entrada.success) return { mensaje: "No se pudo mover." };
  // Las ocultas también se ordenan: se pueden volver a mostrar en su lugar.
  const preguntas = (await listarPreguntas()).map((p) => ({ ...p, activo: true }));
  const nuevoOrden = reordenar(preguntas, entrada.data.id, entrada.data.direccion);
  if (!nuevoOrden) return { ok: true };
  await db.transaction(async (tx) => {
    for (const o of nuevoOrden) await tx.update(faq).set({ orden: o.orden }).where(eq(faq.id, o.id));
  });
  despuesDeCambiarContenido("preguntas");
  return { ok: true };
}

export async function cambiarVisibilidadPregunta(datos: { id: number; visible: boolean }): Promise<EstadoFormulario> {
  await exigirModulo("sitio");
  const entrada = esquemaVisibilidad.safeParse(datos);
  if (!entrada.success) return { mensaje: "Esa pregunta ya no existe. Recarga la página." };
  const { id, visible } = entrada.data;
  const [fila] = await db.update(faq).set({ visible }).where(eq(faq.id, id)).returning({ id: faq.id });
  if (!fila) return { mensaje: "Esa pregunta ya no existe. Recarga la página." };
  despuesDeCambiarContenido("preguntas");
  return { ok: true, mensaje: visible ? "La pregunta se ve en el sitio." : "Pregunta oculta: no se ve en el sitio." };
}

/** Las preguntas frecuentes no tienen historial: se eliminan de verdad. */
export async function eliminarPregunta(datoId: number): Promise<EstadoFormulario> {
  await exigirModulo("sitio");
  const entrada = esquemaId.safeParse(datoId);
  if (!entrada.success) return { mensaje: "Esa pregunta ya no existe. Recarga la página." };
  const [fila] = await db.delete(faq).where(eq(faq.id, entrada.data)).returning({ id: faq.id });
  if (!fila) return { mensaje: "Esa pregunta ya no existe. Recarga la página." };
  despuesDeCambiarContenido("preguntas");
  return { ok: true, mensaje: "Pregunta eliminada." };
}

// ---------------------------------------------------------------------------------------------
// HU-09 Galería. Al guardar se invalida la etiqueta "galeria".

function despuesDeCambiarGaleria() {
  updateTag(ETIQUETA_GALERIA);
  revalidatePath(`${RUTA}/galeria`);
}

async function servicioExiste(id: number): Promise<boolean> {
  const [fila] = await db.select({ id: servicio.id }).from(servicio).where(eq(servicio.id, id));
  return !!fila;
}

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
  const antes = conAntes ? await guardarFoto(entradaAntes, opciones) : null;
  if (antes && !antes.ok) {
    await eliminarFoto(despues.archivoId);
    return { errores: { antes: ERROR_FOTO }, valores };
  }

  const [{ ultimo }] = await db.select({ ultimo: max(galeriaItem.orden) }).from(galeriaItem);
  await db.insert(galeriaItem).values({
    servicioId: entrada.data.servicioId,
    descripcion: entrada.data.descripcion,
    fotoDespuesId: despues.archivoId,
    fotoAntesId: antes?.ok ? antes.archivoId : null,
    orden: (ultimo ?? 0) + 1,
    createdBy: Number(autor.id),
  });

  despuesDeCambiarGaleria();
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
  despuesDeCambiarGaleria();
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
  despuesDeCambiarGaleria();
  return { ok: true };
}

export async function cambiarVisibilidadGaleria(datos: { id: number; visible: boolean }): Promise<EstadoFormulario> {
  await exigirModulo("sitio");
  const entrada = esquemaVisibilidad.safeParse(datos);
  if (!entrada.success) return { mensaje: "Esa foto ya no existe. Recarga la página." };
  const { id, visible } = entrada.data;
  const [fila] = await db.update(galeriaItem).set({ visible }).where(eq(galeriaItem.id, id)).returning({ id: galeriaItem.id });
  if (!fila) return { mensaje: "Esa foto ya no existe. Recarga la página." };
  despuesDeCambiarGaleria();
  return { ok: true, mensaje: visible ? "La foto se ve en el sitio." : "Foto oculta: no se ve en el sitio." };
}

/** Las fotos de la galería no tienen historial: se borran, también del almacenamiento. */
export async function eliminarGaleriaItem(datoId: number): Promise<EstadoFormulario> {
  await exigirModulo("sitio");
  const entrada = esquemaId.safeParse(datoId);
  if (!entrada.success) return { mensaje: "Esa foto ya no existe. Recarga la página." };
  const [fila] = await db.delete(galeriaItem).where(eq(galeriaItem.id, entrada.data)).returning();
  if (!fila) return { mensaje: "Esa foto ya no existe. Recarga la página." };
  await eliminarFoto(fila.fotoDespuesId);
  if (fila.fotoAntesId) await eliminarFoto(fila.fotoAntesId);
  despuesDeCambiarGaleria();
  return { ok: true, mensaje: "Foto eliminada." };
}
