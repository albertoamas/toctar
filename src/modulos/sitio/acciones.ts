"use server";

import { and, eq, max, ne } from "drizzle-orm";
import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { contenidoPagina, faq, galeriaItem, servicio, variante } from "@/db/esquema";
import { erroresDe, indiceUnicoViolado, type EstadoFormulario } from "@/lib/formularios";
import { eliminarFoto, guardarFoto } from "@/lib/fotos";
import { nombreRepetido, puedeDesactivar, reordenar } from "@/lib/orden";
import { exigirModulo } from "@/lib/sesion";
import { crearSlug } from "@/lib/slug";
import { CLAVES_PAGINA, PAGINAS, datosDelFormulario, esquemaPagina, esquemaPregunta, type Pagina } from "./contenido";
import { ETIQUETA_CONTENIDO, ETIQUETA_GALERIA, ETIQUETA_SERVICIOS, listarGaleria, listarPreguntas, listarServicios, listarVariantes } from "./consultas";
import {
  esquemaCrearServicio,
  esquemaEditarGaleria,
  esquemaEstadoVariante,
  esquemaGaleria,
  esquemaId,
  esquemaIdFormulario,
  esquemaMover,
  esquemaMoverVariante,
  esquemaServicio,
  esquemaVariante,
  esquemaVisibilidad,
} from "./esquemas";

// Servicios del sitio (HU-07, RF-11), textos (HU-08, RF-10) y galería (HU-09, RF-12). Entra el dueño o un encargado con el permiso "sitio".
// Al guardar se invalida la etiqueta "servicios": el sitio muestra los cambios sin volver a desplegar (B4).

const RUTA = "/panel/sitio";

function despuesDeCambiar(id?: number) {
  updateTag(ETIQUETA_SERVICIOS);
  revalidatePath(RUTA);
  if (id) revalidatePath(`${RUTA}/servicios/${id}`);
}

/** Dirección libre a partir del nombre: si ya existe, le agrega -2, -3… */
async function slugLibre(nombre: string, sinContar?: number): Promise<string> {
  const base = crearSlug(nombre) || "servicio";
  const usados = new Set(
    (
      await db
        .select({ slug: servicio.slug })
        .from(servicio)
        .where(sinContar ? ne(servicio.id, sinContar) : undefined)
    ).map((s) => s.slug),
  );
  let slug = base;
  for (let n = 2; usados.has(slug); n++) slug = `${base}-${n}`;
  return slug;
}

export async function crearServicio(_previo: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const autor = await exigirModulo("sitio");
  const valores = { nombre: String(datos.get("nombre") ?? ""), resumen: String(datos.get("resumen") ?? "") };
  const entrada = esquemaCrearServicio.safeParse(valores);
  if (!entrada.success) return { errores: erroresDe(entrada.error), valores };
  const { nombre, resumen } = entrada.data;

  const existentes = await db.select({ id: servicio.id, nombre: servicio.nombre }).from(servicio);
  if (nombreRepetido(existentes, nombre)) return { errores: { nombre: "Ya existe un servicio con ese nombre." }, valores };

  let id: number;
  try {
    id = await db.transaction(async (tx) => {
      const [{ ultimo }] = await tx.select({ ultimo: max(servicio.orden) }).from(servicio);
      const [nuevo] = await tx
        .insert(servicio)
        .values({ nombre, resumen, slug: await slugLibre(nombre), orden: (ultimo ?? 0) + 1, updatedBy: Number(autor.id) })
        .returning({ id: servicio.id });
      // D-2: todo servicio tiene al menos una variante.
      await tx.insert(variante).values({ servicioId: nuevo.id, nombre: "Única", orden: 1 });
      return nuevo.id;
    });
  } catch (error) {
    if (indiceUnicoViolado(error) !== null) return { errores: { nombre: "Ya existe un servicio con ese nombre." }, valores };
    throw error;
  }

  despuesDeCambiar();
  redirect(`${RUTA}/servicios/${id}?creado=1`);
}

export async function guardarServicio(_previo: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const autor = await exigirModulo("sitio");
  const valores = Object.fromEntries(
    ["id", "nombre", "slug", "resumen", "descripcion", "beneficios", "pasos"].map((c) => [c, String(datos.get(c) ?? "")]),
  );
  const visible = datos.get("visible") === "on";
  const entrada = esquemaServicio.safeParse({ ...valores, visible });
  if (!entrada.success) return { errores: erroresDe(entrada.error), valores: { ...valores, visible: visible ? "on" : "" } };
  const d = entrada.data;

  const existentes = await db.select({ id: servicio.id, nombre: servicio.nombre, slug: servicio.slug }).from(servicio);
  if (!existentes.some((s) => s.id === d.id)) return { mensaje: "Ese servicio ya no existe." };
  const errores: Record<string, string> = {};
  if (nombreRepetido(existentes, d.nombre, d.id)) errores.nombre = "Ya existe un servicio con ese nombre.";
  if (existentes.some((s) => s.id !== d.id && s.slug === d.slug)) errores.slug = "Ya hay otra página con esa dirección.";
  if (Object.keys(errores).length > 0) return { errores, valores: { ...valores, visible: visible ? "on" : "" } };

  try {
    await db
      .update(servicio)
      .set({
        nombre: d.nombre,
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
    const restriccion = indiceUnicoViolado(error);
    if (restriccion !== null) {
      const campo = restriccion.includes("slug") ? { slug: "Ya hay otra página con esa dirección." } : { nombre: "Ya existe un servicio con ese nombre." };
      return { errores: campo, valores: { ...valores, visible: visible ? "on" : "" } };
    }
    throw error;
  }

  despuesDeCambiar(d.id);
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

  despuesDeCambiar(id);
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
  despuesDeCambiar(id);
  return { ok: true, mensaje: "Foto quitada. El sitio muestra la imagen de reemplazo." };
}

export async function moverServicio(datos: { id: number; direccion: "subir" | "bajar" }): Promise<EstadoFormulario> {
  await exigirModulo("sitio");
  const entrada = esquemaMover.safeParse(datos);
  if (!entrada.success) return { mensaje: "No se pudo mover." };
  const servicios = (await listarServicios()).map((s) => ({ id: s.id, orden: s.orden, activo: true }));
  const nuevoOrden = reordenar(servicios, entrada.data.id, entrada.data.direccion);
  if (!nuevoOrden) return { ok: true };
  await db.transaction(async (tx) => {
    for (const o of nuevoOrden) await tx.update(servicio).set({ orden: o.orden }).where(eq(servicio.id, o.id));
  });
  despuesDeCambiar();
  return { ok: true };
}

// ---------------------------------------------------------------------------------------------
// Variantes (D-2). Sin precios: llegan en el catálogo (C1).

export async function guardarVariante(_previo: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  await exigirModulo("sitio");
  const valores = { nombre: String(datos.get("nombre") ?? ""), descripcion: String(datos.get("descripcion") ?? "") };
  const entrada = esquemaVariante.safeParse({
    servicioId: datos.get("servicioId"),
    id: datos.get("id") || undefined,
    nombre: valores.nombre,
    descripcion: valores.descripcion,
  });
  if (!entrada.success) return { errores: erroresDe(entrada.error), valores };
  const { servicioId, id, nombre, descripcion } = entrada.data;

  const variantes = await listarVariantes(servicioId);
  if (nombreRepetido(variantes, nombre, id)) return { errores: { nombre: "Ya existe una variante con ese nombre." }, valores };
  if (id && !variantes.some((v) => v.id === id)) return { mensaje: "Esa variante ya no existe. Recarga la página." };

  try {
    if (id) {
      await db.update(variante).set({ nombre, descripcion }).where(and(eq(variante.id, id), eq(variante.servicioId, servicioId)));
    } else {
      const orden = Math.max(0, ...variantes.map((v) => v.orden)) + 1;
      await db.insert(variante).values({ servicioId, nombre, descripcion, orden });
    }
  } catch (error) {
    if (indiceUnicoViolado(error) !== null) return { errores: { nombre: "Ya existe una variante con ese nombre." }, valores };
    throw error;
  }

  despuesDeCambiar(servicioId);
  return { ok: true, mensaje: id ? "Cambios guardados." : `Variante ${nombre} agregada.` };
}

export async function moverVariante(datos: { servicioId: number; id: number; direccion: "subir" | "bajar" }): Promise<EstadoFormulario> {
  await exigirModulo("sitio");
  const entrada = esquemaMoverVariante.safeParse(datos);
  if (!entrada.success) return { mensaje: "No se pudo mover." };
  const { servicioId, id, direccion } = entrada.data;
  const nuevoOrden = reordenar(await listarVariantes(servicioId), id, direccion);
  if (!nuevoOrden) return { ok: true };
  await db.transaction(async (tx) => {
    for (const o of nuevoOrden) {
      await tx.update(variante).set({ orden: o.orden }).where(and(eq(variante.id, o.id), eq(variante.servicioId, servicioId)));
    }
  });
  despuesDeCambiar(servicioId);
  return { ok: true };
}

/** Desactivar no borra (D-6): las cotizaciones de C2 la siguen mostrando. */
export async function cambiarEstadoVariante(datos: { servicioId: number; id: number; activo: boolean }): Promise<EstadoFormulario> {
  await exigirModulo("sitio");
  const entrada = esquemaEstadoVariante.safeParse(datos);
  if (!entrada.success) return { mensaje: "No se pudo cambiar el estado." };
  const { servicioId, id, activo } = entrada.data;
  const variantes = await listarVariantes(servicioId);
  const elegida = variantes.find((v) => v.id === id);
  if (!elegida) return { mensaje: "Esa variante ya no existe. Recarga la página." };
  if (!activo && !puedeDesactivar(variantes, id)) {
    return { mensaje: "Debe quedar al menos una variante activa. Si el servicio no tiene opciones, deja una llamada Única." };
  }
  const orden = activo ? Math.max(0, ...variantes.filter((v) => v.activo).map((v) => v.orden)) + 1 : elegida.orden;
  await db
    .update(variante)
    .set({ activo, orden })
    .where(and(eq(variante.id, id), eq(variante.servicioId, servicioId)));
  despuesDeCambiar(servicioId);
  return { ok: true, mensaje: activo ? `${elegida.nombre} reactivada.` : `${elegida.nombre} desactivada.` };
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

/** Foto del taller detrás del lema de la portada (opcional). La anterior se borra: ningún otro registro la usa. */
export async function subirFotoPortada(_previo: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const autor = await exigirModulo("sitio");
  const [actual] = await db.select({ fotoArchivoId: contenidoPagina.fotoArchivoId }).from(contenidoPagina).where(eq(contenidoPagina.clave, "inicio"));
  if (!actual) return { mensaje: "Faltan los textos de la portada: aplica las migraciones." };

  const foto = await guardarFoto(datos.get("foto"), { carpeta: "portada", miniatura: true, autorId: Number(autor.id) });
  if (!foto.ok) return { errores: { foto: foto.motivo === "vacia" ? "Elige una foto." : ERROR_FOTO } };

  await db
    .update(contenidoPagina)
    .set({ fotoArchivoId: foto.archivoId, updatedAt: new Date(), updatedBy: Number(autor.id) })
    .where(eq(contenidoPagina.clave, "inicio"));
  if (actual.fotoArchivoId) await eliminarFoto(actual.fotoArchivoId);

  despuesDeCambiarContenido("textos");
  return { ok: true, mensaje: "Foto guardada." };
}

export async function quitarFotoPortada(): Promise<EstadoFormulario> {
  const autor = await exigirModulo("sitio");
  const [actual] = await db.select({ fotoArchivoId: contenidoPagina.fotoArchivoId }).from(contenidoPagina).where(eq(contenidoPagina.clave, "inicio"));
  if (!actual?.fotoArchivoId) return { ok: true };
  await db.update(contenidoPagina).set({ fotoArchivoId: null, updatedAt: new Date(), updatedBy: Number(autor.id) }).where(eq(contenidoPagina.clave, "inicio"));
  await eliminarFoto(actual.fotoArchivoId);
  despuesDeCambiarContenido("textos");
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

export async function moverPregunta(datos: { id: number; direccion: "subir" | "bajar" }): Promise<EstadoFormulario> {
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
export async function subirGaleria(_previo: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const autor = await exigirModulo("sitio");
  const valores = { servicioId: String(datos.get("servicioId") ?? ""), descripcion: String(datos.get("descripcion") ?? "") };
  const entrada = esquemaGaleria.safeParse(valores);
  if (!entrada.success) return { errores: erroresDe(entrada.error), valores };
  if (!(await servicioExiste(entrada.data.servicioId))) return { errores: { servicioId: "Elige el servicio." }, valores };

  const opciones = { carpeta: "galeria", miniatura: true, autorId: Number(autor.id) };
  const despues = await guardarFoto(datos.get("despues"), opciones);
  if (!despues.ok) {
    return { errores: { despues: despues.motivo === "vacia" ? "Elige la foto del resultado." : ERROR_FOTO }, valores };
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

export async function moverGaleriaItem(datos: { id: number; direccion: "subir" | "bajar" }): Promise<EstadoFormulario> {
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
