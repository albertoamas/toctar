// Reglas de la galería pública (HU-12). Puras: se prueban en tests/unit/sitio-galeria.test.ts.

type ConServicio = { servicio: { nombre: string; slug: string } };

/** Servicios que tienen fotos, en el orden en que aparecen: son las opciones del filtro. */
export function serviciosConFotos<T extends ConServicio>(fotos: T[]): { nombre: string; slug: string }[] {
  const vistos = new Map<string, { nombre: string; slug: string }>();
  for (const f of fotos) if (!vistos.has(f.servicio.slug)) vistos.set(f.servicio.slug, f.servicio);
  return [...vistos.values()];
}

/** Fotos de un servicio, o todas si el filtro está vacío o no corresponde a ningún servicio con fotos. */
export function filtrarPorServicio<T extends ConServicio>(fotos: T[], slug: string | undefined): T[] {
  if (!slug || !fotos.some((f) => f.servicio.slug === slug)) return fotos;
  return fotos.filter((f) => f.servicio.slug === slug);
}

type ConAntes = { antes: unknown; enPortada: boolean };

/**
 * El trabajo del comparador de la portada (pedido de la demo del 24/10): el elegido en el panel; si no hay ninguno
 * elegido (o quedó oculto), el primero de la galería con foto de antes; sin ninguno con antes, no hay comparador.
 * Recibe solo lo visible del sitio, en su orden.
 */
export function trabajoDePortada<T extends ConAntes>(fotos: T[]): (T & { antes: NonNullable<T["antes"]> }) | null {
  const conAntes = fotos.filter((f): f is T & { antes: NonNullable<T["antes"]> } => f.antes != null);
  return conAntes.find((f) => f.enPortada) ?? conAntes[0] ?? null;
}

/**
 * Qué va al lado del lema de la portada: el comparador si hay un trabajo con antes; si no, el arte de la marca, pero
 * solo sin foto del taller (con foto, el texto usa todo el ancho sobre ella).
 */
export function ladoDelLema({ hayFotoTaller, hayComparador }: { hayFotoTaller: boolean; hayComparador: boolean }): "comparador" | "arte" | null {
  if (hayComparador) return "comparador";
  return hayFotoTaller ? null : "arte";
}

/**
 * Cómo se nombra un trabajo de la galería (texto alternativo, botones del panel): su descripción, que es opcional desde
 * el 24/10; sin ella, "Trabajo de <servicio>". El panel suma su lugar en la lista (`numero`, que también se ve en la
 * tarjeta): ahí varios sin descripción tienen que distinguirse.
 */
export function nombreDelTrabajo(descripcion: string, servicio: string, numero?: number): string {
  // El nombre del servicio tal cual: pasarlo a minúsculas rompe siglas ("PPF")
  return descripcion.trim() || `Trabajo de ${servicio}${numero === undefined ? "" : ` (n.º ${numero})`}`;
}

/**
 * Las dos secciones de la galería (pedido 34): los pares de antes y después (lo más llamativo, se comparan en la
 * página) y las fotos solas, cada grupo en el orden del panel.
 */
export function separarPares<T extends { antes: unknown }>(fotos: T[]): { pares: T[]; solas: T[] } {
  return { pares: fotos.filter((f) => f.antes != null), solas: fotos.filter((f) => f.antes == null) };
}
