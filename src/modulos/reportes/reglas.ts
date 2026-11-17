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

/** "noviembre", sin el año. */
export const nombreMesSolo = (mes: string) => NOMBRE_MES[Number(mes.slice(5)) - 1];

/** "Nov", para las barras. */
export const mesCorto = (mes: string) => nombreMesSolo(mes).slice(0, 3).replace(/^./, (l) => l.toUpperCase());

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

/** "11.330 Bs": los montos grandes de los reportes, con punto de miles y sin decimales (se leen de un vistazo). */
export function bsRedondo(monto: number): string {
  const redondo = Math.round(monto);
  const texto = String(Math.abs(redondo)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  // El signo, del monto ya redondeado: una pérdida de 0,30 Bs no es "−0 Bs"
  return `${redondo < 0 ? "−" : ""}${texto} Bs`;
}

/**
 * Los vehículos entregados y los clientes de cada mes, a partir de todas las entregas: entregados es cuántas hubo en el
 * mes; de los clientes que se llevaron un vehículo en el mes, volvió el que ya se había llevado uno antes del mes o se
 * llevó más de uno en él, y nuevo el resto.
 */
export function entregasPorMes(entregas: readonly { clienteId: number; dia: string }[], meses: readonly string[]) {
  return meses.map((mes) => {
    const delMes = entregas.filter((e) => mesDe(e.dia) === mes);
    const veces = new Map<number, number>();
    for (const e of delMes) veces.set(e.clienteId, (veces.get(e.clienteId) ?? 0) + 1);
    let volvieron = 0;
    for (const [clienteId, n] of veces) {
      const antes = entregas.some((e) => e.clienteId === clienteId && e.dia < `${mes}-01`);
      if (antes || n > 1) volvieron++;
    }
    return { mes, entregados: delMes.length, volvieron, nuevos: veces.size - volvieron };
  });
}

/** Lo acumulado día a día de lo que entró: [lo del día 1, lo del 1 y el 2, …] hasta `dias`. */
export function acumularPorDia(porDia: readonly { dia: number; total: number }[], dias: number): number[] {
  const resultado: number[] = [];
  let suma = 0;
  for (let d = 1; d <= dias; d++) {
    suma += porDia.find((x) => x.dia === d)?.total ?? 0;
    resultado.push(Math.round(suma * 100) / 100);
  }
  return resultado;
}

/** Cuántos días tiene un mes ("2026-11" → 30). */
export const diasDelMes = (mes: string) => Number(rangoDelMes(mes).fin.slice(8));

/**
 * Un eje con números redondos para el valor más alto: el tope y el paso entre líneas guía (1, 2 o 5 por una potencia
 * de 10, con unas 4 líneas). 18.450 → tope 20.000 cada 5.000; 42 → 50 cada 10. Sin datos, de 0 a 4.
 */
export function escalaBonita(maximo: number, lineas = 4): { tope: number; paso: number } {
  if (!(maximo > 0)) return { tope: 4, paso: 1 };
  const bruto = maximo / lineas;
  const potencia = 10 ** Math.floor(Math.log10(bruto));
  const paso = [1, 2, 2.5, 5, 10].map((m) => m * potencia).find((p) => p >= bruto)!;
  return { tope: Math.ceil(maximo / paso) * paso, paso };
}

/** "5 mil", "12,5 mil", "800": las etiquetas del eje de montos. */
export const textoEje = (v: number) => (v >= 1000 ? `${String(v / 1000).replace(".", ",")} mil` : String(v));

/** Cuánto cambió algo frente al mes anterior, en por ciento redondeado; null si el anterior fue cero o menos. */
export const cambioPorcentual = (actual: number, anterior: number) => (anterior > 0 ? Math.round(((actual - anterior) / anterior) * 100) : null);
