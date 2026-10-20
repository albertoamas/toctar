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
