import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { tamanoVehiculo } from "@/db/esquema";
import type { EstadoFormulario } from "@/lib/formularios";
import { clienteConPlaca } from "./consultas";
import { CAMPOS_VEHICULO } from "./esquemas";

// Ayudas del servidor para registrar clientes y vehículos: las usan las acciones de Clientes (C1) y la nueva consulta
// (C2), que registra al cliente ahí mismo. No es un archivo "use server": no expone nada al navegador.

/**
 * Respuesta de los formularios de clientes: además de los errores, a quién pertenece el dato repetido (RF-23); en una
 * placa, también su vehículo, para cambiarle el dueño (pedido 37).
 */
export type EstadoCliente = EstadoFormulario & { existentes?: Record<string, { id: number; nombre: string; vehiculoId?: number }> };
export type Existentes = NonNullable<EstadoCliente["existentes"]>;

/** Prefijo de los campos del vehículo en el formulario de cliente nuevo (y en el de la nueva consulta). */
export const PREFIJO_VEHICULO = "vehiculo-";

export function leerValores(datos: FormData): Record<string, string> {
  const valores: Record<string, string> = {};
  for (const [clave, valor] of datos.entries()) if (typeof valor === "string") valores[clave] = valor;
  return valores;
}

/** Los campos de un vehículo con su prefijo, ya sin él. */
export const camposConPrefijo = (valores: Record<string, string>, prefijo: string) =>
  Object.fromEntries(CAMPOS_VEHICULO.map((c) => [c, (valores[prefijo + c] ?? "").trim()]));

/** Los errores del esquema del vehículo, con el prefijo de sus campos. */
export const erroresConPrefijo = (errores: Record<string, string>, prefijo: string) =>
  Object.fromEntries(Object.entries(errores).map(([c, m]) => [prefijo + c, m]));

/**
 * Lo que el esquema no puede saber de un vehículo: si la placa ya es de otro vehículo activo (RF-23) y si el tamaño
 * sigue activo. Al editar, `actual` es el vehículo: no choca consigo mismo y puede conservar un tamaño ya desactivado.
 */
export async function revisarVehiculo(
  datos: { placa: string; tamanoId: number },
  prefijo: string,
  errores: Record<string, string>,
  existentes: Existentes,
  actual?: { id: number; tamanoId: number },
) {
  const conPlaca = await clienteConPlaca(datos.placa, actual?.id);
  if (conPlaca) {
    errores[`${prefijo}placa`] = `La placa ${datos.placa} ya está registrada a nombre de ${conPlaca.nombre}.`;
    existentes[`${prefijo}placa`] = conPlaca;
  }
  if (datos.tamanoId === actual?.tamanoId) return;
  const [tamano] = await db
    .select({ id: tamanoVehiculo.id })
    .from(tamanoVehiculo)
    .where(and(eq(tamanoVehiculo.id, datos.tamanoId), eq(tamanoVehiculo.activo, true)));
  if (!tamano) errores[`${prefijo}tamanoId`] = "Elige el tamaño.";
}
