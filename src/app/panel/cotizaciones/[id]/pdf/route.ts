import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { db } from "@/db";
import { archivo, cotizacion } from "@/db/esquema";
import { disposicion, flujoArchivoPrivado, urlArchivoPrivado } from "@/lib/almacenamiento";
import { exigirModulo } from "@/lib/sesion";
import { nombreArchivoPdf } from "@/modulos/cotizaciones/reglas";

// HU-26: el PDF de una cotización. Solo el dueño (RN-01). Lleva al enlace firmado del bucket privado (15 minutos):
// el PDF no queda en ninguna dirección pública. `?descargar=1` lo baja en vez de abrirlo.
// HU-27: `?para=compartir` entrega el archivo desde la app, para el menú de compartir del teléfono: así el navegador lo
// lee sin pedirlo al almacenamiento (que necesitaría CORS de lectura) y sin que pase por otra dirección.
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
  const busqueda = new URL(peticion.url).searchParams;
  const nombre = nombreArchivoPdf(c.numero, c.version);
  if (busqueda.get("para") === "compartir") {
    // Como flujo: el servidor no tiene el PDF entero en memoria. Si falta en el almacenamiento, no se encuentra
    const flujo = await flujoArchivoPrivado(c.clave);
    if (!flujo) notFound();
    return new Response(flujo, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": disposicion(nombre),
        // Datos de un cliente: no se guardan en cachés intermedias
        "Cache-Control": "private, no-store",
      },
    });
  }
  redirect(await urlArchivoPrivado(c.clave, { nombre, descargar: busqueda.get("descargar") === "1" }));
}
