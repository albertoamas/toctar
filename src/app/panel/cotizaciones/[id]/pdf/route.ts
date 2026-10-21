import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { db } from "@/db";
import { archivo, cotizacion } from "@/db/esquema";
import { urlArchivoPrivado } from "@/lib/almacenamiento";
import { exigirModulo } from "@/lib/sesion";
import { nombreArchivoPdf } from "@/modulos/cotizaciones/reglas";

// HU-26: el PDF de una cotización. Solo el dueño (RN-01). Lleva al enlace firmado del bucket privado (15 minutos):
// el PDF no queda en ninguna dirección pública. `?descargar=1` lo baja en vez de abrirlo.
export async function GET(peticion: Request, { params }: RouteContext<"/panel/cotizaciones/[id]/pdf">) {
  await exigirModulo("cotizaciones");
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  const [c] = await db
    .select({ numero: cotizacion.numero, version: cotizacion.version, clave: archivo.clave })
    .from(cotizacion)
    .innerJoin(archivo, eq(cotizacion.pdfArchivoId, archivo.id))
    .where(eq(cotizacion.id, Number(id)));
  if (!c) notFound();
  const descargar = new URL(peticion.url).searchParams.get("descargar") === "1";
  redirect(await urlArchivoPrivado(c.clave, { nombre: nombreArchivoPdf(c.numero, c.version), descargar }));
}
