import "server-only";
import { and, asc, eq, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db";
import { archivo, contenidoPagina, faq, galeriaItem, servicio, servicioFoto, variante, type Beneficio, type Paso } from "@/db/esquema";
import { urlArchivo } from "@/lib/almacenamiento";
import { urlsFoto, type UrlsFoto } from "@/lib/fotos";
import { CLAVES_PAGINA, leerContenido, type ContenidoPagina, type Pagina, type PaginaConFoto } from "./contenido";
import type { SeccionFoto } from "./secciones-foto";

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
};

/** `cantidadPasos`: sin pasos, "Cómo lo hacemos" no sale en el sitio; la lista del panel lo avisa (pulido 13.21). */
export async function listarServicios(): Promise<(FilaServicio & { cantidadPasos: number })[]> {
  const filas = await db
    .select({ servicio, foto: archivo })
    .from(servicio)
    .leftJoin(archivo, eq(servicio.fotoArchivoId, archivo.id))
    .where(eq(servicio.activo, true))
    .orderBy(asc(servicio.orden), asc(servicio.id));
  return filas.map(({ servicio: s, foto }) => ({
    id: s.id,
    nombre: s.nombre,
    slug: s.slug,
    resumen: s.resumen,
    visible: s.visibleSitio,
    orden: s.orden,
    foto: foto ? urlsFoto(foto) : null,
    cantidadPasos: s.pasos.length,
  }));
}

export type DetalleServicio = FilaServicio & {
  /** Activo en el catálogo: inactivo no sale en el sitio aunque su página esté completa (pulido 13.2). */
  activo: boolean;
  beneficios: Beneficio[];
  pasos: Paso[];
  opcionesEnEscalera: boolean;
};

export async function obtenerServicio(id: number): Promise<DetalleServicio | null> {
  const [fila] = await db
    .select({ servicio, foto: archivo })
    .from(servicio)
    .leftJoin(archivo, eq(servicio.fotoArchivoId, archivo.id))
    .where(eq(servicio.id, id));
  if (!fila) return null;
  const s = fila.servicio;
  return {
    id: s.id,
    nombre: s.nombre,
    slug: s.slug,
    resumen: s.resumen,
    visible: s.visibleSitio,
    orden: s.orden,
    foto: fila.foto ? urlsFoto(fila.foto) : null,
    activo: s.activo,
    beneficios: s.beneficios,
    pasos: s.pasos,
    opcionesEnEscalera: s.opcionesEnEscalera,
  };
}

/**
 * Las opciones (variantes activas) que muestra la página de un servicio. "Única" es la variante de un servicio sin
 * opciones (D-2): no se muestra. La usan el sitio y el panel (para avisar si "Opciones" no se ve).
 */
export async function opcionesDelSitio(servicioId: number): Promise<{ nombre: string; descripcion: string | null }[]> {
  const filas = await db
    .select({ nombre: variante.nombre, descripcion: variante.descripcion })
    .from(variante)
    .where(and(eq(variante.servicioId, servicioId), eq(variante.activo, true)))
    .orderBy(asc(variante.orden), asc(variante.id));
  return filas.length === 1 && filas[0].nombre === "Única" ? [] : filas;
}

export type FotosDeSecciones = Partial<Record<SeccionFoto, UrlsFoto>>;

/** Las fotos al lado de las secciones de la página de un servicio (pedido de la demo del 24/10). Panel y sitio. */
export async function fotosDeSecciones(servicioId: number): Promise<FotosDeSecciones> {
  const filas = await db
    .select({ seccion: servicioFoto.seccion, archivo })
    .from(servicioFoto)
    .innerJoin(archivo, eq(servicioFoto.archivoId, archivo.id))
    .where(eq(servicioFoto.servicioId, servicioId));
  return Object.fromEntries(filas.map((f) => [f.seccion, urlsFoto(f.archivo)]));
}

/**
 * La foto de una página de textos (`FOTOS_DE_PAGINA`: el taller en la portada, el equipo en Nosotros), o null si no
 * tiene. La usa también el sitio, sin sesión (`fotoDePaginaPublica`, en caché): devuelve solo lo que esa página ya
 * muestra a cualquiera. No agregarle datos que no sean públicos.
 */
export async function obtenerFotoDePagina(pagina: PaginaConFoto): Promise<UrlsFoto | null> {
  const [fila] = await db
    .select({ foto: archivo })
    .from(contenidoPagina)
    .innerJoin(archivo, eq(contenidoPagina.fotoArchivoId, archivo.id))
    .where(eq(contenidoPagina.clave, pagina));
  return fila ? urlsFoto(fila.foto) : null;
}

/** El video de la portada (pedido 48): de qué tipo es y su dirección pública, o null. Público, como la foto. */
export type VideoPortada = { url: string; tipo: string };

export async function obtenerVideoDePortada(): Promise<VideoPortada | null> {
  const [fila] = await db
    .select({ clave: archivo.clave, tipo: archivo.tipoMime })
    .from(contenidoPagina)
    .innerJoin(archivo, eq(contenidoPagina.videoArchivoId, archivo.id))
    .where(eq(contenidoPagina.clave, "inicio"));
  return fila ? { url: urlArchivo(fila.clave), tipo: fila.tipo } : null;
}

/** Las fotos de las páginas de textos que tienen (panel de Textos), en una sola consulta. */
export async function obtenerFotosDePaginas(): Promise<Partial<Record<PaginaConFoto, UrlsFoto>>> {
  const filas = await db
    .select({ clave: contenidoPagina.clave, foto: archivo })
    .from(contenidoPagina)
    .innerJoin(archivo, eq(contenidoPagina.fotoArchivoId, archivo.id));
  return Object.fromEntries(filas.map((f) => [f.clave, urlsFoto(f.foto)]));
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
  /** Visible y de un servicio que se ve en el sitio: lo mismo que filtra `galeriaPublica`. */
  enSitio: boolean;
  enPortada: boolean;
  orden: number;
  antes: UrlsFoto | null;
  despues: UrlsFoto;
};

const fotoAntes = alias(archivo, "foto_antes");
const fotoDespues = alias(archivo, "foto_despues");
/** El servicio se ve en el sitio: activo (catálogo) y con su página visible. */
export const servicioEnSitio = sql<boolean>`(${servicio.activo} and ${servicio.visibleSitio})`;

/** Fotos de la galería en su orden (las ocultas también: se ven marcadas en el panel). */
export async function listarGaleria(): Promise<FilaGaleria[]> {
  const filas = await db
    .select({ item: galeriaItem, servicio: servicio.nombre, servicioEnSitio, antes: fotoAntes, despues: fotoDespues })
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
    enSitio: f.item.visible && f.servicioEnSitio,
    enPortada: f.item.enPortada,
    orden: f.item.orden,
    antes: f.antes ? urlsFoto(f.antes) : null,
    despues: urlsFoto(f.despues),
  }));
}
