import "server-only";
import { asc, desc, eq, inArray, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { ElementoLista } from "@/componentes/panel/lista-editable";
import { db } from "@/db";
import { precio, servicio, tamanoVehiculo, usuario, variante } from "@/db/esquema";
import { tamanosActivos, type Tamano } from "@/modulos/configuracion/consultas";
import { clavePrecio, precioDesde, preciosFaltantes, type Monto } from "./reglas";

// Lecturas del catálogo (C1). Quien las llama ya pasó por exigirModulo("catalogo"): solo el dueño (RN-01).

export type FilaCatalogo = {
  id: number;
  nombre: string;
  activo: boolean;
  duracionDias: number;
  /** Al entregarlo, programa su mantenimiento (pedido 21). */
  conMantenimiento: boolean;
  variantes: number;
  /** Pares variante y tamaño activos sin precio cargado. */
  preciosFaltantes: number;
  /** El menor de sus precios vigentes ("Desde 700 Bs"); null si todos son según evaluación; undefined, sin precios. */
  desde: Monto | undefined;
};

/** Todos los servicios, los activos primero y en el orden del sitio, con su precio más bajo y cuántos precios les faltan. */
export async function listarCatalogo(): Promise<FilaCatalogo[]> {
  const [servicios, variantes, tamanos, todos] = await Promise.all([
    db
      .select({
        id: servicio.id,
        nombre: servicio.nombre,
        activo: servicio.activo,
        duracionDias: servicio.duracionDias,
        conMantenimiento: sql<boolean>`${servicio.mantenimientoMeses} is not null`,
      })
      .from(servicio)
      .orderBy(desc(servicio.activo), asc(servicio.orden), asc(servicio.id)),
    db.select({ id: variante.id, servicioId: variante.servicioId }).from(variante).where(eq(variante.activo, true)),
    tamanosActivos(),
    preciosVigentes("activas"),
  ]);
  const tamanoIds = new Set(tamanos.map((t) => t.id));
  // Solo los pares de variantes y tamaños activos: los demás no se cotizan
  const vigentes = todos.filter((p) => tamanoIds.has(p.tamanoId));
  const conPrecio = new Set(vigentes.map((p) => clavePrecio(p.varianteId, p.tamanoId)));
  // Agrupadas, para no recorrer las listas enteras por cada servicio
  const variantesDe = Map.groupBy(variantes, (v) => v.servicioId);
  const montosDe = Map.groupBy(vigentes, (p) => p.varianteId);
  return servicios.map((s) => {
    const suyas = (variantesDe.get(s.id) ?? []).map((v) => v.id);
    const montos = suyas.flatMap((v) => (montosDe.get(v) ?? []).map((p) => p.monto));
    return { ...s, variantes: suyas.length, preciosFaltantes: preciosFaltantes(suyas, [...tamanoIds], conPrecio), desde: precioDesde(montos) };
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
  /** Si su página se muestra en el sitio (se decide en Sitio web). */
  visibleSitio: boolean;
  duracionDias: number;
  /** Su mantenimiento (pedido 21): el servicio que se agenda (puede ser él mismo) y cada cuántos meses; null si no tiene. */
  mantenimiento: { servicioId: number; servicio: string; meses: number } | null;
  /** Los servicios activos, para elegir su mantenimiento (este primero). */
  serviciosParaMantenimiento: { id: number; nombre: string }[];
  /** Las activas, con sus precios. */
  variantes: VarianteCatalogo[];
  /** Todas, para agregar, ordenar y desactivar (las activas primero). */
  listaVariantes: ElementoLista[];
  tamanos: Tamano[];
};

/** Variantes de un servicio: activas primero, en su orden. */
export async function listarVariantes(servicioId: number) {
  return db
    .select({
      id: variante.id,
      nombre: variante.nombre,
      descripcion: variante.descripcion,
      orden: variante.orden,
      activo: variante.activo,
      duracionDias: variante.duracionDias,
    })
    .from(variante)
    .where(eq(variante.servicioId, servicioId))
    .orderBy(sql`${variante.activo} desc`, asc(variante.orden), asc(variante.id));
}

/** Precio vigente de cada par (D-3): la fila más reciente. De esas variantes o, con "activas", de todas las activas. */
export async function preciosVigentes(varianteIds: number[] | "activas"): Promise<{ varianteId: number; tamanoId: number; monto: Monto }[]> {
  if (varianteIds.length === 0) return [];
  const delFiltro = varianteIds === "activas" ? db.select({ id: variante.id }).from(variante).where(eq(variante.activo, true)) : varianteIds;
  return db
    .selectDistinctOn([precio.varianteId, precio.tamanoId], { varianteId: precio.varianteId, tamanoId: precio.tamanoId, monto: precio.monto })
    .from(precio)
    .where(inArray(precio.varianteId, delFiltro))
    .orderBy(precio.varianteId, precio.tamanoId, desc(precio.vigenteDesde), desc(precio.id));
}

/** Un servicio con sus variantes y los precios vigentes de las activas, o null si no existe. */
export async function obtenerServicioCatalogo(id: number): Promise<ServicioCatalogo | null> {
  const suyo = alias(servicio, "suyo");
  const [fila] = await db
    .select({
      id: servicio.id,
      nombre: servicio.nombre,
      activo: servicio.activo,
      visibleSitio: servicio.visibleSitio,
      duracionDias: servicio.duracionDias,
      mantenimientoServicioId: servicio.mantenimientoServicioId,
      mantenimientoMeses: servicio.mantenimientoMeses,
      mantenimientoServicio: suyo.nombre,
    })
    .from(servicio)
    .leftJoin(suyo, eq(servicio.mantenimientoServicioId, suyo.id))
    .where(eq(servicio.id, id));
  if (!fila) return null;
  const { mantenimientoServicioId, mantenimientoMeses, mantenimientoServicio, ...s } = fila;
  const mantenimiento =
    mantenimientoServicioId && mantenimientoMeses && mantenimientoServicio ? { servicioId: mantenimientoServicioId, servicio: mantenimientoServicio, meses: mantenimientoMeses } : null;
  const [todas, tamanos, activos] = await Promise.all([
    listarVariantes(id),
    tamanosActivos(),
    db.select({ id: servicio.id, nombre: servicio.nombre }).from(servicio).where(eq(servicio.activo, true)).orderBy(asc(servicio.orden), asc(servicio.id)),
  ]);
  const serviciosParaMantenimiento = [{ id: s.id, nombre: s.nombre }, ...activos.filter((a) => a.id !== s.id)];
  const activas = todas.filter((v) => v.activo);
  const vigentes = await preciosVigentes(activas.map((v) => v.id));
  return {
    ...s,
    mantenimiento,
    serviciosParaMantenimiento,
    tamanos,
    listaVariantes: todas,
    variantes: activas.map((v) => ({
      id: v.id,
      nombre: v.nombre,
      duracionDias: v.duracionDias,
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
