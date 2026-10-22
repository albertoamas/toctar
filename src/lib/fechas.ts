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

/** Fecha calendario para mostrar: "2026-10-15" → "15/10/2026". */
export function formatearFecha(fecha: string): string {
  const [anio, mes, dia] = fecha.split("-");
  return `${dia}/${mes}/${anio}`;
}
