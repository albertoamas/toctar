import type { EstadoRecordatorio } from "@/db/esquema/mantenimientos";
import { diasEntre, sumarDias } from "@/lib/fechas";

// Reglas de los recordatorios de mantenimiento (HU-38, RF-50). Especificación: C4-taller-entrega.md §5 y §6.

/**
 * Cuántos días hacia adelante muestra "Próximos": los que vencen pronto, para avisar con tiempo. Es cómo se arma la
 * pantalla (C4-taller-entrega.md §5, "Próximos 15 días"), no un valor del negocio: el plazo del mantenimiento sí es
 * configurable (`intervalo_mantenimiento_meses`).
 */
export const DIAS_PROXIMOS = 15;

/** Los que todavía se avisan: ni agendados ni cerrados. */
export const ESTADOS_RECORDATORIO_ABIERTO = ["pendiente", "avisado"] as const satisfies readonly EstadoRecordatorio[];

/** Los que ya no se avisan: agendados (con su reserva) o "No le interesa". */
export const ESTADOS_RECORDATORIO_CERRADO = ["agendado", "no_interesado"] as const satisfies readonly EstadoRecordatorio[];

/** Las pestañas de Mantenimientos (pedido 20): lo de hoy, lo que viene después y lo cerrado. */
export const VISTAS_MANTENIMIENTOS = ["por-avisar", "mas-adelante", "cerrados"] as const;
export type VistaMantenimientos = (typeof VISTAS_MANTENIMIENTOS)[number];

const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

/** "2026-12-05" → "Diciembre 2026". */
export function tituloMes(fecha: string): string {
  const [anio, mes] = fecha.split("-");
  return `${MESES[Number(mes) - 1]} ${anio}`;
}

/** Agrupa por el mes de la fecha, en el orden en que llegan (ya vienen por fecha): "Más adelante". */
export function agruparPorMes<T>(elementos: T[], fecha: (e: T) => string): { mes: string; titulo: string; elementos: T[] }[] {
  const grupos: { mes: string; titulo: string; elementos: T[] }[] = [];
  for (const e of elementos) {
    const mes = fecha(e).slice(0, 7);
    const ultimo = grupos.at(-1);
    if (ultimo?.mes === mes) ultimo.elementos.push(e);
    else grupos.push({ mes, titulo: tituloMes(fecha(e)), elementos: [e] });
  }
  return grupos;
}

export const NOMBRE_ESTADO_RECORDATORIO: Record<EstadoRecordatorio, string> = {
  pendiente: "Por avisar",
  avisado: "Avisado",
  agendado: "Agendado",
  no_interesado: "No le interesa",
};

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
