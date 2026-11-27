// Los datos cortos tienen el ancho de lo que llevan (regla de anchos, etapas/C7-rediseno-del-panel.md §4.3, 18/11): un
// monto, una fecha o una placa no se leen mejor en un campo de 900 px. No es un tope general: los demás campos siguen a
// todo el ancho de su columna. Un solo lugar, así dos fechas del panel no quedan de distinto ancho (hasta el 18/11 había
// fechas a todo el ancho, de 12 rem y de 20 rem).
export const ANCHO_DATO = {
  /** Un monto en Bs, con su unidad al lado. */
  monto: "max-w-40",
  /** Un selector de fecha del navegador. */
  fecha: "max-w-48",
  /** Un año de cuatro cifras. */
  anio: "max-w-28",
  /** Una placa o un NIT. */
  placa: "max-w-48",
  /** Un celular de Bolivia, con o sin el +591. */
  telefono: "max-w-56",
  /** Una cantidad corta: días, meses, un porcentaje. */
  cantidad: "max-w-28",
} as const;

/** El texto de corrido (notas, descripciones) se corta en unos 70 caracteres por línea: más largo se lee mal. Solo el párrafo. */
export const MEDIDA_TEXTO = "max-w-[70ch]";
