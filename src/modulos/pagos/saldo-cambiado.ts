import "server-only";
import { revalidatePath } from "next/cache";

/**
 * Lo que hay que renovar cuando cambia el saldo de un trabajo: al cobrar o anular un pago, y al cambiar sus servicios o
 * su descuento en la orden. Son las pantallas que lo muestran: la reserva, la orden, entregar, Saldos, Inicio y la ficha
 * del cliente. La guía de Next dice que revalidatePath actualiza al momento la pantalla que se está viendo si la nombra
 * (hoy también refresca las demás, pero lo avisa como temporal).
 * Hasta el 12/11, al cobrar se renovaban solo la reserva y el cliente (de antes de las órdenes, C3), y al cambiar la
 * orden, ni Saldos ni Inicio: se cobra sobre todo desde la orden (pulido 13.52), al entregar y en Saldos.
 */
export function saldoCambiado(trabajoId: number, clienteId?: number): void {
  for (const ruta of [`/panel/agenda/${trabajoId}`, `/panel/ordenes/${trabajoId}`, `/panel/ordenes/${trabajoId}/entregar`, "/panel/pagos", "/panel"]) {
    revalidatePath(ruta);
  }
  if (clienteId !== undefined) revalidatePath(`/panel/clientes/${clienteId}`);
}
