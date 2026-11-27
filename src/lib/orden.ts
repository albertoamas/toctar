// Reglas de las listas del panel (espacios, tamaños, servicios, variantes, preguntas y galería):
// orden manual (subir y bajar), nombres sin repetir y al menos un elemento activo.

type Ordenable = { id: number; orden: number; activo: boolean };

/** Hacia dónde se mueve un elemento de una lista con orden manual. */
export const DIRECCIONES = ["subir", "bajar"] as const;
export type Direccion = (typeof DIRECCIONES)[number];

/**
 * Nuevo orden de los activos al subir o bajar uno: [{ id, orden }] numerados desde 1.
 * null si no se puede mover (ya está primero o último, o no está activo).
 */
export function reordenar(elementos: Ordenable[], id: number, direccion: Direccion): { id: number; orden: number }[] | null {
  const activos = elementos.filter((e) => e.activo).sort((a, b) => a.orden - b.orden || a.id - b.id);
  const i = activos.findIndex((e) => e.id === id);
  const j = direccion === "subir" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= activos.length) return null;
  [activos[i], activos[j]] = [activos[j], activos[i]];
  return activos.map((e, k) => ({ id: e.id, orden: k + 1 }));
}

/** Nombre repetido sin importar mayúsculas (otro elemento, activo o no). */
export function nombreRepetido(elementos: { id: number; nombre: string }[], nombre: string, id?: number): boolean {
  const buscado = nombre.trim().toLocaleLowerCase("es");
  return elementos.some((e) => e.id !== id && e.nombre.trim().toLocaleLowerCase("es") === buscado);
}

/** No se puede desactivar el último activo (sin espacios no hay agenda; sin variantes no hay qué cotizar). */
export function puedeDesactivar(elementos: { id: number; activo: boolean }[], id: number): boolean {
  return elementos.some((e) => e.activo && e.id !== id);
}
