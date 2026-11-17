"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect, RedirectType } from "next/navigation";
import { db } from "@/db";
import { auditoria, trabajo, trabajoFoto } from "@/db/esquema";
import { copiarFotoAlPublico, eliminarFoto } from "@/lib/fotos";
import { erroresDe, indiceUnicoViolado, type EstadoFormulario } from "@/lib/formularios";
import { exigirAccion } from "@/lib/sesion";
import { agregarAGaleria } from "@/modulos/sitio/agregar-a-galeria";
import { galeriaCambiada } from "@/modulos/sitio/galeria-cambiada";
import { publicadaDeOrden, serviciosDeOrden } from "../consultas";
import { esquemaPublicar } from "../esquemas";
import { esFotoDeAntes } from "../reglas";
import { conDesde, sinElTrabajo } from "@/lib/volver";
import { RECARGA } from "./comun";

// Órdenes (C4): Publicar el trabajo en la galería del sitio (P27).
// Entra el dueño o el encargado con "Órdenes" (pedido 32). Especificación: docs/08-desarrollo/etapas/C4-taller-entrega.md.

const YA_PUBLICADA = "Esta orden ya se publicó en la galería. La ordenas u ocultas en Sitio web > Galería.";

/**
 * Publica en la galería del sitio las fotos de una orden entregada (HU-41, RF-44): solo el dueño (RN-01) y una sola vez
 * por orden (índice único; quitada de la galería, se puede volver a publicar). La de después (de esa etapa) y, si se
 * eligió, la de antes (del ingreso o de antes), las dos de esta orden; el servicio, uno de los de la orden que siga
 * activo (los que deja elegir la galería). Las fotos se copian al bucket público (RNF-05): las de la orden siguen
 * privadas y quitar el trabajo de la galería borra solo las copias. Si algo falla después de copiar, las copias se borran.
 */
export async function publicarEnGaleria(_previo: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const usuario = await exigirAccion("publicar_en_galeria");
  const valores = Object.fromEntries(["servicioId", "descripcion", "fotoDespues", "fotoAntes"].map((c) => [c, String(datos.get(c) ?? "")]));
  const r = esquemaPublicar.safeParse({ ...valores, id: datos.get("id"), sinPlacaNiCaras: datos.get("sinPlacaNiCaras") ?? undefined });
  if (!r.success) {
    const errores = erroresDe(r.error);
    return errores.id ? { mensaje: RECARGA } : { errores, valores };
  }
  const { id, fotoDespues, fotoAntes, servicioId, descripcion } = r.data;

  const [t] = await db.select({ estado: trabajo.estado }).from(trabajo).where(eq(trabajo.id, id));
  if (!t) return { mensaje: "Esa orden ya no existe." };
  if (t.estado !== "entregado") return { mensaje: "Se publican las fotos de una orden entregada." };
  const [fotos, servicios, publicada] = await Promise.all([
    db
      .select({ id: trabajoFoto.id, etapa: trabajoFoto.etapa, archivoId: trabajoFoto.archivoId })
      .from(trabajoFoto)
      .where(and(eq(trabajoFoto.trabajoId, id), inArray(trabajoFoto.id, fotoAntes ? [fotoDespues, fotoAntes] : [fotoDespues]))),
    serviciosDeOrden(id, { soloActivos: true }),
    publicadaDeOrden(id),
  ]);
  if (publicada) return { mensaje: YA_PUBLICADA };
  const despues = fotos.find((f) => f.id === fotoDespues && f.etapa === "despues");
  const antes = fotoAntes ? fotos.find((f) => f.id === fotoAntes && esFotoDeAntes(f.etapa)) : null;
  if (!despues) return { errores: { fotoDespues: "Elige la foto de después." }, valores };
  if (antes === undefined) return { errores: { fotoAntes: "Elige la foto de antes entre las del ingreso y las de antes." }, valores };
  if (!servicios.some((s) => s.id === servicioId)) return { errores: { servicioId: "Elige uno de los servicios de la orden." }, valores };

  const autorId = Number(usuario.id);
  // Las dos copias a la vez; si una falla, se borra la que salió
  const copiadas = await Promise.allSettled((antes ? [despues, antes] : [despues]).map((f) => copiarFotoAlPublico(f.archivoId, { carpeta: "galeria", autorId })));
  const copias = copiadas.flatMap((c) => (c.status === "fulfilled" ? [c.value] : []));
  try {
    const fallo = copiadas.find((c) => c.status === "rejected");
    if (fallo) throw fallo.reason;
    await db.transaction(async (tx) => {
      const itemId = await agregarAGaleria({ servicioId, descripcion, fotoDespuesId: copias[0], fotoAntesId: copias[1] ?? null, trabajoId: id, createdBy: autorId }, tx);
      await tx.insert(auditoria).values({ usuarioId: autorId, entidad: "trabajo", entidadId: id, accion: "publicar_en_galeria", datos: { galeriaItemId: itemId } });
    });
  } catch (error) {
    await Promise.allSettled(copias.map((c) => eliminarFoto(c)));
    // Otro envío la publicó entretanto: el índice único frena el segundo
    if (indiceUnicoViolado(error) !== null) return { mensaje: YA_PUBLICADA };
    console.error("No se pudo publicar en la galería", error);
    return { mensaje: "No se pudo publicar. Revisa tu conexión e intenta de nuevo.", valores };
  }

  galeriaCambiada();
  revalidatePath(`/panel/ordenes/${id}`);
  redirect(conDesde(`/panel/ordenes/${id}?publicado=1`, sinElTrabajo(String(datos.get("volver") ?? ""), id)), RedirectType.replace);
}
