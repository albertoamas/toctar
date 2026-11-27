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

/**
 * Secciones de la pestaña Parámetros (C5 §0), en el orden del trabajo: la cotización y la agenda. La consulta ya no
 * existe (pedido 23) y el mantenimiento no tiene sección: cada servicio dice cada cuánto, en el catálogo (pedido 21).
 * Pulido 13.29: cada sección se edita y se guarda en su modal; los plazos de la cotización van aparte de los textos del
 * PDF (eran una sola sección con dos números y tres textos largos). `ancha`: textos largos, a todo el ancho y al final (C6).
 */
export const SECCIONES_PARAMETROS = {
  plazos: { titulo: "Plazos de las cotizaciones", descripcion: null, boton: "Guardar plazos", guardado: "Plazos guardados.", ancha: false },
  agenda: { titulo: "Agenda", descripcion: null, boton: "Guardar agenda", guardado: "Agenda guardada.", ancha: false },
  pdf: { titulo: "Textos del PDF", descripcion: "Salen al pie de cada cotización en PDF.", boton: "Guardar textos del PDF", guardado: "Textos del PDF guardados.", ancha: true },
} as const;
export type SeccionParametros = keyof typeof SECCIONES_PARAMETROS;

/** Cada parámetro con su sección; los que tienen unidad son números, los demás, textos largos. */
export const PARAMETROS = {
  adelanto_sugerido: {
    seccion: "agenda",
    etiqueta: "Adelanto sugerido",
    ayuda: "Monto sugerido al reservar; se puede cambiar en cada reserva.",
    unidad: "Bs",
    esquema: entero(1, 100_000, "Escribe un monto mayor a cero, hasta Bs 100 000."),
  },
  validez_cotizacion_dias: {
    seccion: "plazos",
    etiqueta: "Validez de la cotización",
    ayuda: "Días que vale una cotización si no se indica otra cosa.",
    unidad: "días",
    esquema: entero(1, 365, "Entre 1 y 365 días."),
  },
  dias_cotizacion_sin_respuesta: {
    seccion: "plazos",
    etiqueta: "Cotización sin respuesta",
    ayuda: "Días sin respuesta del cliente para resaltarla en Cotizaciones.",
    unidad: "días",
    esquema: entero(1, 90, "Entre 1 y 90 días."),
  },
  condiciones_cotizacion: {
    seccion: "pdf",
    etiqueta: "Condiciones",
    ayuda: "Lo que el cliente acepta al confirmar la cotización.",
    unidad: null,
    esquema: texto("las condiciones"),
  },
  garantia_cotizacion: {
    seccion: "pdf",
    etiqueta: "Garantía",
    ayuda: "Qué cubre la garantía y qué tiene que cuidar el cliente.",
    unidad: null,
    esquema: texto("la garantía"),
  },
  formas_pago_cotizacion: {
    seccion: "pdf",
    etiqueta: "Formas de pago",
    ayuda: "Cómo se puede pagar el adelanto y el saldo.",
    unidad: null,
    esquema: texto("las formas de pago"),
  },
} as const satisfies Record<string, { seccion: SeccionParametros; etiqueta: string; ayuda: string; unidad: string | null; esquema: z.ZodType }>;

export type ClaveParametro = keyof typeof PARAMETROS;
export const CLAVES_PARAMETRO = Object.keys(PARAMETROS) as ClaveParametro[];

export type Parametros = { [K in ClaveParametro]: z.output<(typeof PARAMETROS)[K]["esquema"]> };

export const esquemaParametros = z.object(
  Object.fromEntries(CLAVES_PARAMETRO.map((c) => [c, PARAMETROS[c].esquema])) as {
    [K in ClaveParametro]: (typeof PARAMETROS)[K]["esquema"];
  },
);

export const CLAVES_SECCION_PARAMETROS = Object.keys(SECCIONES_PARAMETROS) as [SeccionParametros, ...SeccionParametros[]];

/** Los parámetros de una sección, en su orden: lo que guarda su modal (pulido 13.29). */
export function clavesDeSeccion(seccion: SeccionParametros): ClaveParametro[] {
  return CLAVES_PARAMETRO.filter((c) => PARAMETROS[c].seccion === seccion);
}

/** El esquema de una sección: solo sus parámetros, así guardar los plazos no pide los textos del PDF. */
export function esquemaSeccionParametros(seccion: SeccionParametros) {
  return esquemaParametros.pick(Object.fromEntries(clavesDeSeccion(seccion).map((c) => [c, true])) as { [K in ClaveParametro]?: true });
}

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
