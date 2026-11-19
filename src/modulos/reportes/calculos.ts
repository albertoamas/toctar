import type { Cobro, DatosDelPeriodo, GastoDelPeriodo, LineaDeOrden, OrdenDelPeriodo } from "./datos";
import type { Tramo } from "./reglas";

// Reportes v2 (19/11): lo que se calcula de los datos de unas fechas (datos.ts). Funciones puras, probadas en
// tests/unit/reportes-calculos.test.ts. `hastaHora` ("HH:MM") corta el día: "Hoy" contra el mismo día de la semana
// pasada hasta la misma hora.

/** Los datos de un período, con el corte de hora aplicado (si lo hay). */
export function hastaLaHora(d: DatosDelPeriodo, hastaHora?: string): DatosDelPeriodo {
  if (!hastaHora) return d;
  return {
    cobros: d.cobros.filter((c) => c.hora <= hastaHora),
    gastos: d.gastos.filter((g) => g.hora <= hastaHora),
    ordenes: d.ordenes.map((o) => ({
      ...o,
      recibido: o.recibido && o.horaRecibido && o.horaRecibido <= hastaHora ? o.recibido : null,
      entregado: o.entregado && o.horaEntregado && o.horaEntregado <= hastaHora ? o.entregado : null,
    })),
    lineas: d.lineas,
  };
}

const enRango = (fecha: string | null, inicio: string, fin: string) => fecha !== null && fecha >= inicio && fecha <= fin;

export type Indicadores = {
  ingresos: number;
  /** Órdenes distintas con al menos un cobro. */
  cobradas: number;
  ticket: number;
  gastos: number;
  movimientos: number;
  resultado: number;
  recibidas: number;
  completadas: number;
  /** Días promedio de recibida a entregada, de las completadas; null sin completadas. */
  diasPromedio: number | null;
  clientes: number;
  nuevos: number;
  volvieron: number;
};

/** Los indicadores de unas fechas. `primeras`: el primer día de entrega de cada cliente (nuevo si cae en las fechas). */
export function indicadores(d: DatosDelPeriodo, inicio: string, fin: string, primeras: Map<number, string>): Indicadores {
  const ingresos = d.cobros.reduce((s, c) => s + c.monto, 0);
  const cobradas = new Set(d.cobros.map((c) => c.trabajoId)).size;
  const gastos = d.gastos.reduce((s, g) => s + g.monto, 0);
  const completadas = d.ordenes.filter((o) => o.estado === "entregado" && enRango(o.entregado, inicio, fin));
  const recibidas = d.ordenes.filter((o) => enRango(o.recibido, inicio, fin)).length;
  const dias = completadas.map((o) => o.dias).filter((x): x is number => x !== null);
  const clientes = new Set(completadas.map((o) => o.clienteId));
  const nuevos = [...clientes].filter((id) => enRango(primeras.get(id) ?? null, inicio, fin)).length;
  return {
    ingresos,
    cobradas,
    ticket: cobradas ? ingresos / cobradas : 0,
    gastos,
    movimientos: d.gastos.length,
    resultado: ingresos - gastos,
    recibidas,
    completadas: completadas.length,
    diasPromedio: dias.length ? dias.reduce((s, x) => s + x, 0) / dias.length : null,
    clientes: clientes.size,
    nuevos,
    volvieron: clientes.size - nuevos,
  };
}

export type PuntoDelTramo = { ingresos: number; gastos: number; cobradas: number; recibidas: number; completadas: number; clientes: number };

/**
 * Lo de cada tramo (un día, una semana, un mes) o, con `porHora`, de cada hora de un día ("Hoy"; los tramos llevan su
 * hora en `corto`: "15h"). Los gastos no tienen hora: por hora quedan en cero (la pestaña lo dice).
 */
export function porTramo(d: DatosDelPeriodo, tramos: Tramo[], porHora = false): PuntoDelTramo[] {
  const dentro = (fecha: string | null, hora: string | null, t: Tramo) =>
    porHora ? fecha === t.desde && hora !== null && Number(hora.slice(0, 2)) === Number(t.corto.replace("h", "")) : enRango(fecha, t.desde, t.hasta);
  return tramos.map((t) => {
    const cobros = d.cobros.filter((c) => dentro(c.fecha, c.hora, t));
    const completadas = d.ordenes.filter((o) => o.estado === "entregado" && dentro(o.entregado, o.horaEntregado, t));
    return {
      ingresos: cobros.reduce((s, c) => s + c.monto, 0),
      gastos: porHora ? 0 : d.gastos.filter((g) => enRango(g.fecha, t.desde, t.hasta)).reduce((s, g) => s + g.monto, 0),
      cobradas: new Set(cobros.map((c) => c.trabajoId)).size,
      recibidas: d.ordenes.filter((o) => dentro(o.recibido, o.horaRecibido, t)).length,
      completadas: completadas.length,
      clientes: new Set(completadas.map((o) => o.clienteId)).size,
    };
  });
}

/** Las horas con movimiento de un día: de la primera a la última (o a la de ahora). Sin movimiento, ninguna. */
export function horasConMovimiento(d: DatosDelPeriodo, hastaHora: string): [number, number] | null {
  const horas = [...d.cobros.map((c) => c.hora), ...d.ordenes.flatMap((o) => [o.horaRecibido, o.horaEntregado])].filter((h): h is string => !!h && h <= hastaHora).map((h) => Number(h.slice(0, 2)));
  if (!horas.length) return null;
  return [Math.min(...horas), Math.max(Math.max(...horas), Number(hastaHora.slice(0, 2)))];
}

export type PorServicio = { servicioId: number | null; nombre: string; total: number; veces: number };

/**
 * Lo cobrado repartido entre los servicios de cada orden, según el precio de sus líneas: una orden de un pulido de 1000
 * y un lavado de 200 que pagó 600 da 500 al pulido y 100 al lavado. Un cobro de una orden sin líneas va a "Otros".
 * `veces`: en cuántas de las órdenes cobradas estaba el servicio. De mayor a menor.
 */
export function cobradoPorServicio(cobros: Cobro[], lineas: LineaDeOrden[]): PorServicio[] {
  const deOrden = new Map<number, LineaDeOrden[]>();
  for (const l of lineas) deOrden.set(l.trabajoId, [...(deOrden.get(l.trabajoId) ?? []), l]);
  const suma = new Map<string, PorServicio & { ordenes: Set<number> }>();
  const sumar = (servicioId: number | null, nombre: string, monto: number, trabajoId: number) => {
    const clave = servicioId === null ? "otros" : String(servicioId);
    const x = suma.get(clave) ?? { servicioId, nombre, total: 0, veces: 0, ordenes: new Set<number>() };
    x.total += monto;
    x.ordenes.add(trabajoId);
    suma.set(clave, x);
  };
  for (const c of cobros) {
    const ls = deOrden.get(c.trabajoId) ?? [];
    const total = ls.reduce((s, l) => s + l.precio, 0);
    if (!ls.length || total <= 0) sumar(null, "Otros", c.monto, c.trabajoId);
    else for (const l of ls) sumar(l.servicioId, l.servicio, (c.monto * l.precio) / total, c.trabajoId);
  }
  return [...suma.values()].map(({ ordenes, ...x }) => ({ ...x, veces: ordenes.size })).sort((a, b) => b.total - a.total);
}

/** Lo cobrado por forma de pago, de mayor a menor. */
export function cobradoPorMetodo(cobros: Cobro[]): { metodo: Cobro["metodo"]; total: number }[] {
  const suma = new Map<Cobro["metodo"], number>();
  for (const c of cobros) suma.set(c.metodo, (suma.get(c.metodo) ?? 0) + c.monto);
  return [...suma.entries()].map(([metodo, total]) => ({ metodo, total })).sort((a, b) => b.total - a.total);
}

/** Lo gastado por categoría, de mayor a menor. */
export function gastadoPorCategoria(gastos: GastoDelPeriodo[]): { categoria: string; total: number; movimientos: number }[] {
  const suma = new Map<string, { total: number; movimientos: number }>();
  for (const g of gastos) {
    const x = suma.get(g.categoria) ?? { total: 0, movimientos: 0 };
    x.total += g.monto;
    x.movimientos++;
    suma.set(g.categoria, x);
  }
  return [...suma.entries()].map(([categoria, x]) => ({ categoria, ...x })).sort((a, b) => b.total - a.total);
}

const completadasEntre = (ordenes: OrdenDelPeriodo[], inicio: string, fin: string) => ordenes.filter((o) => o.estado === "entregado" && enRango(o.entregado, inicio, fin));

/**
 * Los servicios de las órdenes completadas: cuántas veces se hizo cada uno, lo que suman sus líneas y los días
 * promedio de las órdenes que lo incluyen (de recibida a entregada). Los más hechos primero.
 */
export function serviciosRealizados(d: DatosDelPeriodo, inicio: string, fin: string): { servicioId: number; nombre: string; veces: number; monto: number; diasPromedio: number | null }[] {
  const completadas = new Map(completadasEntre(d.ordenes, inicio, fin).map((o) => [o.id, o]));
  const suma = new Map<number, { nombre: string; ordenes: Set<number>; monto: number; dias: number[] }>();
  for (const l of d.lineas) {
    const o = completadas.get(l.trabajoId);
    if (!o) continue;
    const x = suma.get(l.servicioId) ?? { nombre: l.servicio, ordenes: new Set<number>(), monto: 0, dias: [] };
    x.monto += l.precio;
    if (!x.ordenes.has(o.id)) {
      x.ordenes.add(o.id);
      if (o.dias !== null) x.dias.push(o.dias);
    }
    suma.set(l.servicioId, x);
  }
  return [...suma.entries()]
    .map(([servicioId, x]) => ({ servicioId, nombre: x.nombre, veces: x.ordenes.size, monto: x.monto, diasPromedio: x.dias.length ? x.dias.reduce((s, v) => s + v, 0) / x.dias.length : null }))
    .sort((a, b) => b.veces - a.veces || b.monto - a.monto);
}

/** Las órdenes recibidas en las fechas, según cómo están hoy: entregadas, listas o en el taller (las canceladas, no). */
export function ordenesPorEstado(d: DatosDelPeriodo, inicio: string, fin: string): { entregadas: number; listas: number; enTaller: number } {
  const recibidas = d.ordenes.filter((o) => enRango(o.recibido, inicio, fin));
  return {
    entregadas: recibidas.filter((o) => o.estado === "entregado").length,
    listas: recibidas.filter((o) => o.estado === "listo").length,
    enTaller: recibidas.filter((o) => o.estado === "recibido" || o.estado === "en_proceso").length,
  };
}

/** Los clientes que más pagaron en las fechas: lo cobrado y en cuántas órdenes. De mayor a menor. */
export function clientesQueMasPagaron(cobros: Cobro[]): { clienteId: number; total: number; ordenes: number }[] {
  const suma = new Map<number, { total: number; ordenes: Set<number> }>();
  for (const c of cobros) {
    const x = suma.get(c.clienteId) ?? { total: 0, ordenes: new Set<number>() };
    x.total += c.monto;
    x.ordenes.add(c.trabajoId);
    suma.set(c.clienteId, x);
  }
  return [...suma.entries()].map(([clienteId, x]) => ({ clienteId, total: x.total, ordenes: x.ordenes.size })).sort((a, b) => b.total - a.total);
}
