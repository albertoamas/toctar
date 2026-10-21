import type { MetodoPago, TipoPago } from "@/db/esquema/trabajos";

// Reglas puras de los pagos (C3, HU-32). Montos como los guarda numeric(10,2) ("250.50"); las cuentas, en centavos
// enteros, como en las cotizaciones. Especificación: docs/08-desarrollo/etapas/C3-agenda-pagos.md.

export const NOMBRE_METODO: Record<MetodoPago, string> = { efectivo: "Efectivo", qr: "QR", transferencia: "Transferencia" };
export const NOMBRE_TIPO_PAGO: Record<TipoPago, string> = { adelanto: "Adelanto", saldo: "Saldo" };

const aCentavos = (monto: string) => Math.round(Number(monto) * 100);
const deCentavos = (centavos: number) => (centavos / 100).toFixed(2);

export type Saldo = { total: string; pagado: string; saldo: string };

/** Total del trabajo (líneas − descuento), lo pagado (sin los anulados) y el saldo (RF-46). */
export function calcularSaldo(precios: readonly string[], descuento: string, pagos: readonly { monto: string; anulado: boolean }[]): Saldo {
  const total = Math.max(0, precios.reduce((s, p) => s + aCentavos(p), 0) - aCentavos(descuento));
  const pagado = pagos.filter((p) => !p.anulado).reduce((s, p) => s + aCentavos(p.monto), 0);
  return { total: deCentavos(total), pagado: deCentavos(pagado), saldo: deCentavos(total - pagado) };
}

/** a ≤ b, con montos en texto. */
export const montoNoMayor = (a: string, b: string) => aCentavos(a) <= aCentavos(b);
