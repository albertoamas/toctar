// Reglas puras de clientes y vehículos (C1). Sin base ni servidor: las prueba tests/unit/clientes.test.ts.

/**
 * Placa como se guarda: mayúsculas, sin espacios, guiones ni puntos ("1234 abc" → "1234ABC"). Así una placa escrita
 * de dos maneras es la misma y el aviso de duplicado funciona (RF-23). Devuelve null si no parece una placa.
 */
export function normalizarPlaca(texto: string): string | null {
  const placa = texto.toUpperCase().replace(/[\s.\-]/g, "");
  return /^[A-Z0-9]{2,10}$/.test(placa) ? placa : null;
}

/** Año máximo de un vehículo: el siguiente al actual (salen modelos del año que viene). */
export const anioMaximo = (hoy: Date = new Date()) => hoy.getFullYear() + 1;
export const ANIO_MINIMO = 1950;

export type Busqueda = {
  /** Texto para el nombre, sin espacios de más. */
  texto: string;
  /** Solo los dígitos, para el teléfono: si hay al menos 3 (con menos, coincidirían casi todos). */
  digitos: string | null;
  /** Como se guarda una placa: mayúsculas, sin espacios ni guiones. Null si no queda nada. */
  placa: string | null;
};

/**
 * Lo que se escribe en el buscador de clientes (HU-22) se busca a la vez en el nombre, el teléfono y la placa:
 * "7123" encuentra el teléfono, "1234-abc" la placa y "jose" el nombre. Null si está vacío.
 */
export function normalizarBusqueda(q: string): Busqueda | null {
  const texto = q.trim().replace(/\s+/g, " ");
  if (!texto) return null;
  const digitos = texto.replace(/\D/g, "");
  const placa = texto.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return { texto, digitos: digitos.length >= 3 ? digitos : null, placa: placa || null };
}

/** Escapa los comodines de LIKE (% y _) para que se busquen como texto. */
export const escaparLike = (texto: string) => texto.replace(/[\\%_]/g, (c) => `\\${c}`);

/** Prefijo de los campos de un vehículo en la ficha: hay un formulario por vehículo y otro para agregar. */
export const prefijoVehiculo = (id?: number) => (id ? `vehiculo-${id}-` : "vehiculo-nuevo-");
