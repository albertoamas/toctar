import { z } from "zod";

// Horarios de atención de una sucursal: siete días (1 = lunes … 7 = domingo, como ISO 8601),
// cada uno con hasta dos turnos. Un día sin turnos está cerrado.

export const NOMBRE_DIA = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"] as const;

const esquemaHora = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Escribe la hora como 08:00.");

const esquemaTurno = z
  .object({ desde: esquemaHora, hasta: esquemaHora })
  .refine((t) => t.desde < t.hasta, "El turno debe terminar después de empezar.");

export const esquemaDiaHorario = z
  .object({
    dia: z.number().int().min(1).max(7),
    turnos: z.array(esquemaTurno).max(2, "Hasta dos turnos por día."),
  })
  .refine((d) => d.turnos.length < 2 || d.turnos[0].hasta < d.turnos[1].desde, {
    message: "El segundo turno debe empezar después de que termine el primero.",
  });

export const esquemaHorarios = z
  .array(esquemaDiaHorario)
  .length(7)
  .refine((dias) => dias.every((d, i) => d.dia === i + 1), "Faltan días en el horario.");

export type Turno = z.infer<typeof esquemaTurno>;
export type DiaHorario = z.infer<typeof esquemaDiaHorario>;

/** Una semana entera cerrada: punto de partida si no hay horario guardado. */
export function semanaCerrada(): DiaHorario[] {
  return NOMBRE_DIA.map((_, i) => ({ dia: i + 1, turnos: [] }));
}

/** "08:00" → "8:00". */
function hora(h: string): string {
  return h.replace(/^0(\d)/, "$1");
}

function turnosATexto(turnos: Turno[]): string {
  if (turnos.length === 0) return "cerrado";
  return turnos.map((t) => `${hora(t.desde)}–${hora(t.hasta)}`).join(" y ");
}

/**
 * Agrupa los días seguidos con el mismo horario:
 * [{ dias: "Lunes a sábado", horario: "8:00–12:00 y 14:00–18:00" }, { dias: "Domingo", horario: "cerrado" }].
 */
export function resumirHorarios(dias: DiaHorario[]): { dias: string; horario: string }[] {
  const grupos: { desde: number; hasta: number; horario: string }[] = [];
  for (const d of [...dias].sort((a, b) => a.dia - b.dia)) {
    const horario = turnosATexto(d.turnos);
    const ultimo = grupos.at(-1);
    if (ultimo && ultimo.horario === horario && ultimo.hasta === d.dia - 1) ultimo.hasta = d.dia;
    else grupos.push({ desde: d.dia, hasta: d.dia, horario });
  }
  return grupos.map((g) => {
    const desde = NOMBRE_DIA[g.desde - 1];
    const hasta = NOMBRE_DIA[g.hasta - 1].toLowerCase();
    const dias = g.desde === g.hasta ? desde : g.hasta === g.desde + 1 ? `${desde} y ${hasta}` : `${desde} a ${hasta}`;
    return { dias, horario: g.horario };
  });
}
