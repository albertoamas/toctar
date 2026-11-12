"use server";

import { and, eq, inArray, isNotNull, max, ne, TransactionRollbackError } from "drizzle-orm";
import { revalidatePath, updateTag } from "next/cache";
import { db } from "@/db";
import { contenidoPagina, faq, galeriaItem, servicio, servicioFoto } from "@/db/esquema";
import { erroresDe, indiceUnicoViolado, type EstadoFormulario } from "@/lib/formularios";
import { eliminarFoto, eliminarFotosSinFallar, guardarFoto } from "@/lib/fotos";
import { reordenar, type Direccion } from "@/lib/orden";
import { exigirModulo } from "@/lib/sesion";
import { CLAVES_PAGINA, FOTOS_DE_PAGINA, PAGINAS, datosDelFormulario, esquemaPagina, esquemaPaginaConFoto, esquemaPregunta, type Pagina, type PaginaConFoto } from "./contenido";
import { agregarAGaleria } from "./agregar-a-galeria";
import { cambiarArchivoDePagina } from "./archivo-de-pagina";
import { ETIQUETA_CONTENIDO, listarGaleria, listarPreguntas, listarServicios, servicioEnSitio } from "./consultas";
import { galeriaCambiada } from "./galeria-cambiada";
import { servicioCambiado } from "./servicio-cambiado";
import { BORRAR_VIDEO_FALLO, cambiarVideoDePortada } from "./video";
import { esquemaEditarGaleria, esquemaFotoSeccion, esquemaGaleria, esquemaId, esquemaIdFormulario, esquemaMover, esquemaParteServicio, esquemaQuitarFotoSeccion, esquemaVisibilidad, motivoParaNoMostrar, type ParteServicio } from "./esquemas";

// Servicios del sitio (HU-07, RF-11), textos (HU-08, RF-10) y galería (HU-09, RF-12). Entra el dueño o un encargado con el permiso "sitio".
// Del servicio, aquí solo su página: el alta, el nombre y las variantes son del catálogo (catalogo/acciones.ts).
// Al guardar se invalida la etiqueta "servicios": el sitio muestra los cambios sin volver a desplegar (B4).

const RUTA = "/panel/sitio";

const SLUG_REPETIDO = "Ya hay otra página con esa dirección.";

const GUARDADO: Record<ParteServicio, string> = {
  resumen: "Resumen guardado.",
  beneficios: "Beneficios guardados.",
  pasos: "Pasos guardados.",
  opciones: "Opciones guardadas.",
  direccion: "Dirección guardada.",
};

/**
 * Una parte de la página del servicio en el sitio (HU-07): el resumen, los beneficios con ícono, los pasos, cómo se ven
 * las opciones o la dirección. Cada modal de la ficha guarda la suya (pulido 13.19).
 */
export async function guardarParteServicio(_previo: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const autor = await exigirModulo("sitio");
  const valores: Record<string, string> = {};
  for (const c of ["id", "parte", "slug", "resumen", "beneficios", "pasos"]) {
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

const ERROR_FOTO = "La foto debe ser JPG, PNG o WebP de hasta 5 MB.";

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

/** Pone la foto de una página (o ninguna) y devuelve la que tenía (`cambiarArchivoDePagina`). */
async function cambiarFotoDe(pagina: PaginaConFoto, fotoArchivoId: number | null, autorId: number): Promise<number | null> {
  const anterior = await cambiarArchivoDePagina(pagina, "fotoArchivoId", fotoArchivoId, autorId);
  despuesDeCambiarContenido("textos");
  return anterior;
}

const BORRAR_FOTO_PAGINA_FALLO = "No se pudo borrar del almacenamiento la foto de una página";

const PAGINA_SIN_FOTO = "Esa página no lleva foto. Recarga la página.";

/**
 * La foto de una página de textos (`FOTOS_DE_PAGINA`): el taller detrás del lema de la portada (HU-08) o el equipo en
 * Nosotros (24/10). Opcional. La anterior se borra: ningún otro registro la usa.
 */
export async function subirFotoDePagina(_previo: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const autor = await exigirModulo("sitio");
  const entrada = esquemaPaginaConFoto.safeParse(datos.get("pagina"));
  if (!entrada.success) return { mensaje: PAGINA_SIN_FOTO };
  const pagina = entrada.data;
  const foto = await guardarFoto(datos.get("foto"), { carpeta: FOTOS_DE_PAGINA[pagina].carpeta, miniatura: true, autorId: Number(autor.id) });
  if (!foto.ok) return { errores: { foto: foto.motivo === "vacia" ? "Elige una foto." : ERROR_FOTO } };

  let anterior: number | null;
  try {
    anterior = await cambiarFotoDe(pagina, foto.archivoId, Number(autor.id));
  } catch (error) {
    // No quedó guardada: la foto recién subida se borra para que no quede huérfana
    await eliminarFoto(foto.archivoId).catch((e) => console.error(BORRAR_FOTO_PAGINA_FALLO, e));
    throw error;
  }
  if (anterior) await eliminarFoto(anterior).catch((e) => console.error(BORRAR_FOTO_PAGINA_FALLO, e));
  return { ok: true, mensaje: "Foto guardada." };
}

export async function quitarFotoDePagina(pagina: string): Promise<EstadoFormulario> {
  const autor = await exigirModulo("sitio");
  const entrada = esquemaPaginaConFoto.safeParse(pagina);
  if (!entrada.success) return { mensaje: PAGINA_SIN_FOTO };
  const anterior = await cambiarFotoDe(entrada.data, null, Number(autor.id));
  if (anterior) await eliminarFoto(anterior).catch((e) => console.error(BORRAR_FOTO_PAGINA_FALLO, e));
  return { ok: true, mensaje: FOTOS_DE_PAGINA[entrada.data].quitada };
}

/** Quita el video de "Mira cómo trabajamos" (pedido 48). Subirlo va por la ruta /panel/sitio/video (`video.ts`). */
export async function quitarVideoDePortada(): Promise<EstadoFormulario> {
  const autor = await exigirModulo("sitio");
  const anterior = await cambiarVideoDePortada(null, Number(autor.id));
  despuesDeCambiarContenido("textos");
  if (anterior) await eliminarFoto(anterior).catch((e) => console.error(BORRAR_VIDEO_FALLO, e));
  return { ok: true, mensaje: "Video quitado." };
}

/** Agrega (sin id) o edita (con id) una pregunta frecuente. */
export async function guardarPregunta(_previo: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  await exigirModulo("sitio");
  const valores = { pregunta: String(datos.get("pregunta") ?? ""), respuesta: String(datos.get("respuesta") ?? "") };
  // "Mostrar en el sitio" viene solo al editar: el texto y si se muestra se guardan juntos, en un solo cambio
  const visible = datos.has("visible") ? datos.get("visible") === "on" : undefined;
  const entrada = esquemaPregunta.safeParse({ ...valores, id: datos.get("id") || undefined, visible });
  if (!entrada.success) return { errores: erroresDe(entrada.error), valores };
  const { id, pregunta, respuesta } = entrada.data;

  if (id) {
    const cambios = entrada.data.visible === undefined ? { pregunta, respuesta } : { pregunta, respuesta, visible: entrada.data.visible };
    const [editada] = await db.update(faq).set(cambios).where(eq(faq.id, id)).returning({ id: faq.id });
    if (!editada) return { mensaje: "Esa pregunta ya no existe. Recarga la página." };
  } else {
    const [{ ultimo }] = await db.select({ ultimo: max(faq.orden) }).from(faq);
    await db.insert(faq).values({ pregunta, respuesta, orden: (ultimo ?? 0) + 1 });
  }

  despuesDeCambiarContenido("preguntas");
  return { ok: true, mensaje: id ? "Pregunta guardada." : "Pregunta agregada." };
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
// HU-09 Galería. Al guardar se renueva lo que la muestra (galeriaCambiada).

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
