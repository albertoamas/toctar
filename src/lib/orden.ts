// Orden manual de listas (subir y bajar): espacios, tamaños, servicios, variantes, preguntas y galería.

type Ordenable = { id: number; orden: number; activo: boolean };

/**
 * Nuevo orden de los activos al subir o bajar uno: [{ id, orden }] numerados desde 1.
 * null si no se puede mover (ya está primero o último, o no está activo).
 */
export function reordenar(elementos: Ordenable[], id: number, direccion: "subir" | "bajar"): { id: number; orden: number }[] | null {
  const activos = elementos.filter((e) => e.activo).sort((a, b) => a.orden - b.orden || a.id - b.id);
  const i = activos.findIndex((e) => e.id === id);
  const j = direccion === "subir" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= activos.length) return null;
  [activos[i], activos[j]] = [activos[j], activos[i]];
  return activos.map((e, k) => ({ id: e.id, orden: k + 1 }));
}
