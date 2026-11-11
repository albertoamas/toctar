import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { db } from "@/db";
import { archivo, cotizacion } from "@/db/esquema";
import { disposicion, flujoArchivoPrivado } from "@/lib/almacenamiento";
import { fechaEnBolivia } from "@/lib/fechas";
import { esCodigoEnlace, estadoEnlace, nombreArchivoPdf, rutaEnlace } from "@/modulos/cotizaciones/reglas";

// Pedido 47 (docs/08-desarrollo/etapas/P47-enviar-cotizacion.md): el enlace que se le manda al cliente por WhatsApp para
// ver el PDF de una versión de su cotización, sin cuenta. Público a propósito: lo protege el código, de 122 bits
// aleatorios (nadie lo adivina). Entrega el PDF guardado (RN-02) desde el bucket privado, a través de la app: no queda en
// ninguna dirección del almacenamiento. Si ya no vale (vencida o reemplazada), lleva a una página que lo dice, sin datos
// del cliente ni montos.
export async function GET(_peticion: Request, { params }: RouteContext<"/c/[codigo]">) {
  await connection();
  const { codigo } = await params;
  if (!esCodigoEnlace(codigo)) notFound();
  const [c] = await db
    .select({ numero: cotizacion.numero, version: cotizacion.version, estado: cotizacion.estado, validaHasta: cotizacion.validaHasta, clave: archivo.clave })
    .from(cotizacion)
    .leftJoin(archivo, eq(cotizacion.pdfArchivoId, archivo.id))
    .where(eq(cotizacion.enlace, codigo));
  if (!c) notFound();
  if (estadoEnlace(c.estado, c.validaHasta, fechaEnBolivia()) !== "vale") redirect(`${rutaEnlace(codigo)}/no-vigente`);
  // Sin PDF todavía (se está generando) o sin el archivo en el almacenamiento: no se encuentra
  const flujo = c.clave ? await flujoArchivoPrivado(c.clave) : null;
  if (!flujo) notFound();
  return new Response(flujo, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": disposicion(nombreArchivoPdf(c.numero, c.version)),
      // Datos de un cliente: ni cachés intermedias ni buscadores
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex, nofollow",
      "Referrer-Policy": "no-referrer",
    },
  });
}
