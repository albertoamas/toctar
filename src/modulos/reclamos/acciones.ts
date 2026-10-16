"use server";

import { and, count, eq, gt, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { reclamo, reclamoArchivo, servicio } from "@/db/esquema";
import { codigoDeConexion } from "@/lib/conexion";
import { erroresDe, type EstadoFormulario } from "@/lib/formularios";
import { eliminarFoto, guardarFoto } from "@/lib/fotos";
import { exigirModulo } from "@/lib/sesion";
import { CAMPOS_RECLAMO, MAXIMO_FOTOS, esquemaAtender, esquemaReclamo } from "./esquemas";
import { LIMITE_POR_HORA, evaluarEnvio } from "./reglas";

// Reclamos. HU-16: la acción pública del formulario de garantía y reclamos; no pide sesión: la protegen el
// esquema, el campo trampa, el tiempo mínimo y el límite por conexión. HU-17: atenderlos desde el panel.

const ERROR_FOTO = "Cada foto debe ser JPG, PNG o WebP de hasta 5 MB.";
const MENSAJE_LIMITE = "Recibimos varios reclamos desde tu conexión. Escríbenos por WhatsApp.";

type Conexion = Pick<typeof db, "select">;

async function reclamosEnLaUltimaHora(base: Conexion, ipHash: string): Promise<number> {
  const haceUnaHora = new Date(Date.now() - 3_600_000);
  const [{ total }] = await base
    .select({ total: count() })
    .from(reclamo)
    .where(and(eq(reclamo.ipHash, ipHash), gt(reclamo.createdAt, haceUnaHora)));
  return total;
}

export async function enviarReclamo(_previo: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const valores = Object.fromEntries(CAMPOS_RECLAMO.map((c) => [c, String(datos.get(c) ?? "")]));
  const trampa = String(datos.get("sitio_web") ?? "");
  const entrada = esquemaReclamo.safeParse(valores);
  // Los errores van antes que el tiempo mínimo: quien envía el formulario vacío al instante debe verlos,
  // no una confirmación falsa. Con la trampa llena no se dan pistas.
  if (!entrada.success && trampa.trim() === "") return { errores: erroresDe(entrada.error), valores };

  const ipHash = await codigoDeConexion();
  const veredicto = evaluarEnvio({
    trampa,
    abiertoEn: datos.get("abierto_en") ? Number(datos.get("abierto_en")) : null,
    ahora: Date.now(),
    enLaUltimaHora: await reclamosEnLaUltimaHora(db, ipHash),
  });
  // A un robot se le responde igual que a una persona: no se le da ninguna pista.
  if (veredicto === "descartar" || !entrada.success) return { ok: true };
  if (veredicto === "limite") return { mensaje: MENSAJE_LIMITE, valores };
  const d = entrada.data;

  if (d.servicioId) {
    const [existe] = await db.select({ id: servicio.id }).from(servicio).where(eq(servicio.id, d.servicioId));
    if (!existe) return { errores: { servicioId: "Elige un servicio de la lista." }, valores };
  }

  const fotos = datos.getAll("fotos").filter((f): f is File => f instanceof File && f.size > 0);
  if (fotos.length > MAXIMO_FOTOS) return { errores: { fotos: `Hasta ${MAXIMO_FOTOS} fotos.` }, valores };

  const guardadas: number[] = [];
  for (const f of fotos) {
    const r = await guardarFoto(f, { carpeta: "reclamos", miniatura: true, autorId: null, privado: true });
    if (!r.ok) {
      // Si una foto falla, no queda nada a medias.
      for (const id of guardadas) await eliminarFoto(id);
      return { errores: { fotos: ERROR_FOTO }, valores };
    }
    guardadas.push(r.archivoId);
  }

  const guardado = await db.transaction(async (tx) => {
    // Se vuelve a contar con un candado por conexión: así varios envíos al mismo tiempo no pasan juntos el límite.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${ipHash}, 0))`);
    if ((await reclamosEnLaUltimaHora(tx, ipHash)) >= LIMITE_POR_HORA) return false;
    const [nuevo] = await tx
      .insert(reclamo)
      .values({
        nombre: d.nombre,
        telefono: d.telefono,
        placa: d.placa,
        servicioId: d.servicioId,
        fechaAproximada: d.fechaAproximada,
        descripcion: d.descripcion,
        ipHash,
      })
      .returning({ id: reclamo.id });
    if (guardadas.length > 0) {
      await tx.insert(reclamoArchivo).values(guardadas.map((archivoId, orden) => ({ reclamoId: nuevo.id, archivoId, orden })));
    }
    return true;
  });
  if (!guardado) {
    for (const id of guardadas) await eliminarFoto(id);
    return { mensaje: MENSAJE_LIMITE, valores };
  }

  return { ok: true };
}

export async function marcarAtendido(_previo: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const autor = await exigirModulo("reclamos");
  const valores = { nota: String(datos.get("nota") ?? "") };
  const entrada = esquemaAtender.safeParse({ id: datos.get("id"), ...valores });
  if (!entrada.success) return { errores: erroresDe(entrada.error), valores };
  const { id, nota } = entrada.data;

  // Solo un pendiente pasa a atendido: si dos personas lo atienden a la vez, queda la nota de la primera.
  const [actualizado] = await db
    .update(reclamo)
    .set({ estado: "atendido", notaAtencion: nota, atendidoPor: Number(autor.id), atendidoAt: new Date() })
    .where(and(eq(reclamo.id, id), eq(reclamo.estado, "pendiente")))
    .returning({ id: reclamo.id });
  if (!actualizado) return { mensaje: "Este reclamo ya estaba atendido." };

  revalidatePath("/panel");
  revalidatePath("/panel/reclamos");
  revalidatePath(`/panel/reclamos/${id}`);
  return { ok: true, mensaje: "Reclamo marcado como atendido." };
}
