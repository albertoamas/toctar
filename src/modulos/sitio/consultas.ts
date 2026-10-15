import "server-only";
import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { archivo, servicio, variante, type Paso } from "@/db/esquema";
import type { ElementoLista } from "@/componentes/panel/lista-editable";
import { urlsFoto, type UrlsFoto } from "@/lib/fotos";

// Lecturas del módulo Sitio web para el panel. Quien las llama ya pasó por exigirModulo("sitio").
// Las lecturas para el sitio público (en caché, etiqueta "servicios") se agregan en B4.

export const ETIQUETA_SERVICIOS = "servicios";

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
