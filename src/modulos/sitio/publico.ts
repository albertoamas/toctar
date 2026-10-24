import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/db";
import { archivo, contenidoPagina, faq, galeriaItem, servicio, type Beneficio, type Paso } from "@/db/esquema";
import { urlsFoto, type UrlsFoto } from "@/lib/fotos";
import { leerContenido, type ContenidoPagina, type Pagina, type PaginaConFoto } from "./contenido";
import { ETIQUETA_CONTENIDO, ETIQUETA_GALERIA, ETIQUETA_SERVICIOS, fotosDeSecciones, obtenerFotoDePagina, opcionesDelSitio, type FotosDeSecciones } from "./consultas";

// Lecturas del sitio público (B4). Van en caché hasta que el panel guarda un cambio: las acciones
// de B3 invalidan estas etiquetas (updateTag). Solo devuelven lo visible.
// Quien las usa llama antes a connection(): el build no tiene base de datos.

export type ServicioPublico = { id: number; nombre: string; slug: string; resumen: string; foto: UrlsFoto | null };

export async function serviciosPublicos(): Promise<ServicioPublico[]> {
  "use cache";
  cacheTag(ETIQUETA_SERVICIOS);
  cacheLife("max");
  const filas = await db
    .select({ servicio, foto: archivo })
    .from(servicio)
    .leftJoin(archivo, eq(servicio.fotoArchivoId, archivo.id))
    .where(and(eq(servicio.activo, true), eq(servicio.visibleSitio, true)))
    .orderBy(asc(servicio.orden), asc(servicio.id));
  return filas.map(({ servicio: s, foto }) => ({ id: s.id, nombre: s.nombre, slug: s.slug, resumen: s.resumen, foto: foto ? urlsFoto(foto) : null }));
}

export type FotoGaleria = {
  id: number;
  descripcion: string;
  servicio: { nombre: string; slug: string };
  antes: UrlsFoto | null;
  despues: UrlsFoto;
  /** Elegida en el panel para el comparador de la portada (ver `trabajoDePortada`). */
  enPortada: boolean;
};

const fotoAntes = alias(archivo, "foto_antes");
const fotoDespues = alias(archivo, "foto_despues");

/** Fotos visibles de servicios visibles, en su orden. */
export async function galeriaPublica(): Promise<FotoGaleria[]> {
  "use cache";
  cacheTag(ETIQUETA_GALERIA, ETIQUETA_SERVICIOS);
  cacheLife("max");
  const filas = await db
    .select({ item: galeriaItem, nombre: servicio.nombre, slug: servicio.slug, antes: fotoAntes, despues: fotoDespues })
    .from(galeriaItem)
    .innerJoin(servicio, eq(galeriaItem.servicioId, servicio.id))
    .innerJoin(fotoDespues, eq(galeriaItem.fotoDespuesId, fotoDespues.id))
    .leftJoin(fotoAntes, eq(galeriaItem.fotoAntesId, fotoAntes.id))
    .where(and(eq(galeriaItem.visible, true), eq(servicio.visibleSitio, true), eq(servicio.activo, true)))
    .orderBy(asc(galeriaItem.orden), asc(galeriaItem.id));
  return filas.map((f) => ({
    id: f.item.id,
    descripcion: f.item.descripcion,
    servicio: { nombre: f.nombre, slug: f.slug },
    antes: f.antes ? urlsFoto(f.antes) : null,
    despues: urlsFoto(f.despues),
    enPortada: f.item.enPortada,
  }));
}

export type DetalleServicioPublico = ServicioPublico & {
  beneficios: Beneficio[];
  pasos: Paso[];
  /** Las opciones van de menor a mayor: se ven como escalones. */
  opcionesEnEscalera: boolean;
  variantes: { nombre: string; descripcion: string | null }[];
  /** La foto al lado de cada sección, si tiene. */
  fotosSecciones: FotosDeSecciones;
  /** Si tiene trabajos en la galería: la página enlaza a ella. */
  tieneFotos: boolean;
};

/** Un servicio visible con todo lo que muestra su página, o null (oculto o inexistente). */
export async function servicioPublico(slug: string): Promise<DetalleServicioPublico | null> {
  "use cache";
  cacheTag(ETIQUETA_SERVICIOS, ETIQUETA_GALERIA);
  cacheLife("max");
  const [fila] = await db
    .select({ servicio, foto: archivo })
    .from(servicio)
    .leftJoin(archivo, eq(servicio.fotoArchivoId, archivo.id))
    .where(and(eq(servicio.slug, slug), eq(servicio.activo, true), eq(servicio.visibleSitio, true)));
  if (!fila) return null;
  const s = fila.servicio;
  const [variantes, tieneFotos, fotosSecciones] = await Promise.all([
    opcionesDelSitio(s.id),
    galeriaPublica().then((g) => g.some((f) => f.servicio.slug === s.slug)),
    fotosDeSecciones(s.id),
  ]);
  return {
    id: s.id,
    nombre: s.nombre,
    slug: s.slug,
    resumen: s.resumen,
    foto: fila.foto ? urlsFoto(fila.foto) : null,
    beneficios: s.beneficios,
    pasos: s.pasos,
    opcionesEnEscalera: s.opcionesEnEscalera,
    variantes,
    fotosSecciones,
    tieneFotos,
  };
}

export async function contenidoPublico(pagina: Pagina): Promise<ContenidoPagina> {
  "use cache";
  cacheTag(ETIQUETA_CONTENIDO);
  cacheLife("max");
  const [fila] = await db.select({ datos: contenidoPagina.datos }).from(contenidoPagina).where(eq(contenidoPagina.clave, pagina));
  return leerContenido(pagina, fila?.datos);
}

/** Foto del taller detrás del lema de la portada, o null: entonces la portada muestra el arte de la marca. */
/** La foto de la portada (el taller) o de Nosotros (el equipo), o null. */
export async function fotoDePaginaPublica(pagina: PaginaConFoto): Promise<UrlsFoto | null> {
  "use cache";
  cacheTag(ETIQUETA_CONTENIDO);
  cacheLife("max");
  return obtenerFotoDePagina(pagina);
}

export async function preguntasPublicas(): Promise<{ pregunta: string; respuesta: string }[]> {
  "use cache";
  cacheTag(ETIQUETA_CONTENIDO);
  cacheLife("max");
  return db
    .select({ pregunta: faq.pregunta, respuesta: faq.respuesta })
    .from(faq)
    .where(eq(faq.visible, true))
    .orderBy(asc(faq.orden), asc(faq.id));
}
