import "server-only";
import { and, asc, desc, eq, like } from "drizzle-orm";
import { db } from "@/db";
import {
  archivo,
  cliente,
  consulta,
  consultaArchivo,
  cotizacion,
  cotizacionFoto,
  cotizacionLinea,
  servicio,
  tamanoVehiculo,
  variante,
  vehiculo,
} from "@/db/esquema";
import type { Canal, EstadoConsulta } from "@/db/esquema/consultas";
import type { EstadoCotizacion } from "@/db/esquema/cotizaciones";
import { urlsFotoPrivada, type UrlsFoto } from "@/lib/fotos";
import { preciosVigentes } from "@/modulos/catalogo/consultas";
import type { Monto } from "@/modulos/catalogo/reglas";
import { obtenerParametros } from "@/modulos/configuracion/consultas";
import { descripcionLinea, fechaValidez, precioSugerido, type Sugerencia } from "./reglas";

// Lecturas de las cotizaciones (HU-25). Las de montos solo las llama quien pasó por exigirModulo("cotizaciones"): el
// dueño (RN-01). `cotizacionesDeConsulta` también la usa el encargado, sin montos.

export type OpcionServicio = {
  varianteId: number;
  servicio: string;
  variante: string;
  descripcion: string;
  sugerencia: Sugerencia;
};

type BaseCotizacion = {
  numero: string;
  version: number;
  lineas: { varianteId: number; precio: string }[];
  descuento: string;
  adelanto: string;
  esEstimado: boolean;
  fotos: number[];
};

export type DatosParaCotizar = {
  consultaId: number;
  estado: EstadoConsulta;
  cliente: string;
  placa: string;
  tamanoId: number;
  tamano: string;
  canal: Canal;
  opciones: OpcionServicio[];
  fotos: (UrlsFoto & { id: number })[];
  /** Valores con los que arranca el formulario: los de Configuración, o los de la versión que se corrige. */
  inicial: { validaHasta: string; adelanto: string; esEstimado: boolean; descuento: string; lineas: { varianteId: number; precio: string }[]; fotos: number[] };
  /** La versión que se corrige (vigente), si llegó `desde`, y su id. */
  desde: BaseCotizacion | null;
  desdeId: number | null;
  /** `desde` es una versión de esta consulta ya reemplazada: se avisa que ya fue corregida. */
  desdeReemplazado: boolean;
  /** Ya tiene una cotización vigente: entonces solo se corrige. */
  vigenteId: number | null;
};

/** Todo lo que hace falta para cotizar una consulta, o null si no existe. `desde`: la versión que se corrige. */
export async function datosParaCotizar(consultaId: number, desdeId: number | null): Promise<DatosParaCotizar | null> {
  const [c] = await db
    .select({
      consultaId: consulta.id,
      estado: consulta.estado,
      cliente: cliente.nombre,
      placa: vehiculo.placa,
      tamanoId: vehiculo.tamanoId,
      tamano: tamanoVehiculo.nombre,
      canal: consulta.canal,
    })
    .from(consulta)
    .innerJoin(cliente, eq(consulta.clienteId, cliente.id))
    .innerJoin(vehiculo, eq(consulta.vehiculoId, vehiculo.id))
    .innerJoin(tamanoVehiculo, eq(vehiculo.tamanoId, tamanoVehiculo.id))
    .where(eq(consulta.id, consultaId));
  if (!c) return null;

  const [variantes, fotos, parametros, [vigente], desde, [reemplazado]] = await Promise.all([
    db
      .select({ varianteId: variante.id, servicio: servicio.nombre, variante: variante.nombre })
      .from(variante)
      .innerJoin(servicio, eq(variante.servicioId, servicio.id))
      .where(and(eq(variante.activo, true), eq(servicio.activo, true)))
      .orderBy(asc(servicio.orden), asc(servicio.id), asc(variante.orden), asc(variante.id)),
    db
      .select({ id: archivo.id, clave: archivo.clave, miniaturaClave: archivo.miniaturaClave, ancho: archivo.ancho, alto: archivo.alto })
      .from(consultaArchivo)
      .innerJoin(archivo, eq(consultaArchivo.archivoId, archivo.id))
      .where(and(eq(consultaArchivo.consultaId, consultaId), like(archivo.tipoMime, "image/%")))
      .orderBy(asc(consultaArchivo.orden)),
    obtenerParametros(),
    db
      .select({ id: cotizacion.id })
      .from(cotizacion)
      .where(and(eq(cotizacion.consultaId, consultaId), eq(cotizacion.estado, "enviada"))),
    desdeId ? baseDeVersion(consultaId, desdeId) : null,
    desdeId
      ? db
          .select({ id: cotizacion.id })
          .from(cotizacion)
          .where(and(eq(cotizacion.id, desdeId), eq(cotizacion.consultaId, consultaId), eq(cotizacion.estado, "reemplazada")))
      : [],
  ]);

  const [vigentes, fotosFirmadas] = await Promise.all([
    preciosVigentes(variantes.map((v) => v.varianteId)),
    Promise.all(fotos.map(async (f) => ({ id: f.id, ...(await urlsFotoPrivada(f)) }))),
  ]);
  const porVariante = new Map<number, Map<number, Monto>>();
  for (const p of vigentes) {
    if (!porVariante.has(p.varianteId)) porVariante.set(p.varianteId, new Map());
    porVariante.get(p.varianteId)!.set(p.tamanoId, p.monto);
  }
  const opciones = variantes.map((v) => ({
    ...v,
    descripcion: descripcionLinea(v.servicio, v.variante),
    sugerencia: precioSugerido(porVariante.get(v.varianteId) ?? new Map(), c.tamanoId),
  }));

  const inicial = desde
    ? {
        validaHasta: fechaValidez(new Date(), parametros.validez_cotizacion_dias),
        adelanto: desde.adelanto,
        esEstimado: desde.esEstimado,
        descuento: desde.descuento,
        // Una variante que ya no se ofrece no vuelve: se cotiza de nuevo
        lineas: desde.lineas.filter((l) => opciones.some((o) => o.varianteId === l.varianteId)),
        fotos: desde.fotos.filter((f) => fotos.some((x) => x.id === f)),
      }
    : {
        validaHasta: fechaValidez(new Date(), parametros.validez_cotizacion_dias),
        adelanto: parametros.adelanto_sugerido.toFixed(2),
        // Por WhatsApp se cotiza por fotos: es un estimado (RN-03)
        esEstimado: c.canal === "whatsapp",
        descuento: "0.00",
        lineas: [],
        fotos: [],
      };

  return {
    ...c,
    opciones,
    fotos: fotosFirmadas,
    inicial,
    desde,
    desdeId: desde ? desdeId : null,
    desdeReemplazado: !!reemplazado,
    vigenteId: vigente?.id ?? null,
  };
}

/** Una versión vigente de esa consulta, para corregirla; null si no existe o ya fue reemplazada. */
async function baseDeVersion(consultaId: number, id: number): Promise<BaseCotizacion | null> {
  const [c] = await db
    .select({
      numero: cotizacion.numero,
      version: cotizacion.version,
      descuento: cotizacion.descuento,
      adelanto: cotizacion.adelantoSugerido,
      esEstimado: cotizacion.esEstimado,
    })
    .from(cotizacion)
    .where(and(eq(cotizacion.id, id), eq(cotizacion.consultaId, consultaId), eq(cotizacion.estado, "enviada")));
  if (!c) return null;
  const [lineas, fotos] = await Promise.all([
    db
      .select({ varianteId: cotizacionLinea.varianteId, precio: cotizacionLinea.precio })
      .from(cotizacionLinea)
      .where(eq(cotizacionLinea.cotizacionId, id))
      .orderBy(asc(cotizacionLinea.orden)),
    db.select({ id: cotizacionFoto.archivoId }).from(cotizacionFoto).where(eq(cotizacionFoto.cotizacionId, id)).orderBy(asc(cotizacionFoto.orden)),
  ]);
  return { ...c, lineas, fotos: fotos.map((f) => f.id) };
}

export type FilaCotizacion = {
  id: number;
  numero: string;
  version: number;
  estado: EstadoCotizacion;
  createdAt: Date;
  /** Solo para el dueño (RN-01): al encargado le llega sin montos. */
  montos: { total: string; validaHasta: string; esEstimado: boolean } | null;
};

/** Las versiones de las cotizaciones de una consulta, de la más nueva a la más vieja. */
export async function cotizacionesDeConsulta(consultaId: number, conMontos: boolean): Promise<FilaCotizacion[]> {
  const filas = await db
    .select({
      id: cotizacion.id,
      numero: cotizacion.numero,
      version: cotizacion.version,
      estado: cotizacion.estado,
      createdAt: cotizacion.createdAt,
      total: cotizacion.total,
      validaHasta: cotizacion.validaHasta,
      esEstimado: cotizacion.esEstimado,
    })
    .from(cotizacion)
    .where(eq(cotizacion.consultaId, consultaId))
    .orderBy(desc(cotizacion.createdAt), desc(cotizacion.id));
  return filas.map(({ total, validaHasta, esEstimado, ...f }) => ({ ...f, montos: conMontos ? { total, validaHasta, esEstimado } : null }));
}

/** Si la consulta tiene alguna cotización (para reabrirla en "cotizado"). */
export async function tieneCotizacion(consultaId: number): Promise<boolean> {
  const [c] = await db.select({ id: cotizacion.id }).from(cotizacion).where(eq(cotizacion.consultaId, consultaId)).limit(1);
  return !!c;
}
