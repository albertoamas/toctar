import { mostrarMonto } from "@/modulos/catalogo/reglas";
import { estaPagada } from "@/modulos/pagos/reglas";

// Mensajes de WhatsApp de las órdenes (C4). El sistema los arma y la persona los envía: no hay envío automático. Los
// textos son fijos hasta la HU-40 (deseable), que los vuelve editables. Especificación: C4-taller-entrega.md §8.

type Vehiculo = { marca: string | null; modelo: string | null; placa: string };

/** "Juan Pérez" → "Juan": el saludo, como se escribe por WhatsApp. */
export const primerNombre = (nombre: string) => nombre.trim().split(/\s+/)[0] ?? nombre;

/** "Toyota Corolla (placa 1234ABC)", o "vehículo (placa 1234ABC)" si no se cargó la marca. */
export function textoVehiculo({ marca, modelo, placa }: Vehiculo): string {
  const nombre = [marca, modelo].filter(Boolean).join(" ").trim();
  return `${nombre || "vehículo"} (placa ${placa})`;
}

/**
 * Vehículo listo (HU-35, RF-48): nombre, vehículo y, si hay y quien avisa lo ve, el saldo. Un saldo a favor del cliente
 * no se menciona.
 */
export function mensajeListo({ negocio, cliente, vehiculo, saldo }: { negocio: string; cliente: string; vehiculo: Vehiculo; saldo: string | null }): string {
  const pendiente = saldo && !estaPagada(saldo) ? `Saldo pendiente: ${mostrarMonto(saldo)} Bs. ` : "";
  return `Hola ${primerNombre(cliente)}, tu ${textoVehiculo(vehiculo)} ya está listo en ${negocio}. ${pendiente}Te esperamos en el taller.`;
}
