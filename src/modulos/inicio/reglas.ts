import type { EstadoTrabajo } from "@/db/esquema/trabajos";
import { cantidad } from "@/lib/cantidad";
import { diasEntre, fechaConMes } from "@/lib/fechas";
import { NOMBRE_ESTADO_TRABAJO } from "@/modulos/agenda/reglas";
import { estaAtrasada } from "@/modulos/ordenes/reglas";

// Reglas de la pantalla del día (HU-39). Puras: las prueba tests/unit/inicio.test.ts.
// Recorrido visual del 19/11 (a pedido del dueño): una sola lista por urgencia, sin repetir. "Urgente" es lo que se
// atrasó (una reserva que no llegó, una orden que no se entregó); "Hoy", solo lo de hoy (lo que llega, lo que se entrega
// y las listas por avisar). Especificación: docs/08-desarrollo/etapas/C5-cierre-entrega-2.md §5 y §8.

/** "Atrasada 2 días": cuánto pasó desde la fecha. */
const atrasada = (fecha: string, hoy: string) => `Atrasada ${cantidad(diasEntre(fecha, hoy), "día", "días")}`;

/** Una reserva de un día pasado que todavía no llegó: "Atrasada 2 días: debía ingresar el 21 oct.". Si es de hoy, nada. */
export const textoIngresoAtrasado = (fechaInicio: string, hoy: string) =>
  fechaInicio < hoy ? `${atrasada(fechaInicio, hoy)}: debía ingresar el ${fechaConMes(fechaInicio, hoy)}` : null;

/**
 * Una orden que se debía entregar antes de hoy y sigue en el taller: "Atrasada 1 día: debía entregarse el 22 oct.".
 * Una lista que espera al cliente no está atrasada: el trabajo ya se hizo.
 */
export const textoEntregaAtrasada = (o: { estado: EstadoTrabajo; fechaFin: string }, hoy: string) =>
  estaAtrasada(o, hoy) ? `${atrasada(o.fechaFin, hoy)}: debía entregarse el ${fechaConMes(o.fechaFin, hoy)}` : null;

/** Lo que se hace con un vehículo desde el inicio, con un toque: recibirlo, avisar que está listo o entregarlo. */
type PasoDelDia = "recibir" | "avisar" | "entregar" | "ver";

/** Una fila de "Urgente" o de "Hoy": un vehículo con lo que le pasa y lo que se hace con él. */
export type FilaDelDia = {
  id: number;
  placa: string;
  cliente: string;
  estado: EstadoTrabajo;
  /** Lo que pide atención, en una insignia: el atraso (en "Urgente") o "Sin avisar". */
  aviso: string | null;
  /** El estado y cuándo, en una línea: "Reservada, llega a las 8:30, Espacio 2", "En proceso, se entrega hoy". */
  detalle: string;
  paso: PasoDelDia | null;
};

type Ingreso = { id: number; placa: string; cliente: string; espacio: string; fechaInicio: string; horaIngreso: string | null };
type Orden = { id: number; placa: string; cliente: string; estado: EstadoTrabajo; fechaFin: string; sinAvisar: boolean };

/**
 * Reparte el día (pedido 26; 19/11):
 * - urgentes: las reservas que debían ingresar antes y no llegaron, y las órdenes atrasadas (la más vieja primero);
 * - hoy: lo que llega hoy, lo que se entrega hoy y las listas sin avisar (avisar es de hoy, aunque estén listas de
 *   antes). Una orden va una sola vez.
 */
export function repartirDia(ingresos: Ingreso[], abiertas: Orden[], hoy: string): { urgentes: FilaDelDia[]; hoy: FilaDelDia[] } {
  const reserva = (i: Ingreso, aviso: string | null, cuando: string): FilaDelDia => ({
    id: i.id,
    placa: i.placa,
    cliente: i.cliente,
    estado: "agendado",
    aviso,
    detalle: [NOMBRE_ESTADO_TRABAJO.agendado, cuando, i.espacio].join(", "),
    paso: "recibir",
  });
  const orden = (o: Orden, aviso: string | null, cuando: string | null, paso: PasoDelDia | null): FilaDelDia => ({
    id: o.id,
    placa: o.placa,
    cliente: o.cliente,
    estado: o.estado,
    aviso,
    detalle: [NOMBRE_ESTADO_TRABAJO[o.estado], cuando].filter(Boolean).join(", "),
    paso,
  });
  const urgentes = [
    ...ingresos.filter((i) => i.fechaInicio < hoy).map((i) => reserva(i, textoIngresoAtrasado(i.fechaInicio, hoy), "por recibir")),
    ...abiertas.filter((o) => estaAtrasada(o, hoy)).map((o) => orden(o, textoEntregaAtrasada(o, hoy), null, "ver")),
  ];
  const deHoy = [
    ...ingresos.filter((i) => i.fechaInicio === hoy).map((i) => reserva(i, null, i.horaIngreso ? `llega ${i.horaIngreso}` : "llega hoy")),
    ...abiertas
      .filter((o) => o.sinAvisar || (o.fechaFin === hoy && !estaAtrasada(o, hoy)))
      .map((o) =>
        o.estado === "listo"
          ? // Por qué está en Hoy: se entrega hoy, o espera que se le avise al cliente para que la retire
            orden(o, o.sinAvisar ? "Sin avisar" : null, o.fechaFin === hoy ? "se entrega hoy" : "falta avisar al cliente para que la retire", o.sinAvisar ? "avisar" : "entregar")
          : orden(o, null, "se entrega hoy", "ver"),
      ),
  ];
  return { urgentes, hoy: deHoy };
}

/** Los números de la línea de arriba: cuántos hay en el taller, cuántos llegan y cuántos se entregan hoy. */
export function numerosDelDia(ingresos: { fechaInicio: string }[] | null, abiertas: { fechaFin: string }[] | null, hoy: string) {
  return {
    enTaller: abiertas?.length ?? null,
    lleganHoy: ingresos ? ingresos.filter((i) => i.fechaInicio === hoy).length : null,
    seEntreganHoy: abiertas ? abiertas.filter((o) => o.fechaFin === hoy).length : null,
  };
}

/** "Buenos días" hasta el mediodía, "Buenas tardes" hasta las 19 y "Buenas noches" después (la hora, de Bolivia). */
export function saludoDeLaHora(hora: number): string {
  return hora < 12 ? "Buenos días" : hora < 19 ? "Buenas tardes" : "Buenas noches";
}

/**
 * El día en una frase, bajo el saludo (19/11): "Hoy llega 1 vehículo y se entrega 1." y, aparte (en rojo), "Hay 2
 * atrasados que conviene mirar primero." o "Todo al día.". Sin la Agenda ni Órdenes, lo que no ve no se dice (null).
 */
export function fraseDelDia(n: { lleganHoy: number | null; seEntreganHoy: number | null; atrasados: number }): { dia: string | null; atrasos: string } {
  const llegan = n.lleganHoy ? (n.lleganHoy === 1 ? "llega 1 vehículo" : `llegan ${n.lleganHoy} vehículos`) : null;
  const entregan = n.seEntreganHoy ? (n.seEntreganHoy === 1 ? "se entrega 1" : `se entregan ${n.seEntreganHoy}`) : null;
  const partes = [llegan, entregan].filter(Boolean);
  const nadie = n.lleganHoy === null && n.seEntreganHoy === null;
  const dia = nadie
    ? null
    : partes.length > 0
      ? `Hoy ${partes.join(" y ")}${!llegan && n.lleganHoy !== null ? "; no llega ninguno" : ""}.`
      : n.lleganHoy !== null && n.seEntreganHoy !== null
        ? "Hoy no llega ni se entrega ningún vehículo."
        : n.lleganHoy !== null
          ? "Hoy no llega ningún vehículo."
          : "Hoy no se entrega ningún vehículo.";
  const atrasos = n.atrasados > 0 ? `${n.atrasados === 1 ? "Hay 1 atrasado" : `Hay ${n.atrasados} atrasados`} que conviene mirar primero.` : "Todo al día.";
  return { dia, atrasos };
}
