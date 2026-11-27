import { ANIO_MINIMO, anioMaximo } from "./reglas";

// Menos escritura al registrar un vehículo (pedido 52, etapas/P52-catalogo-de-marcas.md): las marcas de la lista que
// administra el dueño, el año y el color. El modelo es un texto simple. Reglas puras (las usa el formulario), probadas
// en tests/unit/catalogo-vehiculos.test.ts.

export type CatalogoVehiculos = { marcas: string[] };

const clave = (texto: string) => texto.trim().toLocaleLowerCase("es");

/** Las marcas para elegir: las activas y, si el vehículo tiene una que ya no está (vieja o desactivada), también esa. */
export function marcasParaElegir(marcas: string[], actual?: string | null): string[] {
  const enLista = actual && !marcas.some((m) => clave(m) === clave(actual));
  return enLista ? [...marcas, actual.trim()].sort((a, b) => a.localeCompare(b, "es")) : marcas;
}

/** Si una marca ya está en la lista (con otras mayúsculas): "toyota" es "Toyota". Para marcar la de un vehículo viejo. */
export function marcaExacta(marcas: string[], texto: string): string | null {
  return marcas.find((m) => clave(m) === clave(texto)) ?? null;
}

/** Los años para elegir: del año que viene (el modelo del año siguiente) hacia atrás hasta 1950, la regla de la base. */
export function aniosParaElegir(hoy: Date = new Date()): number[] {
  const desde = anioMaximo(hoy);
  return Array.from({ length: desde - ANIO_MINIMO + 1 }, (_, i) => desde - i);
}
