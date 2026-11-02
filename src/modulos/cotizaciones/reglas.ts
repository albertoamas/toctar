import type { EstadoConsulta, MotivoPerdida } from "@/db/esquema/consultas";
import type { TonoEstado } from "@/componentes/panel/fila-lista";
import { diasEntre, fechaEnBolivia, sumarDias } from "@/lib/fechas";
import { leerMonto, mostrarMonto, type Monto } from "@/modulos/catalogo/reglas";

// Reglas puras de las cotizaciones (C2, HU-25; pedido 23). Sin base ni servidor: las prueba tests/unit/cotizaciones.test.ts.
// Especificación: docs/08-desarrollo/etapas/P23-cotizacion-directa.md (antes, C2-consultas-cotizaciones.md).
// Los montos viajan como texto con dos decimales ("250.50"), como los guarda numeric(10,2). Las cuentas se hacen en
// centavos enteros: con decimales de coma flotante, 0,1 + 0,2 no da 0,3.

export const MAXIMO_LINEAS = 20;

/** "1250,50 Bs": el mismo formato en la lista, la ficha y el formulario (no depende del idioma del servidor o del teléfono). */
export const bs = (monto: string) => `${mostrarMonto(monto)} Bs`;

/**
 * El estado de una cotización es el de su encabezado (la tabla `consulta`, D-12), con los nombres de la interfaz.
 * "consulto" solo queda en lo registrado antes del pedido 23: no se muestra en ninguna lista.
 */
export const NOMBRE_ESTADO: Record<EstadoConsulta, string> = {
  consulto: "Sin cotizar",
  cotizado: "Pendiente",
  confirmado: "Aceptada",
  perdido: "Rechazada",
};

/** Tono de la insignia de cada estado (`ListaFilas` y la ficha): la pendiente, sin tono; la rechazada, en rojo. */
export const TONO_ESTADO: Partial<Record<EstadoConsulta, TonoEstado>> = { confirmado: "exito", perdido: "peligro" };

export const NOMBRE_MOTIVO: Record<MotivoPerdida, string> = { precio: "Precio", no_respondio: "No respondió", otro: "Otro" };
/** Los motivos, del texto de cada uno y no del esquema de la base: así no se arrastra Drizzle al navegador. */
export const MOTIVOS = Object.keys(NOMBRE_MOTIVO) as [MotivoPerdida, ...MotivoPerdida[]];

/** Pestañas de la lista, cada una con su estado. */
export const VISTAS = { pendientes: "cotizado", aceptadas: "confirmado", rechazadas: "perdido" } as const satisfies Record<string, EstadoConsulta>;
export type Vista = keyof typeof VISTAS;

/**
 * Cambios de estado (RF-30): una pendiente se acepta al agendarla (C3), se rechaza o recibe una versión nueva (sigue
 * pendiente); una rechazada vuelve a pendiente. Una aceptada no cambia desde aquí: si se cancela su reserva, la agenda
 * la pasa a rechazada.
 */
export function transicionPermitida(estado: EstadoConsulta, destino: EstadoConsulta): boolean {
  if (estado === "cotizado") return destino === "cotizado" || destino === "confirmado" || destino === "perdido";
  if (estado === "perdido") return destino === "cotizado";
  return false;
}

/** Días calendario, en hora de Bolivia, desde un instante hasta hoy: lo de anoche a las 23:00 ya es "hace 1 día". */
export function diasDesde(instante: Date, hoy: Date = new Date()): number {
  return Math.max(0, diasEntre(fechaEnBolivia(instante), fechaEnBolivia(hoy)));
}

export const textoDias = (dias: number) => (dias === 0 ? "hoy" : dias === 1 ? "hace 1 día" : `hace ${dias} días`);

/** Una pendiente sin movimiento desde hace `umbral` días (Configuración) espera respuesta: se resalta (RF-35). */
export const sinRespuesta = (estado: EstadoConsulta, dias: number, umbral: number) => estado === "cotizado" && dias >= umbral;

/** Cómo se cotizó (RN-03): por fotos es un estimado y el PDF lo dice. */
export const MODOS = ["persona", "fotos"] as const;
export type Modo = (typeof MODOS)[number];
export const NOMBRE_MODO: Record<Modo, string> = { persona: "En persona", fotos: "Por fotos" };
export const modoDe = (esEstimado: boolean): Modo => (esEstimado ? "fotos" : "persona");

/** Valor del selector de cliente para registrarlo ahí mismo, y del de vehículo para agregar otro. */
export const CLIENTE_NUEVO = "nuevo";
export const VEHICULO_OTRO = "otro";

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

/** El PDF de una versión, dentro de su cotización (pedido 23): la ruta comprueba que la versión sea de esa cotización. */
export const rutaPdf = (consultaId: number, versionId: number) => `/panel/cotizaciones/${consultaId}/pdf/${versionId}` as const;
