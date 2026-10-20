import "server-only";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { precio, servicio, tamanoVehiculo, usuario, variante } from "@/db/esquema";
import { tamanosActivos, type Tamano } from "@/modulos/configuracion/consultas";
import { clavePrecio, preciosFaltantes, type Monto } from "./reglas";

// Lecturas del catálogo (C1). Quien las llama ya pasó por exigirModulo("catalogo"): solo el dueño (RN-01).

export type FilaCatalogo = {
  id: number;
  nombre: string;
  activo: boolean;
  duracionDias: number;
  generaMantenimiento: boolean;
  variantes: number;
  /** Pares variante y tamaño activos sin precio cargado. */
  preciosFaltantes: number;
};

/** Todos los servicios, los activos primero y en el orden del sitio, con cuántos precios les faltan. */
export async function listarCatalogo(): Promise<FilaCatalogo[]> {
  const [servicios, variantes, tamanos, cargados] = await Promise.all([
    db
      .select({
        id: servicio.id,
        nombre: servicio.nombre,
        activo: servicio.activo,
        duracionDias: servicio.duracionDias,
        generaMantenimiento: servicio.generaMantenimiento,
      })
      .from(servicio)
      .orderBy(desc(servicio.activo), asc(servicio.orden), asc(servicio.id)),
    db.select({ id: variante.id, servicioId: variante.servicioId }).from(variante).where(eq(variante.activo, true)),
    tamanosActivos(),
    db.selectDistinct({ varianteId: precio.varianteId, tamanoId: precio.tamanoId }).from(precio),
  ]);
  const tamanoIds = tamanos.map((t) => t.id);
  const conPrecio = new Set(cargados.map((c) => clavePrecio(c.varianteId, c.tamanoId)));
  return servicios.map((s) => {
    const suyas = variantes.filter((v) => v.servicioId === s.id).map((v) => v.id);
    return { ...s, variantes: suyas.length, preciosFaltantes: preciosFaltantes(suyas, tamanoIds, conPrecio) };
  });
}

export type VarianteCatalogo = {
  id: number;
  nombre: string;
  duracionDias: number | null;
  /** Precio vigente por tamaño (id del tamaño → monto). Sin la clave: sin cargar; con null: según evaluación. */
  precios: Record<number, Monto>;
};

export type ServicioCatalogo = {
  id: number;
  nombre: string;
  activo: boolean;
  duracionDias: number;
  generaMantenimiento: boolean;
  variantes: VarianteCatalogo[];
  tamanos: Tamano[];
};

/** Precio vigente de cada par (D-3): la fila más reciente. */
export async function preciosVigentes(varianteIds: number[]): Promise<{ varianteId: number; tamanoId: number; monto: Monto }[]> {
  if (varianteIds.length === 0) return [];
  return db
    .selectDistinctOn([precio.varianteId, precio.tamanoId], { varianteId: precio.varianteId, tamanoId: precio.tamanoId, monto: precio.monto })
    .from(precio)
    .where(inArray(precio.varianteId, varianteIds))
    .orderBy(precio.varianteId, precio.tamanoId, desc(precio.vigenteDesde), desc(precio.id));
}

/** Un servicio con sus variantes activas y los precios vigentes de cada una, o null si no existe. */
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
  const [variantes, tamanos] = await Promise.all([
    db
      .select({ id: variante.id, nombre: variante.nombre, duracionDias: variante.duracionDias })
      .from(variante)
      .where(and(eq(variante.servicioId, id), eq(variante.activo, true)))
      .orderBy(asc(variante.orden), asc(variante.id)),
    tamanosActivos(),
  ]);
  const vigentes = await preciosVigentes(variantes.map((v) => v.id));
  return {
    ...s,
    tamanos,
    variantes: variantes.map((v) => ({
      ...v,
      precios: Object.fromEntries(vigentes.filter((p) => p.varianteId === v.id).map((p) => [p.tamanoId, p.monto])),
    })),
  };
}

export type CambioPrecio = { id: number; tamano: string; anterior: Monto | undefined; monto: Monto; fecha: Date; autor: string };

/**
 * Cambios de precio de una variante, del más reciente al más viejo, con el monto anterior de su tamaño
 * (`anterior` undefined: era el primero; antes estaba sin cargar).
 */
export async function historialPrecios(varianteId: number): Promise<CambioPrecio[]> {
  const filas = await db
    .select({
      id: precio.id,
      tamano: tamanoVehiculo.nombre,
      monto: precio.monto,
      fecha: precio.vigenteDesde,
      autor: usuario.name,
      // Con las uniones, Drizzle escribe cada columna con su tabla: la ventana no se confunde de tabla.
      posicion: sql<number>`row_number() over (partition by ${precio.tamanoId} order by ${precio.vigenteDesde}, ${precio.id})`.mapWith(Number),
      anterior: sql<Monto>`lag(${precio.monto}) over (partition by ${precio.tamanoId} order by ${precio.vigenteDesde}, ${precio.id})`,
    })
    .from(precio)
    .innerJoin(tamanoVehiculo, eq(precio.tamanoId, tamanoVehiculo.id))
    .innerJoin(usuario, eq(precio.createdBy, usuario.id))
    .where(eq(precio.varianteId, varianteId))
    .orderBy(desc(precio.vigenteDesde), desc(precio.id));
  return filas.map(({ posicion, anterior, ...f }) => ({ ...f, anterior: posicion === 1 ? undefined : anterior }));
}
