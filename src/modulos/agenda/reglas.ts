import type { EstadoTrabajo } from "@/db/esquema/trabajos";
import { sumarDias } from "@/lib/fechas";
import { NOMBRE_DIA } from "@/lib/horarios";

// Reglas puras de la agenda (C3). Fechas de calendario AAAA-MM-DD, sin hora (S-3, D-9): la de "hoy" la pone quien
// llama, en hora de Bolivia. Especificación: docs/08-desarrollo/etapas/C3-agenda-pagos.md.

export const NOMBRE_ESTADO_TRABAJO: Record<EstadoTrabajo, string> = {
  agendado: "Agendada",
  recibido: "Recibida",
  en_proceso: "En proceso",
  listo: "Lista",
  entregado: "Entregada",
  cancelado: "Cancelada",
};

/** Día de la semana de una fecha: 1 = lunes … 7 = domingo (ISO 8601, como los horarios de Configuración). */
export function diaDeLaSemana(fecha: string): number {
  const d = new Date(`${fecha}T00:00:00Z`).getUTCDay();
  return d === 0 ? 7 : d;
}

/** El lunes de la semana de una fecha. */
export const lunesDeLaSemana = (fecha: string) => sumarDias(fecha, 1 - diaDeLaSemana(fecha));

/** Las siete fechas de una semana, desde su lunes. */
export const diasDeLaSemana = (lunes: string) => Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i));

/**
 * Entrega aproximada: el ingreso más la mayor duración de los servicios, contando el día de ingreso (uno de 1 día sale
 * el mismo día). Es una estimación (decisión del 20/10): se edita en cada reserva.
 */
export function fechaEntregaSugerida(ingreso: string, duraciones: readonly number[]): string {
  return sumarDias(ingreso, Math.max(1, ...duraciones) - 1);
}

type Rango = { inicio: string; fin: string };

/** Dos rangos de días se cruzan si comparten algún día (bordes incluidos), como la restricción de la base. */
export const seCruzan = (a: Rango, b: Rango) => a.inicio <= b.fin && b.inicio <= a.fin;

export type Bloque<T> = T & { columna: number; dias: number; empiezaAntes: boolean; terminaDespues: boolean };

/**
 * Los trabajos que caen en la semana, como bloques del tablero: en qué columna empiezan (0 = lunes), cuántos días
 * ocupan dentro de la semana y si siguen antes o después de ella.
 */
export function bloquesDeLaSemana<T extends Rango>(trabajos: readonly T[], lunes: string): Bloque<T>[] {
  const domingo = sumarDias(lunes, 6);
  return trabajos
    .filter((t) => seCruzan(t, { inicio: lunes, fin: domingo }))
    .map((t) => {
      const desde = t.inicio < lunes ? lunes : t.inicio;
      const hasta = t.fin > domingo ? domingo : t.fin;
      const columna = diaDeLaSemana(desde) - 1;
      return { ...t, columna, dias: diaDeLaSemana(hasta) - columna, empiezaAntes: t.inicio < lunes, terminaDespues: t.fin > domingo };
    });
}

/** Una reserva ocupa espacio en la agenda mientras no se cancela ni se entrega (como la restricción de la base). */
export const ocupaEspacio = (estado: EstadoTrabajo) => estado !== "cancelado" && estado !== "entregado";

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
export const DIA_CORTO = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"] as const;

const partes = (fecha: string) => {
  const [anio, mes, dia] = fecha.split("-").map(Number);
  return { anio, mes, dia };
};

/** "20 al 26 de octubre", "27 de octubre al 2 de noviembre", "29 de diciembre de 2025 al 4 de enero de 2026". */
export function textoSemana(lunes: string): string {
  const a = partes(lunes);
  const b = partes(sumarDias(lunes, 6));
  if (a.anio !== b.anio) return `${a.dia} de ${MESES[a.mes - 1]} de ${a.anio} al ${b.dia} de ${MESES[b.mes - 1]} de ${b.anio}`;
  if (a.mes !== b.mes) return `${a.dia} de ${MESES[a.mes - 1]} al ${b.dia} de ${MESES[b.mes - 1]}`;
  return `${a.dia} al ${b.dia} de ${MESES[b.mes - 1]}`;
}

/** "Jueves 24 de octubre": el día completo, para lectores de pantalla y el celular. */
export function textoDia(fecha: string): string {
  const { dia, mes } = partes(fecha);
  return `${NOMBRE_DIA[diaDeLaSemana(fecha) - 1]} ${dia} de ${MESES[mes - 1]}`;
}

/** El número del día ("24") para la cabecera del tablero. */
export const numeroDia = (fecha: string) => String(partes(fecha).dia);
