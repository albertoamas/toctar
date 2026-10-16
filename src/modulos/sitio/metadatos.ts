// Descripciones para Google (HU-18) armadas con lo que carga el dueño, no escritas a mano en el código:
// si agrega o quita un servicio, la descripción cambia sola. Puro: se prueba en tests/unit/metadatos.test.ts.

/** Largo que Google suele mostrar completo en los resultados. */
export const LARGO_DESCRIPCION = 155;

/** Espacios normalizados y, si es largo, cortado en una palabra entera con "…". */
export function recortarDescripcion(texto: string, max = LARGO_DESCRIPCION): string {
  const limpio = texto.replace(/\s+/g, " ").trim();
  if (limpio.length <= max) return limpio;
  const corte = limpio.slice(0, max - 1);
  const ultimoEspacio = corte.lastIndexOf(" ");
  return `${(ultimoEspacio > 0 ? corte.slice(0, ultimoEspacio) : corte).replace(/[\s,.;:]+$/, "")}…`;
}

/** ["A", "B", "C"] → "A, B y C". */
export function enumerar(nombres: string[]): string {
  if (nombres.length <= 1) return nombres.join("");
  return `${nombres.slice(0, -1).join(", ")} y ${nombres.at(-1)}`;
}

export function descripcionServicios(nombres: string[]): string {
  if (nombres.length === 0) return "Servicios de detailing automotriz en Tarija. Escríbenos por WhatsApp y te cotizamos.";
  return recortarDescripcion(`Servicios de detailing en Tarija: ${enumerar(nombres)}. Escríbenos por WhatsApp y te cotizamos.`);
}

export function descripcionGaleria(nombres: string[]): string {
  if (nombres.length === 0) return "Trabajos reales de detailing en Tarija, con fotos de antes y después.";
  return recortarDescripcion(`Trabajos reales en Tarija, con fotos de antes y después: ${enumerar(nombres)}.`);
}
