import "server-only";

import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { servicio, variante } from "@/db/esquema";
import { preciosVigentes } from "@/modulos/catalogo/consultas";
import { duracionEfectiva, type Monto } from "@/modulos/catalogo/reglas";
import { obtenerParametros } from "@/modulos/configuracion/consultas";
import { descripcionLinea, fechaValidez, precioSugerido, type Sugerencia } from "../reglas";

// Lecturas de las cotizaciones (C2, P23, P39, P40, P47). Quien las llama ya pasó por su permiso (Cotizaciones;
// los precios, solo con él). Especificación: docs/08-desarrollo/etapas/C2-consultas-cotizaciones.md.
// Aquí: las opciones de servicio con sus precios por tamaño, y los valores con que empieza una cotización.

export type OpcionServicio = {
  varianteId: number;
  servicioId: number;
  servicio: string;
  variante: string;
  descripcion: string;
  sugerencia: Sugerencia;
  /** Días estimados (la de la variante o la del servicio, RF-27): sugieren la entrega en la agenda (C3). */
  duracion: number;
};

/** Las variantes activas, en el orden del catálogo, con sus precios vigentes por tamaño. */
async function variantesConPrecios(soloVariante?: number) {
  const variantes = await db
    .select({
      varianteId: variante.id,
      servicioId: servicio.id,
      servicio: servicio.nombre,
      variante: variante.nombre,
      duracionServicio: servicio.duracionDias,
      duracionVariante: variante.duracionDias,
    })
    .from(variante)
    .innerJoin(servicio, eq(variante.servicioId, servicio.id))
    .where(and(eq(variante.activo, true), eq(servicio.activo, true), soloVariante === undefined ? undefined : eq(variante.id, soloVariante)))
    .orderBy(asc(servicio.orden), asc(servicio.id), asc(variante.orden), asc(variante.id));
  const vigentes = await preciosVigentes(variantes.map((v) => v.varianteId));
  const porVariante = new Map<number, Map<number, Monto>>();
  for (const p of vigentes) {
    if (!porVariante.has(p.varianteId)) porVariante.set(p.varianteId, new Map());
    porVariante.get(p.varianteId)!.set(p.tamanoId, p.monto);
  }
  return (tamanoId: number): OpcionServicio[] =>
    variantes.map(({ duracionServicio, duracionVariante, ...v }) => ({
      ...v,
      descripcion: descripcionLinea(v.servicio, v.variante),
      sugerencia: precioSugerido(porVariante.get(v.varianteId) ?? new Map(), tamanoId),
      duracion: duracionEfectiva({ duracionDias: duracionServicio }, { duracionDias: duracionVariante }),
    }));
}

/**
 * Los servicios activos, por variante, con el precio vigente para ese tamaño de vehículo (RF-31). Los usan la
 * cotización, la reserva directa (C3) y los adicionales de la orden (C4, con `soloVariante`: una sola).
 */
export async function opcionesDeServicio(tamanoId: number, soloVariante?: number): Promise<OpcionServicio[]> {
  return (await variantesConPrecios(soloVariante))(tamanoId);
}

/**
 * Las mismas opciones para cada tamaño, en una sola lectura: en la nueva cotización el tamaño se elige en el mismo
 * formulario (un vehículo nuevo) y el precio sugerido cambia con él.
 */
export async function opcionesPorTamano(tamanoIds: readonly number[]): Promise<Record<number, OpcionServicio[]>> {
  const para = await variantesConPrecios();
  return Object.fromEntries([...new Set(tamanoIds)].map((t) => [t, para(t)]));
}

/** Con qué arranca una cotización nueva: la validez y el adelanto de Configuración. */
export async function inicioCotizacion(): Promise<{ validaHasta: string; adelanto: string }> {
  const parametros = await obtenerParametros();
  return { validaHasta: fechaValidez(new Date(), parametros.validez_cotizacion_dias), adelanto: parametros.adelanto_sugerido.toFixed(2) };
}
