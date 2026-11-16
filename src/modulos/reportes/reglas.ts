import { sumarDias } from "@/lib/fechas";

// Pedido 16 (P16-reportes-y-gastos.md): los meses de los gastos y los reportes. Las fechas ya están en hora de Bolivia
// (un pago o un gasto guarda su día, no su instante): un mes es del día 1 al último, sin pasar por UTC.
// Reglas puras, probadas en tests/unit/reportes.test.ts.

const NOMBRE_MES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"] as const;

/** Un mes "AAAA-MM", del 2000 al 2100 (con años extremos las fechas dejan de tener cuatro cifras y la base las rechaza). */
export const esMes = (valor: unknown): valor is string =>
  typeof valor === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(valor) && valor >= "2000-01" && valor <= "2100-12";

/** El mes de una fecha "AAAA-MM-DD". */
export const mesDe = (fecha: string) => fecha.slice(0, 7);

/** El mes N meses antes (negativo) o después. */
export function sumarMeses(mes: string, n: number): string {
  const [anio, numero] = mes.split("-").map(Number);
  const total = anio * 12 + (numero - 1) + n;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`;
}

/** Del día 1 al último del mes, para filtrar por fecha. */
export function rangoDelMes(mes: string): { inicio: string; fin: string } {
  return { inicio: `${mes}-01`, fin: sumarDias(`${sumarMeses(mes, 1)}-01`, -1) };
}

/** "noviembre de 2026". */
export function nombreMes(mes: string): string {
  const [anio, numero] = mes.split("-").map(Number);
  return `${NOMBRE_MES[numero - 1]} de ${anio}`;
}

/** "Noviembre de 2026", para un título. */
export const tituloMes = (mes: string) => nombreMes(mes).charAt(0).toUpperCase() + nombreMes(mes).slice(1);

/**
 * Desde cuándo se puede registrar un gasto: el 1 de enero del año pasado. Un gasto de antes ya no cambia ningún
 * reporte que se mire, y así un año mal escrito ("2062") no pasa.
 */
export const primerDiaDeGastos = (hoy: string) => `${Number(hoy.slice(0, 4)) - 1}-01-01`;

/** Hasta cuántos caracteres llevan el detalle de un gasto y el motivo de su anulación. */
export const LARGO_DETALLE = 200;
