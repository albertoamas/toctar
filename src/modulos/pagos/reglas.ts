import type { MetodoPago, TipoPago } from "@/db/esquema/trabajos";
import { calcularTotales, montoNoMayor, restarMontos } from "@/modulos/cotizaciones/reglas";

// Reglas puras de los pagos (C3, HU-32). Montos como los guarda numeric(10,2) ("250.50"); las cuentas son las de las
// cotizaciones, en centavos enteros. Especificación: docs/08-desarrollo/etapas/C3-agenda-pagos.md.

export const NOMBRE_METODO: Record<MetodoPago, string> = { efectivo: "Efectivo", qr: "QR", transferencia: "Transferencia" };
/** "Adelanto por QR", "Saldo en efectivo": el método dentro de una frase. */
export const METODO_EN_FRASE: Record<MetodoPago, string> = { efectivo: "en efectivo", qr: "por QR", transferencia: "por transferencia" };
export const NOMBRE_TIPO_PAGO: Record<TipoPago, string> = { adelanto: "Adelanto", saldo: "Saldo" };
/** Las mismas de la base, en el orden de los formularios (aquí y no desde el esquema: un componente de cliente no carga Drizzle). */
export const METODOS = Object.keys(NOMBRE_METODO) as MetodoPago[];
export const TIPOS = Object.keys(NOMBRE_TIPO_PAGO) as TipoPago[];

/** El mismo aviso en el navegador (antes de enviar) y en el servidor. */
export const ERROR_COMPROBANTE = "El comprobante debe ser una foto JPG, PNG o WebP de hasta 5 MB.";

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

/**
 * Precio cotizado (sus servicios − descuento), lo que se sumó en el taller y el precio final (RF-43). El descuento
 * es el de la cotización: se aplica una sola vez.
 */
export function precioCotizadoYFinal(lineas: readonly { precio: string; esAdicional: boolean }[], descuento: string) {
  const { total: cotizado } = calcularTotales(
    lineas.filter((l) => !l.esAdicional).map((l) => l.precio),
    descuento,
  );
  const { total: adicionales } = calcularTotales(
    lineas.filter((l) => l.esAdicional).map((l) => l.precio),
    "0",
  );
  const { total: final } = calcularTotales(
    lineas.map((l) => l.precio),
    descuento,
  );
  return { cotizado, adicionales, final };
}

/** Nada pendiente: saldo cero o a favor del cliente (negativo). Ya no recibe pagos. */
export const estaPagada = (saldo: string) => montoNoMayor(saldo, "0");

/**
 * Lo que debe un cliente (ficha del cliente, pulido 8.3): la suma de los saldos de sus reservas y órdenes que no están
 * pagadas, sin las canceladas (su saldo no se cobra). Null si no debe nada o si no se calcularon los saldos.
 */
export function saldoPendiente(trabajos: readonly { estado: string; saldo: Saldo | null }[]): string | null {
  const saldos = trabajos.filter((t) => t.estado !== "cancelado" && t.saldo && !estaPagada(t.saldo.saldo)).map((t) => t.saldo!.saldo);
  return saldos.length > 0 ? calcularTotales(saldos, "0").total : null;
}
