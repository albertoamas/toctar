import { and, eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { db } from "@/db";
import { archivo, cotizacion } from "@/db/esquema";
import { respuestaPdfPrivado, urlArchivoPrivado } from "@/lib/almacenamiento";
import { exigirAccion } from "@/lib/sesion";
import { nombreArchivoPdf } from "@/modulos/cotizaciones/reglas";

// HU-26: el PDF de una versión de la cotización. El dueño o el encargado con "Cotizaciones" (pedido 24). Lleva al enlace
// firmado del bucket privado (15 minutos): el PDF no queda en ninguna dirección pública. `?descargar=1` lo baja en vez de
// abrirlo. La versión tiene que ser de esa cotización (pedido 23: la dirección lleva las dos).
// HU-27: `?para=compartir` entrega el archivo desde la app, para el menú de compartir del teléfono: así el navegador lo
// lee sin pedirlo al almacenamiento (que necesitaría CORS de lectura) y sin que pase por otra dirección.
export async function GET(peticion: Request, { params }: RouteContext<"/panel/cotizaciones/[id]/pdf/[version]">) {
  await exigirAccion("cotizar");
  const { id, version } = await params;
  if (!/^\d+$/.test(id) || !/^\d+$/.test(version)) notFound();
  const [c] = await db
    .select({ numero: cotizacion.numero, version: cotizacion.version, clave: archivo.clave })
    .from(cotizacion)
    .innerJoin(archivo, eq(cotizacion.pdfArchivoId, archivo.id))
    .where(and(eq(cotizacion.id, Number(version)), eq(cotizacion.consultaId, Number(id))));
  if (!c) notFound();
  const busqueda = new URL(peticion.url).searchParams;
  const nombre = nombreArchivoPdf(c.numero, c.version);
  if (busqueda.get("para") === "compartir") {
    // Si falta en el almacenamiento, no se encuentra
    const respuesta = await respuestaPdfPrivado(c.clave, nombre);
    if (!respuesta) notFound();
    return respuesta;
  }
  redirect(await urlArchivoPrivado(c.clave, { nombre, descargar: busqueda.get("descargar") === "1" }));
}
