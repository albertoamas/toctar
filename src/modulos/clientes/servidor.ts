import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { db, type Transaccion } from "@/db";
import { marcaVehiculo, tamanoVehiculo } from "@/db/esquema";
import type { EstadoFormulario } from "@/lib/formularios";
import { clienteConPlaca } from "./consultas";

// Ayudas del servidor para registrar clientes y vehículos: las usan las acciones de Clientes (C1) y la nueva consulta
// (C2), que registra al cliente ahí mismo. No es un archivo "use server": no expone nada al navegador.

/**
 * Respuesta de los formularios de clientes: además de los errores, a quién pertenece el dato repetido (RF-23); en una
 * placa, también su vehículo, para cambiarle el dueño (pedido 37).
 */
export type EstadoCliente = EstadoFormulario & { existentes?: Record<string, { id: number; nombre: string; vehiculoId?: number }> };
export type Existentes = NonNullable<EstadoCliente["existentes"]>;


/**
 * Lo que el esquema no puede saber de un vehículo: si la placa ya es de otro vehículo activo (RF-23) y si el tamaño
 * sigue activo. Al editar, `actual` es el vehículo: no choca consigo mismo y puede conservar un tamaño ya desactivado.
 */
export async function revisarVehiculo(
  datos: { placa: string; tamanoId: number; marca?: string | null },
  prefijo: string,
  errores: Record<string, string>,
  existentes: Existentes,
  actual?: { id: number; tamanoId: number; marca?: string | null },
) {
  // La marca, solo de la lista activa (26/11): las marcas nuevas las suma el dueño en Configuración → Taller. La que ya
  // tenía el vehículo (vieja o desactivada) se puede conservar
  const marca = datos.marca?.trim();
  if (marca && marca.toLocaleLowerCase("es") !== actual?.marca?.trim().toLocaleLowerCase("es")) {
    const [enLista] = await db
      .select({ id: marcaVehiculo.id })
      .from(marcaVehiculo)
      .where(and(sql`lower(${marcaVehiculo.nombre}) = lower(${marca})`, eq(marcaVehiculo.activo, true)));
    if (!enLista) errores[`${prefijo}marca`] = "Elige una marca de la lista.";
  }
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

/**
 * La marca de un vehículo como está en la lista (pedido 52): "toyota" se guarda "Toyota". Ya no suma marcas (26/11: solo
 * desde Configuración → Taller, y `revisarVehiculo` rechaza una que no está); una vieja que el vehículo ya tenía queda
 * como estaba. Dentro de la transacción que guarda el vehículo.
 */
export async function conMarcaDeLaLista<T extends { marca: string | null }>(tx: Transaccion, datos: T): Promise<T> {
  const marca = datos.marca?.trim();
  if (!marca) return datos;
  const buscar = () => tx.select({ nombre: marcaVehiculo.nombre }).from(marcaVehiculo).where(sql`lower(${marcaVehiculo.nombre}) = lower(${marca})`);
  const [existente] = await buscar();
  return existente ? { ...datos, marca: existente.nombre } : datos;
}
