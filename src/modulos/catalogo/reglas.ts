import { cantidad } from "@/lib/cantidad";

// Reglas puras del catálogo (C1). Sin base ni servidor: las prueba tests/unit/catalogo.test.ts.
// Especificación: docs/08-desarrollo/etapas/C1-catalogo-clientes.md §3 y §6.

/** Una duración en días, como se lee: "1 día", "3 días". */
export const textoDias = (n: number) => cantidad(n, "día", "días");

/**
 * El precio más bajo de un servicio, para la lista del catálogo ("Desde 700 Bs"): el menor de sus montos vigentes.
 * "Según evaluación" (null) cuenta solo si todos lo son; sin ningún precio cargado, undefined.
 */
export function precioDesde(montos: readonly Monto[]): Monto | undefined {
  if (montos.length === 0) return undefined;
  const conMonto = montos.filter((m): m is string => m !== null);
  return conMonto.length === 0 ? null : conMonto.reduce((menor, m) => (Number(m) < Number(menor) ? m : menor));
}

/** Monto en Bs como lo guarda `numeric(10,2)`: "250.00". Nulo es "según evaluación". */
export type Monto = string | null;

export const MONTO_MAXIMO = 100_000;

/**
 * Lee un monto como lo escribe la gente: "250", "250,5" o "250.50". Vacío es "según evaluación" (null).
 * Sin separador de miles: "1.250" no se acepta, para no confundirlo con 1,25. Devuelve undefined si no es válido.
 */
export function leerMonto(texto: string): Monto | undefined {
  const limpio = texto.trim();
  if (limpio === "") return null;
  if (!/^\d+([.,]\d{1,2})?$/.test(limpio)) return undefined;
  const valor = Number(limpio.replace(",", "."));
  if (valor <= 0 || valor > MONTO_MAXIMO) return undefined;
  return valor.toFixed(2);
}

/** "250.00" → "250"; "250.50" → "250,50": lo que se muestra en el campo y en el historial. */
export function mostrarMonto(monto: string): string {
  const [entero, decimales] = monto.split(".");
  return decimales === "00" || decimales === undefined ? entero : `${entero},${decimales}`;
}

/**
 * Pares (tamaño, monto) que cambiaron respecto de los vigentes: solo esos se guardan como filas nuevas (D-3).
 * Guardar el formulario confirma todos sus campos: un tamaño sin cargar que se deja vacío pasa a "según evaluación".
 */
export function preciosCambiados(vigentes: ReadonlyMap<number, Monto>, enviados: ReadonlyMap<number, Monto>): { tamanoId: number; monto: Monto }[] {
  const cambios: { tamanoId: number; monto: Monto }[] = [];
  for (const [tamanoId, monto] of enviados) {
    if (vigentes.has(tamanoId) && vigentes.get(tamanoId) === monto) continue;
    cambios.push({ tamanoId, monto });
  }
  return cambios;
}

/** Cuántos pares variante y tamaño activos no tienen precio cargado (ni monto ni "según evaluación"). */
export function preciosFaltantes(varianteIds: readonly number[], tamanoIds: readonly number[], cargados: ReadonlySet<string>): number {
  let faltan = 0;
  for (const v of varianteIds) for (const t of tamanoIds) if (!cargados.has(clavePrecio(v, t))) faltan++;
  return faltan;
}

export const clavePrecio = (varianteId: number, tamanoId: number) => `${varianteId}:${tamanoId}`;

/** Días estimados de una variante: los suyos si los tiene; si no, los del servicio (RF-27). */
export function duracionEfectiva(servicio: { duracionDias: number }, variante: { duracionDias: number | null }): number {
  return variante.duracionDias ?? servicio.duracionDias;
}
