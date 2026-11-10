import type { MetodoPago, TipoPago } from "@/db/esquema/trabajos";
import { calcularTotales, montoNoMayor, restarMontos } from "@/modulos/cotizaciones/reglas";
import type { Busqueda } from "@/modulos/clientes/reglas";

// Reglas puras de los pagos (C3, HU-32). Montos como los guarda numeric(10,2) ("250.50"); las cuentas son las de las
// cotizaciones, en centavos enteros. Especificación: docs/08-desarrollo/etapas/C3-agenda-pagos.md.

export const NOMBRE_METODO: Record<MetodoPago, string> = { efectivo: "Efectivo", qr: "QR", transferencia: "Transferencia" };
/** "Adelanto por QR", "Saldo en efectivo": el método dentro de una frase. */
export const METODO_EN_FRASE: Record<MetodoPago, string> = { efectivo: "en efectivo", qr: "por QR", transferencia: "por transferencia" };
export const NOMBRE_TIPO_PAGO: Record<TipoPago, string> = { adelanto: "Adelanto", saldo: "Saldo" };
/** Las mismas de la base, en el orden de los formularios (aquí y no desde el esquema: un componente de cliente no carga Drizzle). */
export const METODOS = Object.keys(NOMBRE_METODO) as MetodoPago[];
export const TIPOS = Object.keys(NOMBRE_TIPO_PAGO) as TipoPago[];

/** Con QR o transferencia hay un comprobante que guardar; en efectivo, no (el formulario no lo ofrece). */
export function llevaComprobante(metodo: MetodoPago | ""): boolean {
  return metodo === "qr" || metodo === "transferencia";
}

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
 * Lo que debe un cliente (ficha del cliente, pulido 8.3): como en Saldos pendientes (HU-37), la suma de los saldos de sus
 * órdenes entregadas sin pagar. Una reserva por venir o un trabajo en el taller todavía no se deben. Null si no debe
 * nada o si no se calcularon los saldos (quien no ve pagos).
 */
export function saldoPendiente(trabajos: readonly { estado: string; saldo: Saldo | null }[]): string | null {
  const saldos = trabajos.filter((t) => t.estado === "entregado" && t.saldo && !estaPagada(t.saldo.saldo)).map((t) => t.saldo!.saldo);
  return saldos.length > 0 ? calcularTotales(saldos, "0").total : null;
}

// Pedido 30: los saldos pendientes se buscan y se ordenan. La lista es chica (solo las que deben): se hace aquí, sobre
// las que trae la consulta, con reglas puras.

/** Cómo se ordena la lista de saldos: la más antigua primero (la que más urge cobrar), el mayor monto o el cliente. */
export const ORDENES_SALDOS = { antiguas: "Más antiguas", monto: "Mayor monto", cliente: "Cliente" } as const;
export type OrdenSaldos = keyof typeof ORDENES_SALDOS;

/** Sin tildes, mayúsculas ni espacios de más: "José  Pérez" y "jose perez" son lo mismo. */
/** Para comparar textos al buscar: sin tildes, en minúsculas y sin espacios de más. */
export const sinTildes = (texto: string) => texto.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim().replace(/\s+/g, " ");

/** Los saldos de quien coincide con lo buscado: el nombre del cliente, su teléfono o la placa (3 caracteres o más cada uno). */
export function filtrarSaldos<T extends { cliente: string; telefono: string; placa: string }>(saldos: readonly T[], busqueda: Busqueda | null): T[] {
  if (!busqueda) return [...saldos];
  const texto = sinTildes(busqueda.texto);
  return saldos.filter(
    (s) =>
      sinTildes(s.cliente).includes(texto) ||
      (!!busqueda.digitos && s.telefono.includes(busqueda.digitos)) ||
      // Como el teléfono, desde 3: con menos, "ana" o "b" traerían casi todas las placas
      (!!busqueda.placa && busqueda.placa.length >= 3 && s.placa.includes(busqueda.placa)),
  );
}

/** Los saldos en ese orden; a igualdad, la más antigua primero. */
export function ordenarSaldos<T extends { id: number; saldo: string; entregadoAt: Date; cliente: string }>(saldos: readonly T[], orden: OrdenSaldos): T[] {
  const antigua = (a: T, b: T) => a.entregadoAt.getTime() - b.entregadoAt.getTime() || a.id - b.id;
  const criterio: Record<OrdenSaldos, (a: T, b: T) => number> = {
    antiguas: antigua,
    monto: (a, b) => Number(b.saldo) - Number(a.saldo) || antigua(a, b),
    cliente: (a, b) => a.cliente.localeCompare(b.cliente, "es", { sensitivity: "base" }) || antigua(a, b),
  };
  return [...saldos].sort(criterio[orden]);
}
