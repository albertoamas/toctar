import "server-only";

import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { cliente, consulta, cotizacion, cotizacionLinea, negocio, sucursal, tamanoVehiculo, vehiculo } from "@/db/esquema";
import type { EstadoConsulta } from "@/db/esquema/consultas";
import type { DatosDocumento } from "@/db/esquema/cotizaciones";
import { detalleVehiculo, nombreVehiculo } from "@/modulos/clientes/reglas";
import { nombreDeQuien, placaDeQuien, tamanoDeLaConsulta, telefonoDeQuien, tieneVersiones } from "./comun";
import { OpcionServicio, inicioCotizacion, opcionesDeServicio } from "./servicios";

// Lecturas de las cotizaciones (C2, P23, P39, P40, P47). Quien las llama ya pasó por su permiso (Cotizaciones;
// los precios, solo con él). Especificación: docs/08-desarrollo/etapas/C2-consultas-cotizaciones.md.
// Aquí: los datos para una versión nueva (P39) y los del documento, el PDF (P47).

type BaseVersion = {
  numero: string;
  version: number;
  /** El total guardado: el que dice su PDF. */
  total: string;
  lineas: { varianteId: number; precio: string }[];
  descuento: string;
  adelanto: string;
  esEstimado: boolean;
};

export type DatosNuevaVersion = {
  consultaId: number;
  estado: EstadoConsulta;
  cliente: string;
  telefono: string;
  /** La del vehículo o la que se anotó del interesado (P31b); null en las de un interesado de antes del 22/11. */
  placa: string | null;
  /** Marca y modelo, año, color: lo que se sepa. */
  detalle: (string | number)[];
  tamano: string;
  opciones: OpcionServicio[];
  /** Los servicios de la versión que se reemplaza que ya no se ofrecen (no vuelven): por qué el total arranca distinto. */
  quitados: number;
  /** Valores con los que arranca el formulario: los de la versión que se reemplaza, con la validez de hoy. */
  inicial: { validaHasta: string; adelanto: string; esEstimado: boolean; descuento: string; lineas: { varianteId: number; precio: string }[] };
  /** La versión que se reemplaza (la vigente), si `desde` lo es. */
  desde: (BaseVersion & { id: number }) | null;
  /** `desde` es una versión de esta cotización ya reemplazada: se avisa que ya hay otra. */
  desdeReemplazado: boolean;
  /** La versión vigente, para llevar a ella si `desde` no lo es. */
  vigenteId: number | null;
};

/** Todo lo que hace falta para la versión nueva de una cotización, o null si no existe o no tiene versiones. */
export async function datosNuevaVersion(consultaId: number, desdeId: number | null): Promise<DatosNuevaVersion | null> {
  const [c] = await db
    .select({
      consultaId: consulta.id,
      estado: consulta.estado,
      cliente: nombreDeQuien,
      telefono: telefonoDeQuien,
      placa: placaDeQuien,
      marca: vehiculo.marca,
      modelo: vehiculo.modelo,
      anio: vehiculo.anio,
      color: vehiculo.color,
      tamanoId: tamanoDeLaConsulta,
      tamano: tamanoVehiculo.nombre,
    })
    .from(consulta)
    .leftJoin(cliente, eq(consulta.clienteId, cliente.id))
    .leftJoin(vehiculo, eq(consulta.vehiculoId, vehiculo.id))
    .innerJoin(tamanoVehiculo, eq(tamanoVehiculo.id, tamanoDeLaConsulta))
    .where(and(eq(consulta.id, consultaId), tieneVersiones));
  if (!c) return null;

  const [opciones, inicio, [vigente], desde, [pedida]] = await Promise.all([
    opcionesDeServicio(c.tamanoId),
    inicioCotizacion(),
    db
      .select({ id: cotizacion.id })
      .from(cotizacion)
      .where(and(eq(cotizacion.consultaId, consultaId), eq(cotizacion.estado, "enviada"))),
    desdeId ? baseDeVersion(consultaId, desdeId) : null,
    desdeId
      ? db
          .select({ estado: cotizacion.estado })
          .from(cotizacion)
          .where(and(eq(cotizacion.id, desdeId), eq(cotizacion.consultaId, consultaId)))
      : [],
  ]);

  return {
    consultaId: c.consultaId,
    estado: c.estado,
    cliente: c.cliente,
    telefono: c.telefono,
    placa: c.placa,
    detalle: detalleVehiculo(c),
    tamano: c.tamano,
    opciones,
    quitados: desde ? desde.lineas.filter((l) => !opciones.some((o) => o.varianteId === l.varianteId)).length : 0,
    inicial: desde
      ? {
          validaHasta: inicio.validaHasta,
          adelanto: desde.adelanto,
          esEstimado: desde.esEstimado,
          descuento: desde.descuento,
          // Una variante que ya no se ofrece no vuelve: se cotiza de nuevo
          lineas: desde.lineas.filter((l) => opciones.some((o) => o.varianteId === l.varianteId)),
        }
      : { ...inicio, esEstimado: false, descuento: "0.00", lineas: [] },
    desde: desde && desdeId ? { ...desde, id: desdeId } : null,
    desdeReemplazado: pedida?.estado === "reemplazada",
    vigenteId: vigente?.id ?? null,
  };
}

/** Una versión vigente de esa cotización, para reemplazarla; null si no existe o ya fue reemplazada. */
async function baseDeVersion(consultaId: number, id: number): Promise<BaseVersion | null> {
  const [c] = await db
    .select({
      numero: cotizacion.numero,
      version: cotizacion.version,
      total: cotizacion.total,
      descuento: cotizacion.descuento,
      adelanto: cotizacion.adelantoSugerido,
      esEstimado: cotizacion.esEstimado,
    })
    .from(cotizacion)
    .where(and(eq(cotizacion.id, id), eq(cotizacion.consultaId, consultaId), eq(cotizacion.estado, "enviada")));
  if (!c) return null;
  const lineas = await db
    .select({ varianteId: cotizacionLinea.varianteId, precio: cotizacionLinea.precio })
    .from(cotizacionLinea)
    .where(eq(cotizacionLinea.cotizacionId, id))
    .orderBy(asc(cotizacionLinea.orden));
  return { ...c, lineas };
}

/**
 * Cliente, vehículo y negocio como están al cotizar: se copian en la cotización (D-4) y de ahí sale su PDF, aunque se
 * genere después o los datos cambien (RN-02). `base`: la transacción que acaba de crear al cliente o al vehículo. Las
 * lecturas van una tras otra: una transacción es una sola conexión, y pg no admite dos consultas a la vez en ella.
 */
export async function datosDocumento(consultaId: number, base: Pick<typeof db, "select"> = db): Promise<DatosDocumento> {
  const [c] = await base
    .select({
      nombre: nombreDeQuien,
      telefono: telefonoDeQuien,
      placa: placaDeQuien,
      marca: vehiculo.marca,
      modelo: vehiculo.modelo,
      color: vehiculo.color,
      tamano: tamanoVehiculo.nombre,
    })
    .from(consulta)
    .leftJoin(cliente, eq(consulta.clienteId, cliente.id))
    .leftJoin(vehiculo, eq(consulta.vehiculoId, vehiculo.id))
    .innerJoin(tamanoVehiculo, eq(tamanoVehiculo.id, tamanoDeLaConsulta))
    .where(eq(consulta.id, consultaId));
  const [n] = await base.select({ nombre: negocio.nombre, razonSocial: negocio.razonSocial, nit: negocio.nit }).from(negocio).where(eq(negocio.id, 1));
  const [s] = await base
    .select({ whatsapp: sucursal.telefonoWhatsapp, direccion: sucursal.direccion })
    .from(sucursal)
    .where(eq(sucursal.activo, true))
    .orderBy(asc(sucursal.id))
    .limit(1);
  if (!c) throw new Error(`No existe la cotización ${consultaId}.`);
  if (!n) throw new Error("Faltan los datos del negocio: falta aplicar la migración 0003_datos_negocio.");
  return {
    cliente: { nombre: c.nombre, telefono: c.telefono },
    // De un interesado (P31b): la placa que se anotó, sin marca ni modelo
    vehiculo: {
      placa: c.placa ?? "",
      descripcion: [nombreVehiculo(c), c.color].filter(Boolean).join(", ") || null,
      tamano: c.tamano,
    },
    negocio: { ...n, whatsapp: s?.whatsapp ?? null, direccion: s?.direccion ?? null },
  };
}
