import type { EstadoRecordatorio } from "@/db/esquema/mantenimientos";
import { diasEntre, mesYAnio, sumarDias, sumarMeses } from "@/lib/fechas";
import { mostrarMonto } from "@/modulos/catalogo/reglas";
import type { Sugerencia } from "@/modulos/cotizaciones/reglas";

// Reglas de los recordatorios de mantenimiento (HU-38, RF-50) y de los planes por vehículo (pedido 21).
// Especificación: C4-taller-entrega.md §5 y §6, y P21-planes-mantenimiento.md §6.

/**
 * Cuántos días hacia adelante muestra "Próximos": los que vencen pronto, para avisar con tiempo. Es cómo se arma la
 * pantalla (C4-taller-entrega.md §5, "Próximos 15 días"), no un valor del negocio: cada cuánto toca el mantenimiento
 * sí es configurable (en cada servicio del catálogo y en cada plan, pedido 21). Hacerlo configurable es el pedido 19.
 */
export const DIAS_PROXIMOS = 15;

/** Los que todavía se avisan: ni agendados ni cerrados. */
export const ESTADOS_RECORDATORIO_ABIERTO = ["pendiente", "avisado"] as const satisfies readonly EstadoRecordatorio[];

/** Los que ya no se avisan: agendados (con su reserva), hechos (con la orden que los hizo) o "No le interesa". */
export const ESTADOS_RECORDATORIO_CERRADO = ["agendado", "hecho", "no_interesado"] as const satisfies readonly EstadoRecordatorio[];

/** El plan de un vehículo sigue abierto: por avisar, avisado o agendado (el índice único de la base cuenta estos). */
export const ESTADOS_PLAN_ABIERTO = ["pendiente", "avisado", "agendado"] as const satisfies readonly EstadoRecordatorio[];

export const NOMBRE_ESTADO_RECORDATORIO: Record<EstadoRecordatorio, string> = {
  pendiente: "Por avisar",
  avisado: "Avisado",
  agendado: "Reservado",
  hecho: "Hecho",
  no_interesado: "No le interesa",
};

/** Cada cuántos meses, de 1 a 24 (en el catálogo y en cada plan; la base lo exige igual). */
export const MESES_MANTENIMIENTO = { minimo: 1, maximo: 24 } as const;

/** "cada 3 meses" o "cada mes". */
export const textoCadaMeses = (meses: number) => (meses === 1 ? "cada mes" : `cada ${meses} meses`);

/** Un servicio de la orden que se entrega, con el mantenimiento que dice el catálogo (o ninguno). */
export type ServicioEntregado = { servicioId: number; mantenimiento: { servicioId: number; meses: number } | null };

/** Un plan abierto del vehículo (pendiente, avisado o agendado). */
export type PlanAbierto = { id: number; servicioId: number; servicioMantenimientoId: number; intervaloMeses: number; trabajoAgendadoId: number | null };

/** El siguiente de un plan, o uno nuevo. */
export type PlanNuevo = { servicioId: number; servicioMantenimientoId: number; intervaloMeses: number; fechaProgramada: string };

/**
 * Qué pasa con los planes de un vehículo al entregar una orden (pedido 21, P21 §6):
 * 1. Cada plan abierto cuyo servicio de mantenimiento está en la orden, o que se agendó con esta orden (aunque en la
 *    reserva se haya cambiado el servicio), queda hecho y nace el siguiente, igual y con su frecuencia. Así se repite
 *    aunque el cliente haya venido por su cuenta, sin agendar desde Mantenimientos.
 * 2. Cada servicio de la orden con mantenimiento en el catálogo, si su plan no se resolvió en el paso 1 y no se entregó
 *    como el mantenimiento de otro plan: el abierto (si hay) queda hecho y nace uno nuevo, con la frecuencia del que
 *    había o, si no había, la del catálogo.
 * Un plan agendado con otra reserva no se toca (ya tiene su fecha), y nunca hay dos nuevos del mismo servicio base.
 */
export function planesAlEntregar({
  servicios,
  abiertos,
  trabajoId,
  hoy,
}: {
  servicios: ServicioEntregado[];
  abiertos: PlanAbierto[];
  trabajoId: number;
  hoy: string;
}): { hechos: number[]; nuevos: PlanNuevo[] } {
  const tocable = (p: PlanAbierto) => p.trabajoAgendadoId === null || p.trabajoAgendadoId === trabajoId;
  const entregados = new Set(servicios.map((s) => s.servicioId));
  const hechos: number[] = [];
  const nuevos = new Map<number, PlanNuevo>();
  const siguiente = (servicioId: number, servicioMantenimientoId: number, intervaloMeses: number): PlanNuevo => ({
    servicioId,
    servicioMantenimientoId,
    intervaloMeses,
    fechaProgramada: sumarMeses(hoy, intervaloMeses),
  });

  // Los servicios que se entregaron como el mantenimiento de un plan: no abren un plan propio (sería el mismo aviso dos veces)
  const comoMantenimiento = new Set<number>();
  for (const p of abiertos) {
    const conEstaOrden = p.trabajoAgendadoId === trabajoId;
    if (!tocable(p) || !(conEstaOrden || entregados.has(p.servicioMantenimientoId))) continue;
    hechos.push(p.id);
    if (entregados.has(p.servicioMantenimientoId)) comoMantenimiento.add(p.servicioMantenimientoId);
    nuevos.set(p.servicioId, siguiente(p.servicioId, p.servicioMantenimientoId, p.intervaloMeses));
  }
  for (const s of servicios) {
    if (!s.mantenimiento || nuevos.has(s.servicioId) || comoMantenimiento.has(s.servicioId)) continue;
    const abierto = abiertos.find((p) => p.servicioId === s.servicioId);
    if (abierto && !tocable(abierto)) continue;
    if (abierto) hechos.push(abierto.id);
    nuevos.set(s.servicioId, siguiente(s.servicioId, s.mantenimiento.servicioId, abierto?.intervaloMeses ?? s.mantenimiento.meses));
  }
  return { hechos, nuevos: [...nuevos.values()] };
}

/** Las pestañas de Mantenimientos (pedido 20): lo de hoy, lo que viene después y lo cerrado. */
export const VISTAS_MANTENIMIENTOS = ["por-avisar", "mas-adelante", "cerrados"] as const;
export type VistaMantenimientos = (typeof VISTAS_MANTENIMIENTOS)[number];

/**
 * Cuántos cerrados muestra "Cerrados", los más recientes: la lista crece con cada mantenimiento que se agenda o se
 * cierra. Los demás siguen en la ficha de cada cliente. Es cuánto entra en la pantalla, no un valor del negocio.
 */
export const MAXIMO_CERRADOS = 50;

/** Agrupa por el mes de la fecha, en el orden en que llegan (ya vienen por fecha): "Más adelante". */
export function agruparPorMes<T>(elementos: T[], fecha: (e: T) => string): { mes: string; titulo: string; elementos: T[] }[] {
  const grupos: { mes: string; titulo: string; elementos: T[] }[] = [];
  for (const e of elementos) {
    const mes = fecha(e).slice(0, 7);
    const ultimo = grupos.at(-1);
    if (ultimo?.mes === mes) ultimo.elementos.push(e);
    else grupos.push({ mes, titulo: mesYAnio(fecha(e)), elementos: [e] });
  }
  return grupos;
}

/** La última fecha que entra en la lista de hoy. */
export const hastaProximos = (hoy: string) => sumarDias(hoy, DIAS_PROXIMOS);

/** Vencido si su fecha ya pasó; próximo si es hoy o dentro de los próximos 15 días; si no, todavía no se muestra. */
export function seccionMantenimiento(fecha: string, hoy: string): "vencido" | "proximo" | null {
  if (fecha < hoy) return "vencido";
  return fecha <= hastaProximos(hoy) ? "proximo" : null;
}

/** "venció hace 5 días", "vence hoy", "vence mañana" o "vence en 3 días". */
export function textoVencimiento(fecha: string, hoy: string): string {
  const dias = diasEntre(hoy, fecha);
  if (dias < 0) return dias === -1 ? "venció ayer" : `venció hace ${-dias} días`;
  return dias === 0 ? "vence hoy" : dias === 1 ? "vence mañana" : `vence en ${dias} días`;
}

/**
 * La línea con que llega la reserva de un mantenimiento (pedido 21): su servicio de mantenimiento y, si tiene una sola
 * opción para ese vehículo, también la opción y su precio sugerido. Null si ese servicio ya no se ofrece (inactivo).
 */
export function lineaDelMantenimiento(
  opciones: { servicioId: number; varianteId: number; sugerencia: Sugerencia }[],
  servicioId: number,
): { servicioId: number; varianteId: number; precio: string } | null {
  const suyas = opciones.filter((o) => o.servicioId === servicioId);
  if (suyas.length === 0) return null;
  if (suyas.length > 1) return { servicioId, varianteId: 0, precio: "" };
  const [unica] = suyas;
  return { servicioId, varianteId: unica.varianteId, precio: unica.sugerencia.tipo === "monto" ? mostrarMonto(unica.sugerencia.monto) : "" };
}
