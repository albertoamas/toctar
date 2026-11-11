import { mostrarMonto } from "@/modulos/catalogo/reglas";
import { nombreVehiculo, primerNombre } from "@/modulos/clientes/reglas";
import { armarMensaje, type ClavePlantilla } from "@/modulos/configuracion/plantillas";
import { estaPagada } from "@/modulos/pagos/reglas";

// Mensajes de WhatsApp de las órdenes (C4). El sistema los arma y la persona los envía: no hay envío automático. El
// texto es la plantilla que guardó el dueño en Configuración > Mensajes (HU-40); aquí se calculan los valores de sus
// campos. Especificación: C4-taller-entrega.md §8 y C5-cierre-entrega-2.md §6.

type Vehiculo = { marca: string | null; modelo: string | null; placa: string };
type Datos = { plantilla: string; negocio: string; cliente: string; vehiculo: Vehiculo };

/** "Toyota Corolla (placa 1234ABC)", o "vehículo (placa 1234ABC)" si no se cargó la marca. */
export const textoVehiculo = (v: Vehiculo) => `${nombreVehiculo(v) || "vehículo"} (placa ${v.placa})`;

const comunes = ({ negocio, cliente, vehiculo }: Datos) => ({ nombre: primerNombre(cliente), vehiculo: textoVehiculo(vehiculo), negocio });

/** Saldo pendiente de una orden entregada (HU-37): para cobrarlo por WhatsApp. */
export function mensajeSaldo(datos: Datos & { saldo: string }): string {
  return armarMensaje(datos.plantilla, { ...comunes(datos), monto: `${mostrarMonto(datos.saldo)} Bs` });
}

/**
 * Vehículo listo (HU-35, RF-48): nombre, vehículo y, si hay y quien avisa lo ve, el saldo. Un saldo a favor del cliente
 * no se menciona.
 */
export function mensajeListo(datos: Datos & { saldo: string | null }): string {
  const { saldo } = datos;
  return armarMensaje(datos.plantilla, { ...comunes(datos), saldo: saldo && !estaPagada(saldo) ? `Saldo pendiente: ${mostrarMonto(saldo)} Bs.` : "" });
}

/**
 * La cotización con su enlace (pedido 47): se manda desde la ficha de la cotización. El enlace nunca falta: si el dueño
 * quitó {enlace} de la plantilla, va al final.
 */
export function mensajeCotizacion(datos: Datos & { numero: string; enlace: string }): string {
  const texto = armarMensaje(datos.plantilla, { ...comunes(datos), numero: datos.numero, enlace: datos.enlace });
  return texto.includes(datos.enlace) ? texto : `${texto} ${datos.enlace}`;
}

/** Le toca el mantenimiento (HU-38, RF-50): para avisarle y ofrecerle un día. */
export function mensajeMantenimiento(datos: Datos & { servicio: string }): string {
  return armarMensaje(datos.plantilla, { ...comunes(datos), servicio: datos.servicio });
}

const EJEMPLO = { cliente: "Juan Pérez", vehiculo: { marca: "Toyota", modelo: "Corolla", placa: "1234ABC" } };

/** El mensaje con datos de ejemplo, para la vista previa del editor: armado igual que el de verdad. */
export function mensajeDeEjemplo(clave: ClavePlantilla, plantilla: string, negocio: string): string {
  const datos = { ...EJEMPLO, plantilla, negocio };
  if (clave === "listo") return mensajeListo({ ...datos, saldo: "350.00" });
  if (clave === "saldo") return mensajeSaldo({ ...datos, saldo: "350.00" });
  if (clave === "cotizacion") return mensajeCotizacion({ ...datos, numero: "2026-0042", enlace: "https://toctardetailing.com/c/…" });
  return mensajeMantenimiento({ ...datos, servicio: "Nano cerámico" });
}
