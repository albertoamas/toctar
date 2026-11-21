import "server-only";

import { asc, desc, eq, inArray } from "drizzle-orm";
import { urlsFotoPrivada, type UrlsFoto } from "@/lib/fotos";
import { db } from "@/db";
import { archivo, cliente, consulta, consultaArchivo, cotizacion, cotizacionLinea, tamanoVehiculo, usuario, variante, vehiculo } from "@/db/esquema";
import type { EstadoConsulta, MotivoPerdida } from "@/db/esquema/consultas";
import type { EstadoCotizacion } from "@/db/esquema/cotizaciones";
import { detalleVehiculo } from "@/modulos/clientes/reglas";
import { partirDescripcion } from "../reglas";
import { esInteresado, nombreDeQuien, sinFecha, tamanoDeLaConsulta, telefonoDeQuien } from "./comun";

// Lecturas de las cotizaciones (C2, P23, P39, P40, P47). Quien las llama ya pasó por su permiso (Cotizaciones;
// los precios, solo con él). Especificación: docs/08-desarrollo/etapas/C2-consultas-cotizaciones.md.
// Aquí: la ficha de una cotización, con sus versiones.

export type FilaVersion = {
  id: number;
  numero: string;
  version: number;
  estado: EstadoCotizacion;
  createdAt: Date;
  total: string;
  /** El descuento de la versión; "0.00" si no hubo. */
  descuento: string;
  validaHasta: string;
  esEstimado: boolean;
  tienePdf: boolean;
  /** Quién la cotizó (pulido 13.50: lo dice cada versión, en vez de "Registrada por" en Datos). */
  autor: string;
  /** El código del enlace para el cliente (pedido 47): `/c/<enlace>`. */
  enlace: string;
  /**
   * Lo cotizado, en su orden (pedido 26: se ve en la ficha, como en el PDF), con el servicio y su opción por separado
   * para mostrarla en gris debajo (como en la orden). Vacío en una reemplazada.
   */
  lineas: { servicio: string; opcion: string | null; precio: string }[];
};

/** Las versiones de una cotización, de la más nueva a la más vieja, con sus líneas. */
async function versionesDeCotizacion(consultaId: number): Promise<FilaVersion[]> {
  const filas = await db
    .select({
      id: cotizacion.id,
      numero: cotizacion.numero,
      version: cotizacion.version,
      estado: cotizacion.estado,
      createdAt: cotizacion.createdAt,
      total: cotizacion.total,
      descuento: cotizacion.descuento,
      validaHasta: cotizacion.validaHasta,
      esEstimado: cotizacion.esEstimado,
      pdf: cotizacion.pdfArchivoId,
      autor: usuario.name,
      enlace: cotizacion.enlace,
    })
    .from(cotizacion)
    .innerJoin(usuario, eq(cotizacion.createdBy, usuario.id))
    .where(eq(cotizacion.consultaId, consultaId))
    .orderBy(desc(cotizacion.version), desc(cotizacion.id));
  // Las líneas, en una sola consulta y solo de las que las muestran: una reemplazada ya no vale y se ve solo su total
  const conLineas = filas.filter((f) => f.estado !== "reemplazada").map((f) => f.id);
  const porVersion = new Map<number, FilaVersion["lineas"]>();
  if (conLineas.length > 0) {
    const lineas = await db
      .select({ cotizacionId: cotizacionLinea.cotizacionId, descripcion: cotizacionLinea.descripcion, opcion: variante.nombre, precio: cotizacionLinea.precio })
      .from(cotizacionLinea)
      .leftJoin(variante, eq(variante.id, cotizacionLinea.varianteId))
      .where(inArray(cotizacionLinea.cotizacionId, conLineas))
      .orderBy(asc(cotizacionLinea.orden), asc(cotizacionLinea.id));
    for (const { cotizacionId, descripcion, opcion, precio } of lineas) {
      porVersion.set(cotizacionId, [...(porVersion.get(cotizacionId) ?? []), { ...partirDescripcion(descripcion, opcion ?? ""), precio }]);
    }
  }
  return filas.map(({ pdf, ...f }) => ({ ...f, tienePdf: pdf !== null, lineas: porVersion.get(f.id) ?? [] }));
}

export type DetalleCotizacion = {
  id: number;
  numero: string;
  /** Sin registrar (P31b): null, y el nombre y el WhatsApp son los del interesado. */
  clienteId: number | null;
  cliente: string;
  telefono: string;
  /** Para enlazar a su ficha (pedido 51); null en la de un interesado. */
  vehiculoId: number | null;
  placa: string | null;
  /** Marca y modelo, año y color: lo que se sepa (DatosVehiculo). Del interesado, lo que se escribió ("Hilux blanca"). */
  detalle: (string | number)[];
  /** De un interesado (P31b): todavía no está en Clientes; se registra al reservar. */
  interesado: boolean;
  /** La foto del vehículo que se tomó al cotizar (P31b), privada. */
  foto: UrlsFoto | null;
  tamano: string;
  estado: EstadoConsulta;
  /** Aceptada sin una reserva activa (pedido 31). */
  sinFecha: boolean;
  motivoPerdida: MotivoPerdida | null;
  detallePerdida: string | null;
  /** Para nombrar el vehículo en el mensaje de WhatsApp (pedido 47). */
  marca: string | null;
  modelo: string | null;
  versiones: FilaVersion[];
};

/** Una cotización con sus versiones, o null si no existe o no tiene ninguna (una consulta de antes sin cotizar). */
export async function obtenerCotizacion(id: number): Promise<DetalleCotizacion | null> {
  const [[c], versiones] = await Promise.all([
    db
      .select({
        id: consulta.id,
        clienteId: consulta.clienteId,
        cliente: nombreDeQuien,
        telefono: telefonoDeQuien,
        vehiculoId: consulta.vehiculoId,
        interesado: esInteresado,
        delInteresado: consulta.interesadoVehiculo,
        placa: vehiculo.placa,
        marca: vehiculo.marca,
        modelo: vehiculo.modelo,
        anio: vehiculo.anio,
        color: vehiculo.color,
        tamano: tamanoVehiculo.nombre,
        estado: consulta.estado,
        sinFecha,
        motivoPerdida: consulta.motivoPerdida,
        detallePerdida: consulta.detallePerdida,
      })
      .from(consulta)
      .leftJoin(cliente, eq(consulta.clienteId, cliente.id))
      .leftJoin(vehiculo, eq(consulta.vehiculoId, vehiculo.id))
      .innerJoin(tamanoVehiculo, eq(tamanoVehiculo.id, tamanoDeLaConsulta))
      .where(eq(consulta.id, id)),
    versionesDeCotizacion(id),
  ]);
  if (!c || versiones.length === 0) return null;
  const { marca, modelo, anio, color, delInteresado, ...datos } = c;
  return {
    ...datos,
    marca,
    modelo,
    numero: versiones[0].numero,
    detalle: c.interesado ? (delInteresado ? [delInteresado] : []) : detalleVehiculo({ marca, modelo, anio, color }),
    foto: await fotoDeConsulta(id),
    versiones,
  };
}

/** La primera foto de la consulta (P31b: la del vehículo del interesado), con sus enlaces firmados; null si no tiene. */
export async function fotoDeConsulta(consultaId: number): Promise<UrlsFoto | null> {
  const [f] = await db
    .select({ clave: archivo.clave, miniaturaClave: archivo.miniaturaClave, ancho: archivo.ancho, alto: archivo.alto })
    .from(consultaArchivo)
    .innerJoin(archivo, eq(consultaArchivo.archivoId, archivo.id))
    .where(eq(consultaArchivo.consultaId, consultaId))
    .orderBy(asc(consultaArchivo.orden))
    .limit(1);
  return f ? urlsFotoPrivada(f) : null;
}
