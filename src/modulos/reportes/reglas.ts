import { fechaExiste, sumarDias } from "@/lib/fechas";

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
  // La primera vez que vino cada cliente: una pasada, no una búsqueda por cliente y mes
  const primera = new Map<number, string>();
  for (const e of entregas) if (!primera.has(e.clienteId) || e.dia < primera.get(e.clienteId)!) primera.set(e.clienteId, e.dia);
  return meses.map((mes) => {
    const delMes = entregas.filter((e) => mesDe(e.dia) === mes);
    const veces = new Map<number, number>();
    for (const e of delMes) veces.set(e.clienteId, (veces.get(e.clienteId) ?? 0) + 1);
    let volvieron = 0;
    for (const [clienteId, n] of veces) {
      const antes = primera.get(clienteId)! < `${mes}-01`;
      if (antes || n > 1) volvieron++;
    }
    return { mes, entregados: delMes.length, volvieron, nuevos: veces.size - volvieron };
  });
}

/**
 * Un eje con números redondos para el valor más alto: el tope y el paso entre líneas guía (1, 2 o 5 por una potencia
 * de 10, con unas 4 líneas). 18.450 → tope 20.000 cada 5.000; 42 → 50 cada 10. Sin datos, de 0 a 4.
 */
export function escalaBonita(maximo: number, lineas = 4, entero = false): { tope: number; paso: number } {
  if (!(maximo > 0)) return { tope: 4, paso: 1 };
  const bruto = maximo / lineas;
  const potencia = 10 ** Math.floor(Math.log10(bruto));
  const elegido = [1, 2, 2.5, 5, 10].map((m) => m * potencia).find((p) => p >= bruto)!;
  // Para cantidades (vehículos, clientes), de a 1 como mínimo y sin medios
  const paso = entero ? Math.max(1, Math.ceil(elegido)) : elegido;
  return { tope: Math.ceil(maximo / paso) * paso, paso };
}

/** "5 mil", "12,5 mil", "800": las etiquetas del eje de montos. */
export const textoEje = (v: number) => (v >= 1000 ? `${String(v / 1000).replace(".", ",")} mil` : String(v));

/** Cuánto cambió algo frente al mes anterior, en por ciento redondeado; null si el anterior fue cero o menos. */
export const cambioPorcentual = (actual: number, anterior: number) => (anterior > 0 ? Math.round(((actual - anterior) / anterior) * 100) : null);

// ---------------------------------------------------------------------------------------------
// Los períodos de Reportes (17/11): hoy, esta semana, este mes, el mes pasado o un rango de fechas. Cada uno se compara
// con el anterior del mismo largo, así la comparación es justa: "este mes" (del 1 a hoy) contra los mismos días del mes
// pasado, no contra el mes pasado entero.

const PERIODOS = ["hoy", "semana", "mes", "mes-pasado", "rango"] as const;
export type ClavePeriodo = (typeof PERIODOS)[number];

export type Periodo = {
  clave: ClavePeriodo;
  inicio: string;
  fin: string;
  /** El anterior del mismo largo, para comparar. */
  antes: { inicio: string; fin: string };
  /** "Hoy, 17 de noviembre", "Del 1 al 17 de noviembre"… */
  titulo: string;
  /** Lo que va en la tarjeta tras el cambio: "vs. ayer", "vs. semana pasada", "vs. oct.", "vs. período anterior". */
  vs: string;
  /** El mes en que termina el período: hasta él llegan las tendencias de 6 meses. */
  mes: string;
};

/** Días entre dos fechas, contando las dos ("2026-11-01" y "2026-11-17": 17). */
const largo = (inicio: string, fin: string) => Math.round((Date.parse(`${fin}T00:00:00Z`) - Date.parse(`${inicio}T00:00:00Z`)) / 86_400_000) + 1;

/** "17 de noviembre". */
export const diaYMes = (fecha: string) => `${Number(fecha.slice(8))} de ${nombreMesSolo(fecha.slice(0, 7))}`;

/** "Del 1 al 17 de noviembre", "Del 28 de octubre al 3 de noviembre", "17 de noviembre". */
export function textoRango(inicio: string, fin: string): string {
  if (inicio === fin) return diaYMes(inicio);
  const otroAnio = inicio.slice(0, 4) !== fin.slice(0, 4);
  const ini = otroAnio ? `${diaYMes(inicio)} de ${inicio.slice(0, 4)}` : inicio.slice(0, 7) === fin.slice(0, 7) ? String(Number(inicio.slice(8))) : diaYMes(inicio);
  return `Del ${ini} al ${diaYMes(fin)}${otroAnio ? ` de ${fin.slice(0, 4)}` : ""}`;
}

/** Un rango pedido sirve si son fechas reales, en orden, no futuras, desde el 2000 y de hasta un año. */
export function rangoValido(desde: unknown, hasta: unknown, hoy: string): desde is string {
  if (typeof desde !== "string" || typeof hasta !== "string") return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(desde) || !/^\d{4}-\d{2}-\d{2}$/.test(hasta)) return false;
  if (!fechaExiste(desde) || !fechaExiste(hasta) || desde < "2000-01-01" || desde > hasta || hasta > hoy) return false;
  return largo(desde, hasta) <= 366;
}

/**
 * El período elegido en la dirección (`?periodo=`, y `desde` y `hasta` para un rango). Sin período o con uno raro, este
 * mes; un rango que no sirve, los últimos 30 días.
 */
export function periodoDe(parametros: { periodo?: unknown; desde?: unknown; hasta?: unknown }, hoy: string): Periodo {
  const clave: ClavePeriodo = PERIODOS.includes(parametros.periodo as ClavePeriodo) ? (parametros.periodo as ClavePeriodo) : "mes";
  const mesHoy = mesDe(hoy);
  const corto = (mes: string) => `vs. ${nombreMesSolo(mes).slice(0, 3)}.`;
  switch (clave) {
    case "hoy":
      return { clave, inicio: hoy, fin: hoy, antes: { inicio: sumarDias(hoy, -1), fin: sumarDias(hoy, -1) }, titulo: `Hoy, ${diaYMes(hoy)}`, vs: "vs. ayer", mes: mesHoy };
    case "semana": {
      const lunes = sumarDias(hoy, 1 - diaDeLaSemanaIso(hoy));
      return { clave, inicio: lunes, fin: hoy, antes: { inicio: sumarDias(lunes, -7), fin: sumarDias(hoy, -7) }, titulo: `Esta semana: ${textoRango(lunes, hoy).replace(/^Del /, "del ")}`, vs: "vs. semana pasada", mes: mesHoy };
    }
    case "mes-pasado": {
      const mes = sumarMeses(mesHoy, -1);
      const antes = sumarMeses(mes, -1);
      return { clave, ...rangoDelMes(mes), antes: rangoDelMes(antes), titulo: tituloMes(mes), vs: corto(antes), mes };
    }
    case "rango": {
      const valido = rangoValido(parametros.desde, parametros.hasta, hoy);
      const inicio = valido ? (parametros.desde as string) : sumarDias(hoy, -29);
      const fin = valido ? (parametros.hasta as string) : hoy;
      const dias = largo(inicio, fin);
      return { clave, inicio, fin, antes: { inicio: sumarDias(inicio, -dias), fin: sumarDias(inicio, -1) }, titulo: textoRango(inicio, fin), vs: "vs. período anterior", mes: mesDe(fin) };
    }
    default: {
      // Este mes, del 1 a hoy, contra los mismos días del mes pasado (hasta su último día, si es más corto)
      const inicio = `${mesHoy}-01`;
      const antes = sumarMeses(mesHoy, -1);
      const finAntes = rangoDelMes(antes).fin;
      const mismoDia = `${antes}-${hoy.slice(8)}`;
      return { clave: "mes", inicio, fin: hoy, antes: { inicio: `${antes}-01`, fin: mismoDia < finAntes ? mismoDia : finAntes }, titulo: hoy.slice(8) === "01" ? `${tituloMes(mesHoy)}, día 1` : `${tituloMes(mesHoy)}, del 1 al ${Number(hoy.slice(8))}`, vs: corto(antes), mes: mesHoy };
    }
  }
}

/** Día de la semana de una fecha: 1 = lunes … 7 = domingo. */
function diaDeLaSemanaIso(fecha: string): number {
  const d = new Date(`${fecha}T12:00:00Z`).getUTCDay();
  return d === 0 ? 7 : d;
}

/** Días entre dos fechas, contando las dos ("2026-11-01" a "2026-11-17": 17). */
export const diasEntre = largo;

/**
 * Lo que se va juntando día a día desde `inicio`, por `dias` días: cada valor es la suma hasta ese día. Los días sin
 * pagos repiten la suma anterior.
 */
export function acumuladoDesde(porDia: readonly { fecha: string; total: number }[], inicio: string, dias: number): number[] {
  const delDia = new Map(porDia.map((d) => [d.fecha, d.total]));
  const resultado: number[] = [];
  let suma = 0;
  for (let i = 0; i < dias; i++) {
    suma += delDia.get(sumarDias(inicio, i)) ?? 0;
    resultado.push(suma);
  }
  return resultado;
}

/**
 * Contra qué se dibuja la línea punteada del acumulado: este mes y esta semana, contra el mes o la semana anterior
 * enteros (se ve a dónde llegó); lo demás, contra el período anterior del mismo largo.
 */
export function comparacionDelAcumulado(periodo: Periodo): { inicio: string; fin: string } {
  if (periodo.clave === "mes") return rangoDelMes(sumarMeses(periodo.mes, -1));
  if (periodo.clave === "semana") return { inicio: periodo.antes.inicio, fin: sumarDias(periodo.antes.inicio, 6) };
  return periodo.antes;
}
