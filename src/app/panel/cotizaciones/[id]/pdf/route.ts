import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { db } from "@/db";
import { cotizacion } from "@/db/esquema";
import { exigirAccion } from "@/lib/sesion";
import { rutaPdf } from "@/modulos/cotizaciones/reglas";

// Antes del pedido 23 el PDF estaba en /panel/cotizaciones/<versión>/pdf. Un enlace guardado de entonces lleva al de
// ahora, con la cotización en la dirección (y con `?descargar=1` o `?para=compartir`, si los traía).
export async function GET(peticion: Request, { params }: RouteContext<"/panel/cotizaciones/[id]/pdf">) {
  await exigirAccion("cotizar");
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  const [c] = await db.select({ consultaId: cotizacion.consultaId }).from(cotizacion).where(eq(cotizacion.id, Number(id)));
  if (!c) notFound();
  redirect(`${rutaPdf(c.consultaId, Number(id))}${new URL(peticion.url).search}`);
}
