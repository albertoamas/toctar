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

/** Las marcas que coinciden con lo escrito (sin importar mayúsculas ni tildes), las que empiezan así primero. */
export function filtrarMarcas(marcas: string[], texto: string): string[] {
  const t = sinTildes(clave(texto));
  if (!t) return marcas;
  const coinciden = marcas.filter((m) => sinTildes(clave(m)).includes(t));
  return [...coinciden.filter((m) => sinTildes(clave(m)).startsWith(t)), ...coinciden.filter((m) => !sinTildes(clave(m)).startsWith(t))];
}

/** Si lo escrito ya es una marca de la lista (con otras mayúsculas): "toyota" es "Toyota". */
export function marcaExacta(marcas: string[], texto: string): string | null {
  return marcas.find((m) => clave(m) === clave(texto)) ?? null;
}

/** Los años para elegir: del año que viene (el modelo del año siguiente) hacia atrás hasta 1950, la regla de la base. */
export function aniosParaElegir(hoy: Date = new Date()): number[] {
  const desde = anioMaximo(hoy);
  return Array.from({ length: desde - ANIO_MINIMO + 1 }, (_, i) => desde - i);
}

function sinTildes(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "");
}
