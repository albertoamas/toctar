// Todo se guarda en UTC y se muestra en hora de Bolivia (arquitectura, "Fechas y zona horaria").
// Las fechas de agenda son fechas sin hora, en formato AAAA-MM-DD (modelo de datos, D-9).

const ZONA_HORARIA = "America/La_Paz";

/** Fecha calendario (AAAA-MM-DD) que corresponde a un instante, en hora de Bolivia. */
export function fechaEnBolivia(instante: Date = new Date()): string {
  // en-CA da el formato AAAA-MM-DD
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA_HORARIA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instante);
}

/** El día de la semana (1 = lunes … 7 = domingo) y los minutos desde la medianoche de un instante, en hora de Bolivia. */
const FORMATO_MOMENTO = new Intl.DateTimeFormat("en-US", { timeZone: ZONA_HORARIA, weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

export function momentoEnBolivia(instante: Date = new Date()): { dia: number; minutos: number } {
  const partes = FORMATO_MOMENTO.formatToParts(instante);
  const valor = (tipo: string) => partes.find((p) => p.type === tipo)?.value ?? "";
  const dia = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(valor("weekday")) + 1;
  return { dia, minutos: Number(valor("hour")) * 60 + Number(valor("minute")) };
}

/** Si es una fecha AAAA-MM-DD que existe ("2026-02-31" no). */
export function fechaExiste(fecha: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(fecha) && !Number.isNaN(Date.parse(fecha)) && new Date(`${fecha}T00:00:00Z`).toISOString().slice(0, 10) === fecha;
}

/** Suma días a una fecha calendario AAAA-MM-DD (puede ser negativo). */
export function sumarDias(fecha: string, dias: number): string {
  const d = new Date(`${fecha}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/**
 * Suma meses a una fecha calendario; si el día no existe en el mes de destino, el último del mes ("2027-01-31" + 1 →
 * "2027-02-28"). Para el próximo mantenimiento (RN-08).
 */
export function sumarMeses(fecha: string, meses: number): string {
  const [anio, mes, dia] = fecha.split("-").map(Number);
  const total = anio * 12 + (mes - 1) + meses;
  const [nuevoAnio, nuevoMes] = [Math.floor(total / 12), (total % 12) + 1];
  const ultimo = new Date(Date.UTC(nuevoAnio, nuevoMes, 0)).getUTCDate();
  return `${nuevoAnio}-${String(nuevoMes).padStart(2, "0")}-${String(Math.min(dia, ultimo)).padStart(2, "0")}`;
}

/** "15/10" si es de este año (el de `hoy`); "15/10/2025" si es de otro. */
export function fechaCorta(fecha: string, hoy: string): string {
  const completa = formatearFecha(fecha);
  return fecha.slice(0, 4) === hoy.slice(0, 4) ? completa.slice(0, completa.lastIndexOf("/")) : completa;
}

/** "hoy", "ayer" o "hace 5 días": cuánto pasó desde una fecha calendario hasta hoy. */
export function textoHace(fecha: string, hoy: string): string {
  const dias = diasEntre(fecha, hoy);
  return dias <= 0 ? "hoy" : dias === 1 ? "ayer" : `hace ${dias} días`;
}

/** Días entre dos fechas calendario (hasta - desde). */
export function diasEntre(desde: string, hasta: string): number {
  const ms = Date.parse(`${hasta}T00:00:00Z`) - Date.parse(`${desde}T00:00:00Z`);
  return Math.round(ms / 86_400_000);
}

/** Fecha y hora legibles para mostrar en pantalla, en hora de Bolivia. */
export function formatearFechaHora(instante: Date): string {
  return new Intl.DateTimeFormat("es-BO", {
    timeZone: ZONA_HORARIA,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(instante);
}

/** Día y hora cortos, en hora de Bolivia: "30/10 a las 15:40" (por ejemplo, "Avisado el 30/10 a las 15:40"). */
export function diaYHora(instante: Date): string {
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat("es-BO", { timeZone: ZONA_HORARIA, day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(instante)
      // "2-digit" no alcanza: con es-BO, ICU escribe el día 1 como "1". Se completa a mano
      .map((p) => [p.type, p.value.padStart(2, "0")]),
  );
  return `${partes.day}/${partes.month} a las ${partes.hour}:${partes.minute}`;
}

/** Fecha calendario para mostrar: "2026-10-15" → "15/10/2026". */
export function formatearFecha(fecha: string): string {
  const [anio, mes, dia] = fecha.split("-");
  return `${dia}/${mes}/${anio}`;
}

/** Fecha calendario con el día de la semana, para un título: "2026-10-23" → "Viernes 23 de octubre". */
export function fechaConDia(fecha: string): string {
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat("es-BO", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" })
      .formatToParts(new Date(`${fecha}T12:00:00Z`))
      .map((p) => [p.type, p.value]),
  );
  return `${partes.weekday.charAt(0).toUpperCase()}${partes.weekday.slice(1)} ${partes.day} de ${partes.month}`;
}

/** El mes y el año de una fecha calendario, para un título: "2026-12-05" → "Diciembre 2026". */
export function mesYAnio(fecha: string): string {
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat("es-BO", { timeZone: "UTC", month: "long", year: "numeric" })
      .formatToParts(new Date(`${fecha}T12:00:00Z`))
      .map((p) => [p.type, p.value]),
  );
  return `${partes.month.charAt(0).toUpperCase()}${partes.month.slice(1)} ${partes.year}`;
}
