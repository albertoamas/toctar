import "server-only";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { renderToBuffer } from "@react-pdf/renderer";
import { asc, eq } from "drizzle-orm";
import sharp, { type SharpOptions } from "sharp";
import { db } from "@/db";
import { archivo, cotizacion, cotizacionFoto, cotizacionLinea, negocio } from "@/db/esquema";
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

/** Todo lo que lleva el PDF: lo de la cotización y la copia de cliente, vehículo y negocio de cuando se cotizó (D-4). */
async function datosDelPdf(cotizacionId: number): Promise<DatosPdf> {
  const [[c], lineas, fotos, [logoNegocio]] = await Promise.all([
    db
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
        documento: cotizacion.datosDocumento,
      })
      .from(cotizacion)
      .where(eq(cotizacion.id, cotizacionId)),
    db
      .select({ descripcion: cotizacionLinea.descripcion, precio: cotizacionLinea.precio })
      .from(cotizacionLinea)
      .where(eq(cotizacionLinea.cotizacionId, cotizacionId))
      .orderBy(asc(cotizacionLinea.orden)),
    db
      .select({ clave: archivo.clave, privado: archivo.privado })
      .from(cotizacionFoto)
      .innerJoin(archivo, eq(cotizacionFoto.archivoId, archivo.id))
      .where(eq(cotizacionFoto.cotizacionId, cotizacionId))
      .orderBy(asc(cotizacionFoto.orden)),
    // El logo es una imagen: no se copia. Es el que está cargado hoy en Configuración
    db.select({ clave: archivo.clave, privado: archivo.privado }).from(negocio).innerJoin(archivo, eq(negocio.logoArchivoId, archivo.id)).where(eq(negocio.id, 1)),
  ]);
  if (!c) throw new Error(`No existe la cotización ${cotizacionId}.`);
  const { cliente, vehiculo, negocio: datosNegocio } = c.documento;

  const visibilidad = (privado: boolean) => (privado ? "privado" : "publico");
  const [logo, imagenes] = await Promise.all([
    logoNegocio ? leerArchivo(logoNegocio.clave, visibilidad(logoNegocio.privado)).then((b) => comoPng(b)) : readFile(LOGO_MARCA).then((b) => comoPng(b, { density: 300 })),
    Promise.all(fotos.map(async (f) => comoJpeg(await leerArchivo(f.clave, visibilidad(f.privado))))),
  ]);

  return {
    negocio: {
      nombre: datosNegocio.nombre,
      razonSocial: datosNegocio.razonSocial,
      nit: datosNegocio.nit,
      whatsapp: datosNegocio.whatsapp ? formatearWhatsApp(datosNegocio.whatsapp) : null,
      direccion: datosNegocio.direccion,
      logo,
    },
    numero: c.numero,
    version: c.version,
    fecha: formatearFecha(fechaEnBolivia(c.createdAt)),
    validaHasta: formatearFecha(c.validaHasta),
    cliente: { nombre: cliente.nombre, whatsapp: formatearWhatsApp(cliente.telefono) },
    vehiculo,
    lineas,
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
 * Genera el PDF y lo deja en la cotización, si todavía no tiene. Si otro pedido lo generó primero, queda ese (el que
 * pudo haberse enviado) y el nuevo se borra.
 */
export async function generarPdf(cotizacionId: number, autorId: number): Promise<void> {
  const d = await datosDelPdf(cotizacionId);
  const contenido = await renderToBuffer(PdfCotizacion({ d }));

  // La clave nunca se reutiliza: el PDF enviado no se pisa (RN-02)
  const clave = await subirArchivo(`cotizaciones/${d.numero}-v${d.version}-${randomUUID()}.pdf`, contenido, "application/pdf", "privado");
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
  // Perdió la carrera: la cotización ya tiene su PDF. Si el borrado del sobrante falla, no es un error para quien pidió
  if (!asignado) await borrarArchivo(clave, "privado").catch((error) => console.error(`No se pudo borrar el PDF sobrante ${clave}:`, error));
}
