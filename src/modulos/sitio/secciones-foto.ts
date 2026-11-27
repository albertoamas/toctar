// Las secciones de la página de un servicio que pueden llevar una foto al lado (pedido de la demo del 24/10: imágenes
// dentro del contenido, no solo texto). Una foto por sección; sin foto, la sección es solo texto. La foto es decorativa
// (el texto de la sección dice lo mismo): sin descripción y sin abrirse en grande (revisión de YankoSoft, 24/10).

export const SECCIONES_FOTO = {
  proceso: "Cómo lo hacemos",
  opciones: "Opciones",
} as const;

export type SeccionFoto = keyof typeof SECCIONES_FOTO;

export const CLAVES_SECCION = Object.keys(SECCIONES_FOTO) as [SeccionFoto, ...SeccionFoto[]];

/**
 * De qué lado va la foto de cada sección en la computadora: se alternan entre las secciones que muestran foto, en el
 * orden de la página, empezando por la derecha. Así dos fotos seguidas nunca quedan del mismo lado.
 */
export function ladosDeFotos(conFoto: Record<SeccionFoto, boolean>): Record<SeccionFoto, "derecha" | "izquierda"> {
  let cuenta = 0;
  const lados = {} as Record<SeccionFoto, "derecha" | "izquierda">;
  for (const seccion of CLAVES_SECCION) {
    lados[seccion] = cuenta % 2 === 0 ? "derecha" : "izquierda";
    if (conFoto[seccion]) cuenta++;
  }
  return lados;
}
