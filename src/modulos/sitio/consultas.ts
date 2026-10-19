import "server-only";
import { asc, eq, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db";
import { archivo, contenidoPagina, faq, galeriaItem, servicio, variante, type Paso } from "@/db/esquema";
import type { ElementoLista } from "@/componentes/panel/lista-editable";
import { urlsFoto, type UrlsFoto } from "@/lib/fotos";
import { CLAVES_PAGINA, PORTADA, leerContenido, type ContenidoPagina, type Pagina } from "./contenido";

// Lecturas del módulo Sitio web para el panel. Quien las llama ya pasó por exigirModulo("sitio").
// Las lecturas para el sitio público (en caché, etiquetas "servicios", "contenido" y "galeria") se agregan en B4.

export const ETIQUETA_SERVICIOS = "servicios";
export const ETIQUETA_CONTENIDO = "contenido";
export const ETIQUETA_GALERIA = "galeria";

export type FilaServicio = {
  id: number;
  nombre: string;
  slug: string;
  resumen: string;
  visible: boolean;
  orden: number;
  foto: UrlsFoto | null;
  variantes: number;
};

export async function listarServicios(): Promise<FilaServicio[]> {
  const filas = await db
    .select({
      servicio,
      foto: archivo,
      variantes: sql<number>`(select count(*)::int from ${variante} v where v.servicio_id = ${servicio.id} and v.activo)`,
    })
    .from(servicio)
    .leftJoin(archivo, eq(servicio.fotoArchivoId, archivo.id))
    .where(eq(servicio.activo, true))
    .orderBy(asc(servicio.orden), asc(servicio.id));
  return filas.map(({ servicio: s, foto, variantes }) => ({
    id: s.id,
    nombre: s.nombre,
    slug: s.slug,
    resumen: s.resumen,
    visible: s.visibleSitio,
    orden: s.orden,
    foto: foto ? urlsFoto(foto) : null,
    variantes,
  }));
}

export type DetalleServicio = FilaServicio & {
  descripcion: string;
  beneficios: string[];
  pasos: Paso[];
  listaVariantes: ElementoLista[];
};

export async function obtenerServicio(id: number): Promise<DetalleServicio | null> {
  const [fila] = await db
    .select({ servicio, foto: archivo })
    .from(servicio)
    .leftJoin(archivo, eq(servicio.fotoArchivoId, archivo.id))
    .where(eq(servicio.id, id));
  if (!fila) return null;
  const listaVariantes = await listarVariantes(id);
  const s = fila.servicio;
  return {
    id: s.id,
    nombre: s.nombre,
    slug: s.slug,
    resumen: s.resumen,
    visible: s.visibleSitio,
    orden: s.orden,
    foto: fila.foto ? urlsFoto(fila.foto) : null,
    variantes: listaVariantes.filter((v) => v.activo).length,
    descripcion: s.descripcion,
    beneficios: s.beneficios,
    pasos: s.pasos,
    listaVariantes,
  };
}

/** Variantes de un servicio: activas primero, en su orden. */
export async function listarVariantes(servicioId: number): Promise<ElementoLista[]> {
  const filas = await db
    .select({ id: variante.id, nombre: variante.nombre, descripcion: variante.descripcion, orden: variante.orden, activo: variante.activo })
    .from(variante)
    .where(eq(variante.servicioId, servicioId))
    .orderBy(sql`${variante.activo} desc`, asc(variante.orden), asc(variante.id));
  return filas;
}

/**
 * Foto del taller de la portada, o null si no tiene (HU-08). La usa también el sitio, sin sesión (`fotoPortadaPublica`, en
 * caché): devuelve solo lo que la portada ya muestra a cualquiera. No agregarle datos que no sean públicos.
 */
export async function obtenerFotoPortada(): Promise<UrlsFoto | null> {
  const [fila] = await db
    .select({ foto: archivo })
    .from(contenidoPagina)
    .innerJoin(archivo, eq(contenidoPagina.fotoArchivoId, archivo.id))
    .where(eq(contenidoPagina.clave, PORTADA));
  return fila ? urlsFoto(fila.foto) : null;
}

/** Textos de todas las páginas (HU-08). */
export async function obtenerContenidos(): Promise<Record<Pagina, ContenidoPagina>> {
  const filas = await db.select().from(contenidoPagina);
  const porClave = new Map(filas.map((f) => [f.clave, f.datos]));
  return Object.fromEntries(CLAVES_PAGINA.map((c) => [c, leerContenido(c, porClave.get(c))])) as Record<Pagina, ContenidoPagina>;
}

export type FilaPregunta = { id: number; pregunta: string; respuesta: string; orden: number; visible: boolean };

/** Preguntas frecuentes en su orden (las ocultas también: se ven marcadas en el panel). */
export async function listarPreguntas(): Promise<FilaPregunta[]> {
  return db.select().from(faq).orderBy(asc(faq.orden), asc(faq.id));
}

/** Servicios para elegir en la galería (también los ocultos: se puede preparar la galería antes de mostrarlos). */
export async function opcionesServicio(): Promise<{ id: number; nombre: string }[]> {
  return db
    .select({ id: servicio.id, nombre: servicio.nombre })
    .from(servicio)
    .where(eq(servicio.activo, true))
    .orderBy(asc(servicio.orden), asc(servicio.id));
}

export type FilaGaleria = {
  id: number;
  servicioId: number;
  servicio: string;
  descripcion: string;
  visible: boolean;
  orden: number;
  antes: UrlsFoto | null;
  despues: UrlsFoto;
};

const fotoAntes = alias(archivo, "foto_antes");
const fotoDespues = alias(archivo, "foto_despues");

/** Fotos de la galería en su orden (las ocultas también: se ven marcadas en el panel). */
export async function listarGaleria(): Promise<FilaGaleria[]> {
  const filas = await db
    .select({ item: galeriaItem, servicio: servicio.nombre, antes: fotoAntes, despues: fotoDespues })
    .from(galeriaItem)
    .innerJoin(servicio, eq(galeriaItem.servicioId, servicio.id))
    .innerJoin(fotoDespues, eq(galeriaItem.fotoDespuesId, fotoDespues.id))
    .leftJoin(fotoAntes, eq(galeriaItem.fotoAntesId, fotoAntes.id))
    .orderBy(asc(galeriaItem.orden), asc(galeriaItem.id));
  return filas.map((f) => ({
    id: f.item.id,
    servicioId: f.item.servicioId,
    servicio: f.servicio,
    descripcion: f.item.descripcion,
    visible: f.item.visible,
    orden: f.item.orden,
    antes: f.antes ? urlsFoto(f.antes) : null,
    despues: urlsFoto(f.despues),
  }));
}
