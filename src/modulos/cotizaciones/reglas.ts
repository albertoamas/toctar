import { fechaEnBolivia, sumarDias } from "@/lib/fechas";
import { leerMonto, type Monto } from "@/modulos/catalogo/reglas";

// Reglas puras de las cotizaciones (C2, HU-25). Sin base ni servidor: las prueba tests/unit/cotizaciones.test.ts.
// Especificación: docs/08-desarrollo/etapas/C2-consultas-cotizaciones.md §3 y §6.
// Los montos viajan como texto con dos decimales ("250.50"), como los guarda numeric(10,2). Las cuentas se hacen en
// centavos enteros: con decimales de coma flotante, 0,1 + 0,2 no da 0,3.

export const MAXIMO_LINEAS = 20;
export const MAXIMO_FOTOS_PDF = 4;

const aCentavos = (monto: string) => Math.round(Number(monto) * 100);
const deCentavos = (centavos: number) => (centavos / 100).toFixed(2);

export type Totales = { subtotal: string; descuento: string; total: string };

/** Subtotal de las líneas, descuento y total (nunca negativo: un descuento mayor lo frena la validación). */
export function calcularTotales(precios: readonly string[], descuento: string): Totales {
  const subtotal = precios.reduce((suma, p) => suma + aCentavos(p), 0);
  const rebaja = aCentavos(descuento);
  return { subtotal: deCentavos(subtotal), descuento: deCentavos(rebaja), total: deCentavos(Math.max(0, subtotal - rebaja)) };
}

/** a ≤ b, con montos en texto. */
export const montoNoMayor = (a: string, b: string) => aCentavos(a) <= aCentavos(b);

/** a − b, con montos en texto (puede dar negativo: un saldo a favor). */
export const restarMontos = (a: string, b: string) => deCentavos(aCentavos(a) - aCentavos(b));

/** El año de una cotización es el de Bolivia: una del 31/12 a las 22:00 en La Paz es del año que termina. */
export const anioCotizacion = (instante: Date = new Date()) => Number(fechaEnBolivia(instante).slice(0, 4));

/** "2026-0042". */
export const numeroCotizacion = (anio: number, correlativo: number) => `${anio}-${String(correlativo).padStart(4, "0")}`;

/** Clave del correlativo del año en la tabla `correlativo`. */
export const claveCorrelativo = (anio: number) => `cotizacion-${anio}`;

export type Sugerencia = { tipo: "monto"; monto: string } | { tipo: "evaluacion" } | { tipo: "sin_cargar" };

/**
 * Precio sugerido de una variante para el tamaño del vehículo (RF-31): el vigente del catálogo. "Según evaluación"
 * (monto nulo) y "sin cargar" (sin fila) obligan a escribirlo.
 */
export function precioSugerido(vigentes: ReadonlyMap<number, Monto>, tamanoId: number): Sugerencia {
  if (!vigentes.has(tamanoId)) return { tipo: "sin_cargar" };
  const monto = vigentes.get(tamanoId);
  return monto ? { tipo: "monto", monto } : { tipo: "evaluacion" };
}

/** Fecha de validez sugerida (S-5): hoy en Bolivia más los días de Configuración. */
export const fechaValidez = (hoy: Date, dias: number) => sumarDias(fechaEnBolivia(hoy), dias);

/**
 * Con qué línea arranca una cotización nueva (pulido 9.4): el servicio de interés de la consulta. Si tiene una sola
 * variante, ya elegida y con su precio sugerido (vacío si es "según evaluación" o no está cargado); si tiene varias, el
 * servicio elegido y falta la opción. Sin servicio de interés ("todavía no sabe") o si ya no se ofrece, ninguna.
 */
export function lineasDelServicioDeInteres(
  opciones: readonly { servicioId: number; varianteId: number; sugerencia: Sugerencia }[],
  servicioId: number | null,
): { servicioId?: number; varianteId: number; precio: string }[] {
  const delServicio = servicioId ? opciones.filter((o) => o.servicioId === servicioId) : [];
  if (delServicio.length === 0) return [];
  if (delServicio.length > 1) return [{ servicioId: delServicio[0].servicioId, varianteId: 0, precio: "" }];
  const [unica] = delServicio;
  return [{ varianteId: unica.varianteId, precio: unica.sugerencia.tipo === "monto" ? unica.sugerencia.monto : "" }];
}

/** "Pulido y nano cerámico — 5 años"; con la variante "Única" (servicio sin opciones, D-2), solo el servicio. */
/**
 * "Pulido y nano cerámico (2 años)": la descripción de una línea, en el panel, la cotización y su PDF. La opción va entre
 * paréntesis (antes, tras un guion largo); "Única" no se escribe.
 */
export const descripcionLinea = (servicio: string, variante: string) => (variante.trim().toLowerCase() === "única" ? servicio : `${servicio} (${variante})`);

/**
 * Las opciones del catálogo agrupadas por servicio, en su orden (pulido 9.4): se elige primero el servicio y, si tiene
 * varias, la opción en otro menú. Así se distingue a simple vista cuál tiene opciones.
 */
export function serviciosConOpciones<T extends { servicioId: number; servicio: string }>(opciones: readonly T[]): { servicioId: number; servicio: string; opciones: T[] }[] {
  const grupos = new Map<number, { servicioId: number; servicio: string; opciones: T[] }>();
  for (const o of opciones) {
    const grupo = grupos.get(o.servicioId) ?? { servicioId: o.servicioId, servicio: o.servicio, opciones: [] };
    grupo.opciones.push(o);
    grupos.set(o.servicioId, grupo);
  }
  return [...grupos.values()];
}

/**
 * Lee un monto que puede ser cero (descuento, adelanto): vacío o "0" es "0.00". Mismo formato que los precios
 * ("250", "250,5", "250.50"). Devuelve undefined si no es válido.
 */
export function leerMontoOCero(texto: string): string | undefined {
  const limpio = texto.trim();
  if (limpio === "" || /^0+([.,]0{1,2})?$/.test(limpio)) return "0.00";
  return leerMonto(limpio) ?? undefined;
}

/** "Cotizacion-2026-0042.pdf", "Cotizacion-2026-0042-v2.pdf": sin tildes, para cualquier teléfono o computadora. */
export const nombreArchivoPdf = (numero: string, version: number) => `Cotizacion-${numero}${version > 1 ? `-v${version}` : ""}.pdf`;
