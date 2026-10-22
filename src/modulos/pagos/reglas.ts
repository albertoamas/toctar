import type { MetodoPago, TipoPago } from "@/db/esquema/trabajos";
import { calcularTotales, restarMontos } from "@/modulos/cotizaciones/reglas";

// Reglas puras de los pagos (C3, HU-32). Montos como los guarda numeric(10,2) ("250.50"); las cuentas son las de las
// cotizaciones, en centavos enteros. Especificación: docs/08-desarrollo/etapas/C3-agenda-pagos.md.

export const NOMBRE_METODO: Record<MetodoPago, string> = { efectivo: "Efectivo", qr: "QR", transferencia: "Transferencia" };
export const NOMBRE_TIPO_PAGO: Record<TipoPago, string> = { adelanto: "Adelanto", saldo: "Saldo" };

export type Saldo = { total: string; pagado: string; saldo: string };

/** Total del trabajo (líneas − descuento, la misma cuenta que la cotización), lo pagado (sin anulados) y el saldo (RF-46). */
export function calcularSaldo(precios: readonly string[], descuento: string, pagos: readonly { monto: string; anulado: boolean }[]): Saldo {
  const { total } = calcularTotales(precios, descuento);
  const { total: pagado } = calcularTotales(
    pagos.filter((p) => !p.anulado).map((p) => p.monto),
    "0",
  );
  return { total, pagado, saldo: restarMontos(total, pagado) };
}
