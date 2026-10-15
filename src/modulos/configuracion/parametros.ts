import { z } from "zod";

// Registro de parámetros del negocio (HU-05, RF-18, D-8). Cada parámetro tiene su regla aquí;
// el valor vive en la tabla `parametro` y su valor inicial entra por migración (0005_datos_parametros).
// Se usa en el formulario y en el servidor. Cambiar un parámetro no toca lo ya guardado:
// cotizaciones y reservas copian el valor al crearse.

/** Número entero escrito en un campo de texto. Vacío, negativo o con decimales da error. */
function entero(min: number, max: number, mensaje: string) {
  return z
    .string()
    .trim()
    .min(1, mensaje)
    .regex(/^-?\d+$/, "Escribe un número entero, sin decimales.")
    .transform(Number)
    .pipe(z.number().min(min, mensaje).max(max, mensaje));
}

function texto(nombre: string) {
  return z
    .string()
    .trim()
    .min(1, `Escribe ${nombre}: sale en el PDF de la cotización.`)
    .max(2000, "Hasta 2000 caracteres.");
}

export const PARAMETROS = {
  adelanto_sugerido: {
    etiqueta: "Adelanto sugerido",
    ayuda: "Monto sugerido al agendar; se puede cambiar en cada reserva.",
    unidad: "Bs",
    esquema: entero(1, 100_000, "Escribe un monto mayor a cero, hasta Bs 100 000."),
  },
  validez_cotizacion_dias: {
    etiqueta: "Validez de la cotización",
    ayuda: "Días que vale una cotización si no se indica otra cosa.",
    unidad: "días",
    esquema: entero(1, 365, "Entre 1 y 365 días."),
  },
  intervalo_mantenimiento_meses: {
    etiqueta: "Aviso de mantenimiento",
    ayuda: "Meses después de la entrega para avisar el mantenimiento.",
    unidad: "meses",
    esquema: entero(1, 24, "Entre 1 y 24 meses."),
  },
  condiciones_cotizacion: {
    etiqueta: "Condiciones",
    ayuda: "Lo que el cliente acepta al confirmar la cotización.",
    unidad: null,
    esquema: texto("las condiciones"),
  },
  garantia_cotizacion: {
    etiqueta: "Garantía",
    ayuda: "Qué cubre la garantía y qué tiene que cuidar el cliente.",
    unidad: null,
    esquema: texto("la garantía"),
  },
} as const;

export type ClaveParametro = keyof typeof PARAMETROS;
export const CLAVES_PARAMETRO = Object.keys(PARAMETROS) as ClaveParametro[];

export type Parametros = { [K in ClaveParametro]: z.output<(typeof PARAMETROS)[K]["esquema"]> };

export const esquemaParametros = z.object(
  Object.fromEntries(CLAVES_PARAMETRO.map((c) => [c, PARAMETROS[c].esquema])) as {
    [K in ClaveParametro]: (typeof PARAMETROS)[K]["esquema"];
  },
);

/** Lee lo guardado en la base. Si falta o es inválido, es un error de datos: falta la migración. */
export function leerParametros(filas: { clave: string; valor: unknown }[]): Parametros {
  const guardados = new Map(filas.map((f) => [f.clave, f.valor]));
  const resultado: Record<string, unknown> = {};
  for (const clave of CLAVES_PARAMETRO) {
    if (!guardados.has(clave)) throw new Error(`Falta el parámetro "${clave}": aplica las migraciones.`);
    const r = PARAMETROS[clave].esquema.safeParse(String(guardados.get(clave)));
    if (!r.success) throw new Error(`El parámetro "${clave}" tiene un valor inválido en la base.`);
    resultado[clave] = r.data;
  }
  return resultado as Parametros;
}
