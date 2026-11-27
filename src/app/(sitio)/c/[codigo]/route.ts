import { eq, sql } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { db } from "@/db";
import { archivo, consulta, cotizacion } from "@/db/esquema";
import { respuestaPdfPrivado } from "@/lib/almacenamiento";
import { fechaEnBolivia } from "@/lib/fechas";
import { esCodigoEnlace, estadoEnlace, nombreArchivoPdf, rutaEnlace } from "@/modulos/cotizaciones/reglas";

// Pedido 47 (docs/08-desarrollo/etapas/P47-enviar-cotizacion.md): el enlace que se le manda al cliente por WhatsApp para
// ver el PDF de una versión de su cotización, sin cuenta. Público a propósito: lo protege el código, de 122 bits
// aleatorios (nadie lo adivina). Entrega el PDF guardado (RN-02) desde el bucket privado, a través de la app: no queda en
// ninguna dirección del almacenamiento. Si ya no vale (vencida, reemplazada o rechazada), lleva a una página que lo dice,
// sin datos del cliente ni montos.
export async function GET(_peticion: Request, { params }: RouteContext<"/c/[codigo]">) {
  await connection();
  const { codigo } = await params;
  if (!esCodigoEnlace(codigo)) notFound();
  const [c] = await db
    .select({
      numero: cotizacion.numero,
      version: cotizacion.version,
      estado: cotizacion.estado,
      validaHasta: cotizacion.validaHasta,
      rechazada: sql<boolean>`${consulta.estado} = 'perdido'`,
      clave: archivo.clave,
    })
    .from(cotizacion)
    .innerJoin(consulta, eq(cotizacion.consultaId, consulta.id))
    .leftJoin(archivo, eq(cotizacion.pdfArchivoId, archivo.id))
    .where(eq(cotizacion.enlace, codigo));
  if (!c) notFound();
  if (estadoEnlace(c, fechaEnBolivia()) !== "vale") redirect(`${rutaEnlace(codigo)}/no-vigente`);
  // Sin PDF todavía (se está generando) o sin el archivo en el almacenamiento: no se encuentra
  const respuesta = c.clave ? await respuestaPdfPrivado(c.clave, nombreArchivoPdf(c.numero, c.version)) : null;
  if (!respuesta) notFound();
  return respuesta;
}
