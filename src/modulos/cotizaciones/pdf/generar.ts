import "server-only";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { renderToBuffer } from "@react-pdf/renderer";
import { asc, eq } from "drizzle-orm";
import sharp, { type SharpOptions } from "sharp";
import { db } from "@/db";
import {
  archivo,
  cliente,
  consulta,
  cotizacion,
  cotizacionFoto,
  cotizacionLinea,
  negocio,
  sucursal,
  tamanoVehiculo,
  vehiculo,
} from "@/db/esquema";
import { borrarArchivo, leerArchivo, subirArchivo } from "@/lib/almacenamiento";
import { fechaEnBolivia, formatearFecha } from "@/lib/fechas";
import { formatearWhatsApp } from "@/lib/whatsapp";
import { PdfCotizacion, type DatosPdf, type Imagen } from "./plantilla";

// Genera y guarda el PDF de una cotización (HU-26, RF-32). Se genera una sola vez, al guardarla: después no se
// regenera, así el PDF enviado nunca cambia (RN-02). Va al bucket privado: tiene datos del cliente.

/**
 * El logo de la marca sobre claro, si el dueño no subió uno para documentos (Configuración). Sin lema: a 14 mm de alto
 * el lema no se lee (la regla de la marca pide la variante sin lema en tamaños chicos).
 */
const LOGO_MARCA = path.join(process.cwd(), "public", "marca", "toctar-horizontal-sin-lema-sobre-claro.svg");

/** react-pdf no lee WebP ni SVG: el logo pasa a PNG (transparencia) y las fotos a JPEG, achicadas para el PDF. */
async function comoPng(entrada: Buffer, opciones: SharpOptions = {}): Promise<Imagen> {
  const { data, info } = await sharp(entrada, opciones).resize({ height: 240, withoutEnlargement: true }).png().toBuffer({ resolveWithObject: true });
  return { data, format: "png", ancho: info.width, alto: info.height };
}

async function comoJpeg(entrada: Buffer): Promise<Imagen> {
  const { data, info } = await sharp(entrada)
    .rotate()
    .resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true })
    .flatten({ background: "#ffffff" })
    .jpeg({ quality: 80 })
    .toBuffer({ resolveWithObject: true });
  return { data, format: "jpg", ancho: info.width, alto: info.height };
}

/** Todo lo que lleva el PDF, leído de la base. Lo de la cotización ya está copiado (D-4); el resto, como está hoy. */
async function datosDelPdf(cotizacionId: number): Promise<DatosPdf> {
  const [c] = await db
    .select({
      numero: cotizacion.numero,
      version: cotizacion.version,
      createdAt: cotizacion.createdAt,
      validaHasta: cotizacion.validaHasta,
      subtotal: cotizacion.subtotal,
      descuento: cotizacion.descuento,
      total: cotizacion.total,
      adelanto: cotizacion.adelantoSugerido,
      esEstimado: cotizacion.esEstimado,
      formasPago: cotizacion.formasPago,
      condiciones: cotizacion.condiciones,
      garantia: cotizacion.garantia,
      cliente: cliente.nombre,
      telefono: cliente.telefono,
      placa: vehiculo.placa,
      marca: vehiculo.marca,
      modelo: vehiculo.modelo,
      color: vehiculo.color,
    })
    .from(cotizacion)
    .innerJoin(consulta, eq(cotizacion.consultaId, consulta.id))
    .innerJoin(cliente, eq(consulta.clienteId, cliente.id))
    .innerJoin(vehiculo, eq(consulta.vehiculoId, vehiculo.id))
    .where(eq(cotizacion.id, cotizacionId));
  if (!c) throw new Error(`No existe la cotización ${cotizacionId}.`);

  const [lineas, fotos, [n], [s]] = await Promise.all([
    db
      .select({ descripcion: cotizacionLinea.descripcion, precio: cotizacionLinea.precio, tamano: tamanoVehiculo.nombre })
      .from(cotizacionLinea)
      .innerJoin(tamanoVehiculo, eq(cotizacionLinea.tamanoId, tamanoVehiculo.id))
      .where(eq(cotizacionLinea.cotizacionId, cotizacionId))
      .orderBy(asc(cotizacionLinea.orden)),
    db
      .select({ clave: archivo.clave, privado: archivo.privado })
      .from(cotizacionFoto)
      .innerJoin(archivo, eq(cotizacionFoto.archivoId, archivo.id))
      .where(eq(cotizacionFoto.cotizacionId, cotizacionId))
      .orderBy(asc(cotizacionFoto.orden)),
    db
      .select({ nombre: negocio.nombre, razonSocial: negocio.razonSocial, nit: negocio.nit, logo: archivo.clave })
      .from(negocio)
      .leftJoin(archivo, eq(negocio.logoArchivoId, archivo.id))
      .where(eq(negocio.id, 1)),
    db.select({ whatsapp: sucursal.telefonoWhatsapp, direccion: sucursal.direccion }).from(sucursal).where(eq(sucursal.activo, true)).orderBy(asc(sucursal.id)).limit(1),
  ]);

  const [logo, imagenes] = await Promise.all([
    n?.logo ? leerArchivo(n.logo, "publico").then((b) => comoPng(b)) : readFile(LOGO_MARCA).then((b) => comoPng(b, { density: 300 })),
    Promise.all(fotos.map(async (f) => comoJpeg(await leerArchivo(f.clave, f.privado ? "privado" : "publico")))),
  ]);

  return {
    negocio: {
      nombre: n?.nombre ?? "TocTar Detailing",
      razonSocial: n?.razonSocial ?? null,
      nit: n?.nit ?? null,
      whatsapp: s?.whatsapp ? formatearWhatsApp(s.whatsapp) : null,
      direccion: s?.direccion ?? null,
      logo,
    },
    numero: c.numero,
    version: c.version,
    fecha: formatearFecha(fechaEnBolivia(c.createdAt)),
    validaHasta: formatearFecha(c.validaHasta),
    cliente: { nombre: c.cliente, whatsapp: formatearWhatsApp(c.telefono) },
    vehiculo: {
      placa: c.placa,
      descripcion: [[c.marca, c.modelo].filter(Boolean).join(" "), c.color].filter(Boolean).join(", ") || null,
      // El tamaño con que se cotizó (D-4), no el que tenga hoy el vehículo
      tamano: lineas[0]?.tamano ?? "",
    },
    lineas: lineas.map((l) => ({ descripcion: l.descripcion, precio: l.precio })),
    subtotal: c.subtotal,
    descuento: c.descuento,
    total: c.total,
    adelanto: c.adelanto,
    esEstimado: c.esEstimado,
    formasPago: c.formasPago,
    condiciones: c.condiciones,
    garantia: c.garantia,
    fotos: imagenes,
  };
}

/**
 * Genera el PDF y lo deja en la cotización, si todavía no tiene. Devuelve false si ya tenía uno (otro pedido lo generó
 * primero): el nuevo se borra y queda el primero, que es el que pudo haberse enviado.
 */
export async function generarPdf(cotizacionId: number, autorId: number): Promise<boolean> {
  const [c] = await db.select({ numero: cotizacion.numero, version: cotizacion.version }).from(cotizacion).where(eq(cotizacion.id, cotizacionId));
  if (!c) throw new Error(`No existe la cotización ${cotizacionId}.`);
  const contenido = await renderToBuffer(PdfCotizacion({ d: await datosDelPdf(cotizacionId) }));

  // La clave nunca se reutiliza: el PDF enviado no se pisa (RN-02)
  const clave = await subirArchivo(`cotizaciones/${c.numero}-v${c.version}-${randomUUID()}.pdf`, contenido, "application/pdf", "privado");
  let asignado: boolean;
  try {
    asignado = await db.transaction(async (tx) => {
      // Candado sobre la cotización: dos pedidos a la vez no le asignan dos PDF
      const [actual] = await tx.select({ pdf: cotizacion.pdfArchivoId }).from(cotizacion).where(eq(cotizacion.id, cotizacionId)).for("update");
      if (actual?.pdf) return false;
      const [registro] = await tx
        .insert(archivo)
        .values({ clave, tipoMime: "application/pdf", bytes: contenido.length, privado: true, createdBy: autorId })
        .returning({ id: archivo.id });
      await tx.update(cotizacion).set({ pdfArchivoId: registro.id }).where(eq(cotizacion.id, cotizacionId));
      return true;
    });
  } catch (error) {
    // Sin la fila en `archivo` nadie encontraría el PDF para borrarlo: se borra ahora
    await borrarArchivo(clave, "privado").catch(() => undefined);
    throw error;
  }
  if (!asignado) await borrarArchivo(clave, "privado");
  return asignado;
}
