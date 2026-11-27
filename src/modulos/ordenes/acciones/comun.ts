import "server-only";

import { revalidatePath } from "next/cache";
import { saldoCambiado } from "@/modulos/pagos/saldo-cambiado";

// Órdenes (C4): Lo que comparten las acciones de la orden: los textos de error, el conflicto que deshace una transacción y
// la actualización de las pantallas después de un cambio.
// Entra el dueño o el encargado con "Órdenes" (pedido 32). Especificación: docs/08-desarrollo/etapas/C4-taller-entrega.md.

export const RECARGA = "No se pudo leer el pedido. Recarga la página.";

export const ERROR_FOTO = "La foto debe ser JPG, PNG o WebP de hasta 5 MB.";

/** Algo cambió entre la revisión y la escritura: se lanza dentro de la transacción para deshacerla entera. Con
 * `campo`, el error va junto a ese campo; sin él, arriba del formulario. */
export class Conflicto extends Error {
  constructor(
    mensaje: string,
    readonly campo?: string,
  ) {
    super(mensaje);
  }
}

export function despuesDeCambiar(id: number, clienteId: number) {
  revalidatePath("/panel/ordenes");
  revalidatePath("/panel/agenda");
  // Los servicios o el descuento cambian el saldo: también Saldos e Inicio (saldoCambiado)
  saldoCambiado(id, clienteId);
}

export const CAMBIO = "Esa orden cambió recién. Recarga la página.";
