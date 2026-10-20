import "server-only";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { servicio, variante } from "@/db/esquema";

// Lecturas del catálogo (C1). Quien las llama ya pasó por exigirModulo("catalogo"): solo el dueño (RN-01).

export type FilaCatalogo = {
  id: number;
  nombre: string;
  activo: boolean;
  duracionDias: number;
  generaMantenimiento: boolean;
  variantes: number;
};

/** Todos los servicios, los activos primero y en el orden del sitio. */
export async function listarCatalogo(): Promise<FilaCatalogo[]> {
  return db
    .select({
      id: servicio.id,
      nombre: servicio.nombre,
      activo: servicio.activo,
      duracionDias: servicio.duracionDias,
      generaMantenimiento: servicio.generaMantenimiento,
      // Con la unión, cada columna sale con su tabla. En una subconsulta, Drizzle escribía "id" a secas y se comparaba
      // con el id de la variante: contaba mal.
      variantes: sql<number>`count(${variante.id}) filter (where ${variante.activo})::int`,
    })
    .from(servicio)
    .leftJoin(variante, eq(variante.servicioId, servicio.id))
    .groupBy(servicio.id)
    .orderBy(desc(servicio.activo), asc(servicio.orden), asc(servicio.id));
}

export type ServicioCatalogo = Omit<FilaCatalogo, "variantes"> & { variantes: { id: number; nombre: string }[] };

/** Un servicio con sus variantes activas, o null si no existe. */
export async function obtenerServicioCatalogo(id: number): Promise<ServicioCatalogo | null> {
  const [s] = await db
    .select({
      id: servicio.id,
      nombre: servicio.nombre,
      activo: servicio.activo,
      duracionDias: servicio.duracionDias,
      generaMantenimiento: servicio.generaMantenimiento,
    })
    .from(servicio)
    .where(eq(servicio.id, id));
  if (!s) return null;
  const variantes = await db
    .select({ id: variante.id, nombre: variante.nombre })
    .from(variante)
    .where(and(eq(variante.servicioId, id), eq(variante.activo, true)))
    .orderBy(asc(variante.orden), asc(variante.id));
  return { ...s, variantes };
}
