import { mostrarMonto } from "@/modulos/catalogo/reglas";
import { nombreVehiculo, primerNombre } from "@/modulos/clientes/reglas";
import { estaPagada } from "@/modulos/pagos/reglas";

// Mensajes de WhatsApp de las órdenes (C4). El sistema los arma y la persona los envía: no hay envío automático. Los
// textos son fijos hasta la HU-40 (deseable), que los vuelve editables. Especificación: C4-taller-entrega.md §8.

type Vehiculo = { marca: string | null; modelo: string | null; placa: string };

/** "Toyota Corolla (placa 1234ABC)", o "vehículo (placa 1234ABC)" si no se cargó la marca. */
export const textoVehiculo = (v: Vehiculo) => `${nombreVehiculo(v) || "vehículo"} (placa ${v.placa})`;

/**
 * Vehículo listo (HU-35, RF-48): nombre, vehículo y, si hay y quien avisa lo ve, el saldo. Un saldo a favor del cliente
 * no se menciona.
 */
export function mensajeListo({ negocio, cliente, vehiculo, saldo }: { negocio: string; cliente: string; vehiculo: Vehiculo; saldo: string | null }): string {
  const pendiente = saldo && !estaPagada(saldo) ? `Saldo pendiente: ${mostrarMonto(saldo)} Bs. ` : "";
  const nombre = primerNombre(cliente);
  return `${nombre ? `Hola ${nombre}` : "Hola"}, tu ${textoVehiculo(vehiculo)} ya está listo en ${negocio}. ${pendiente}Te esperamos en el taller.`;
}
