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
