"use server";

import { and, count, eq, isNull, lte, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect, RedirectType } from "next/navigation";
import { db } from "@/db";
import { auditoria, parteRevision, trabajo, trabajoAvance, trabajoRevision } from "@/db/esquema";
import { fechaEnBolivia } from "@/lib/fechas";
import { eliminarFoto, guardarFoto } from "@/lib/fotos";
import { erroresDe, type EstadoFormulario } from "@/lib/formularios";
import { puede } from "@/lib/permisos";
import { exigirModulo } from "@/lib/sesion";
import { esquemaDetalle, esquemaMarcarBien, esquemaMarcarRestoBien, esquemaRecibir } from "../esquemas";
import { puedeRecibirse, textoRestoBien, textoSinRevisar } from "../reglas";
import { conDesde, sinElTrabajo } from "@/lib/volver";
import { Conflicto, ERROR_FOTO, RECARGA, despuesDeCambiar } from "./comun";

// Órdenes (C4): Recibir el vehículo y su checklist de recepción, parte por parte (HU-33, P12).
// Entra el dueño o el encargado con "Órdenes" (pedido 32). Especificación: docs/08-desarrollo/etapas/C4-taller-entrega.md.

/**
 * Recibe el vehículo (HU-33, RF-40): la reserva agendada, desde su día de ingreso, pasa a orden "recibida" con las
 * observaciones de ingreso. Cómo llegó lo dice el checklist (pedido 12), revisado parte por parte.
 */
export async function recibirVehiculo(_previo: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const usuario = await exigirModulo("ordenes");
  if (!puede(usuario, "recibir_vehiculo")) return { mensaje: "El vehículo lo recibe el dueño o el encargado." };
  const valores = { observaciones: String(datos.get("observaciones") ?? "") };
  const r = esquemaRecibir.safeParse({ id: datos.get("id"), ...valores });
  if (!r.success) {
    const errores = erroresDe(r.error);
    return errores.id ? { mensaje: RECARGA } : { errores, valores };
  }
  const { id, observaciones } = r.data;

  // El checklist (pedido 12): cada parte activa se revisa, bien o con un detalle, antes de recibir
  const sinRevisar = await db
    .select({ nombre: parteRevision.nombre })
    .from(parteRevision)
    .leftJoin(trabajoRevision, and(eq(trabajoRevision.parteId, parteRevision.id), eq(trabajoRevision.trabajoId, id)))
    .where(and(eq(parteRevision.activo, true), isNull(trabajoRevision.id)))
    .orderBy(parteRevision.orden, parteRevision.id);
  if (sinRevisar.length > 0) return { mensaje: textoSinRevisar(sinRevisar.map((p) => p.nombre)), valores };

  const autorId = Number(usuario.id);
  const hoy = fechaEnBolivia();
  let clienteId: number;
  try {
    clienteId = await db.transaction(async (tx) => {
      // Solo una reserva agendada que ya llegó a su día: si otra persona la recibió o la canceló recién, no se toca
      const [recibida] = await tx
        .update(trabajo)
        .set({ estado: "recibido", recibidoAt: sql`now()`, recibidoPor: autorId, observacionesIngreso: observaciones, updatedAt: sql`now()` })
        .where(and(eq(trabajo.id, id), eq(trabajo.estado, "agendado"), lte(trabajo.fechaInicio, hoy)))
        .returning({ clienteId: trabajo.clienteId });
      if (!recibida) throw new Conflicto("Esa reserva ya fue recibida, se canceló o todavía no llega a su día de ingreso. Recarga la página.");
      await tx.insert(trabajoAvance).values({ trabajoId: id, usuarioId: autorId, nota: "Vehículo recibido." });
      const [{ detalles }] = await tx
        .select({ detalles: count() })
        .from(trabajoRevision)
        .where(and(eq(trabajoRevision.trabajoId, id), eq(trabajoRevision.estado, "detalle")));
      await tx.insert(auditoria).values({ usuarioId: autorId, entidad: "trabajo", entidadId: id, accion: "recibir", datos: { observaciones, detalles } });
      return recibida.clienteId;
    });
  } catch (error) {
    if (error instanceof Conflicto) return { mensaje: error.message, valores };
    throw error;
  }

  despuesDeCambiar(id, clienteId);
  // A donde se estaba antes de abrir la reserva (pedido 43), sin Recibir en el historial: "atrás" no vuelve a él
  redirect(conDesde(`/panel/ordenes/${id}?recibido=1`, sinElTrabajo(String(datos.get("volver") ?? ""), id)), RedirectType.replace);
}

/**
 * Guarda un detalle del checklist de recepción (pedido 12): la parte, qué tiene, una nota y, si llega, su foto (achicada en
 * el navegador, WebP en el servidor, bucket privado). Solo mientras la reserva espera ser recibida: después es prueba de
 * cómo llegó y no cambia. Una foto nueva reemplaza a la anterior.
 */
export async function guardarDetalle(_previo: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const usuario = await exigirModulo("ordenes");
  if (!puede(usuario, "recibir_vehiculo")) return { mensaje: "El checklist lo hace quien recibe el vehículo." };
  const valores = { tipo: String(datos.get("tipo") ?? ""), nota: String(datos.get("nota") ?? "") };
  const r = esquemaDetalle.safeParse({ trabajoId: datos.get("trabajoId"), parteId: datos.get("parteId"), ...valores });
  if (!r.success) {
    const errores = erroresDe(r.error);
    return errores.trabajoId || errores.parteId ? { mensaje: RECARGA } : { errores, valores };
  }
  const { trabajoId, parteId, tipo, nota } = r.data;

  // Antes de subir la foto, lo que la rechazaría (sin candado: adentro de la transacción se vuelve a comprobar todo)
  const [[t], [parte], [actual]] = await Promise.all([
    db.select({ estado: trabajo.estado, fechaInicio: trabajo.fechaInicio, clienteId: trabajo.clienteId }).from(trabajo).where(eq(trabajo.id, trabajoId)),
    db.select({ nombre: parteRevision.nombre, activo: parteRevision.activo }).from(parteRevision).where(eq(parteRevision.id, parteId)),
    db.select({ id: trabajoRevision.id }).from(trabajoRevision).where(and(eq(trabajoRevision.trabajoId, trabajoId), eq(trabajoRevision.parteId, parteId))),
  ]);
  if (!t) return { mensaje: "Esa reserva ya no existe." };
  if (t.estado !== "agendado") return { mensaje: "El vehículo ya se recibió: el checklist no cambia.", valores };
  if (!puedeRecibirse(t, fechaEnBolivia())) return { mensaje: "El checklist se hace el día que llega el vehículo.", valores };
  // Una parte desactivada no se agrega, pero lo que ya se marcó con ella se puede cambiar
  if (!parte || (!parte.activo && !actual)) return { mensaje: "Esa parte ya no está en el checklist. Recarga la página." };

  const autorId = Number(usuario.id);
  let fotoNueva: number | null = null;
  const foto = datos.get("foto");
  if (foto instanceof File && foto.size > 0) {
    const g = await guardarFoto(foto, { carpeta: "ordenes", miniatura: true, autorId, privado: true });
    if (!g.ok) return { errores: { foto: ERROR_FOTO }, valores };
    fotoNueva = g.archivoId;
  }

  let reemplazada: number | null = null;
  try {
    reemplazada = await db.transaction(async (tx) => {
      // Con candado, como marcar y desmarcar: si alguien la recibe o la reprograma en este momento, el detalle no entra
      const p = await parteDelChecklist(tx, trabajoId, parteId);
      if (!p || (!p.parte.activo && !p.antes)) throw new Conflicto("Esa parte ya no está en el checklist. Recarga la página.");
      const antes = p.antes;
      const archivoId = fotoNueva ?? antes?.archivoId ?? null;
      await tx
        .insert(trabajoRevision)
        .values({ trabajoId, parteId, parte: parte.nombre, estado: "detalle", tipo, nota, archivoId, createdBy: autorId })
        .onConflictDoUpdate({
          target: [trabajoRevision.trabajoId, trabajoRevision.parteId],
          set: { estado: "detalle", tipo, nota, archivoId, updatedAt: sql`now()` },
        });
      return fotoNueva && antes?.archivoId ? antes.archivoId : null;
    });
  } catch (error) {
    // Sin la fila, la foto nueva no la encontraría nadie: se borra
    if (fotoNueva) await eliminarFoto(fotoNueva).catch((e) => console.error("No se pudo borrar la foto del detalle", e));
    if (error instanceof Conflicto) return { mensaje: error.message, valores };
    throw error;
  }
  if (reemplazada) await eliminarFoto(reemplazada).catch((e) => console.error("No se pudo borrar la foto anterior del detalle", e));

  revalidatePath(`/panel/ordenes/${trabajoId}/recibir`);
  despuesDeCambiar(trabajoId, t.clienteId);
  return { ok: true, mensaje: "Detalle guardado." };
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Lo común de cambiar una parte del checklist (marcarla bien o desmarcarla): bloquea la orden, que siga agendada y sea su
 * día, y trae la parte y su revisión de antes. Null si la parte no existe; Conflicto si el checklist ya no se puede cambiar.
 */
/** El trabajo cuyo checklist se toca, tomado hasta el final: solo antes de recibir y desde su día de ingreso. */
async function trabajoDelChecklist(tx: Tx, trabajoId: number) {
  const [t] = await tx
    .select({ estado: trabajo.estado, fechaInicio: trabajo.fechaInicio, clienteId: trabajo.clienteId })
    .from(trabajo)
    .where(eq(trabajo.id, trabajoId))
    .for("update");
  if (!t) return null;
  if (t.estado !== "agendado") throw new Conflicto("El vehículo ya se recibió: el checklist no cambia.");
  if (!puedeRecibirse(t, fechaEnBolivia())) throw new Conflicto("El checklist se hace el día que llega el vehículo.");
  return t;
}

async function parteDelChecklist(tx: Tx, trabajoId: number, parteId: number) {
  const t = await trabajoDelChecklist(tx, trabajoId);
  if (!t) return null;
  const [[parte], [antes]] = await Promise.all([
    tx.select({ nombre: parteRevision.nombre, activo: parteRevision.activo }).from(parteRevision).where(eq(parteRevision.id, parteId)),
    tx
      .select({ archivoId: trabajoRevision.archivoId })
      .from(trabajoRevision)
      .where(and(eq(trabajoRevision.trabajoId, trabajoId), eq(trabajoRevision.parteId, parteId))),
  ]);
  if (!parte) return null;
  return { parte, antes: antes ?? null, clienteId: t.clienteId };
}

/** Después de marcar o desmarcar: la foto del detalle que había ya no es de nadie, y la pantalla se renueva. */
async function despuesDelChecklist(trabajoId: number, cambio: { archivoId: number | null; clienteId: number }) {
  if (cambio.archivoId) await eliminarFoto(cambio.archivoId).catch((e) => console.error("No se pudo borrar la foto del detalle", e));
  revalidatePath(`/panel/ordenes/${trabajoId}/recibir`);
  despuesDeCambiar(trabajoId, cambio.clienteId);
}

/**
 * Pedido 12: la parte, bien (un toque; también una que tenía un detalle: se borran su nota y su foto). Solo antes de
 * recibir, el día de ingreso. Recibe datos sueltos: se validan.
 */
export async function marcarBien(datos: { trabajoId: number; parteId: number }): Promise<EstadoFormulario> {
  const usuario = await exigirModulo("ordenes");
  if (!puede(usuario, "recibir_vehiculo")) return { mensaje: "El checklist lo hace quien recibe el vehículo." };
  const entrada = esquemaMarcarBien.safeParse(datos);
  if (!entrada.success) return { mensaje: RECARGA };
  const { trabajoId, parteId } = entrada.data;
  const autorId = Number(usuario.id);

  let marcada: { archivoId: number | null; clienteId: number } | null;
  try {
    marcada = await db.transaction(async (tx) => {
      const p = await parteDelChecklist(tx, trabajoId, parteId);
      // Una parte desactivada no se agrega, pero la ya revisada se puede cambiar
      if (!p || (!p.parte.activo && !p.antes)) return null;
      await tx
        .insert(trabajoRevision)
        .values({ trabajoId, parteId, parte: p.parte.nombre, estado: "bien", createdBy: autorId })
        .onConflictDoUpdate({
          target: [trabajoRevision.trabajoId, trabajoRevision.parteId],
          set: { estado: "bien", tipo: null, nota: null, archivoId: null, updatedAt: sql`now()` },
        });
      return { archivoId: p.antes?.archivoId ?? null, clienteId: p.clienteId };
    });
  } catch (error) {
    if (error instanceof Conflicto) return { mensaje: error.message };
    throw error;
  }
  if (!marcada) return { mensaje: "Esa parte ya no está en el checklist. Recarga la página." };
  await despuesDelChecklist(trabajoId, marcada);
  return { ok: true };
}

/**
 * Pulido de Recibir (09/11): las partes activas que faltan revisar, todas "bien" de un toque (un vehículo que llega sin
 * nada). No toca las ya revisadas: un detalle con su foto queda como está. Las mismas condiciones que marcar una: quien
 * recibe, antes de recibir y el día de ingreso. Recibe datos sueltos: se validan.
 */
export async function marcarRestoBien(datos: { trabajoId: number; parteIds: number[] }): Promise<EstadoFormulario> {
  const usuario = await exigirModulo("ordenes");
  if (!puede(usuario, "recibir_vehiculo")) return { mensaje: "El checklist lo hace quien recibe el vehículo." };
  const entrada = esquemaMarcarRestoBien.safeParse(datos);
  if (!entrada.success) return { mensaje: RECARGA };
  const { trabajoId, parteIds } = entrada.data;
  const autorId = Number(usuario.id);

  let resultado: { marcadas: number; clienteId: number } | null;
  try {
    resultado = await db.transaction(async (tx) => {
      const t = await trabajoDelChecklist(tx, trabajoId);
      if (!t) return null;
      // Con el trabajo tomado: un toque de "Bien" o "Detalle" a la vez no se cruza con este. Solo las que se veían en
      // pantalla, activas y todavía sin revisar
      const marcadas = await tx.execute<{ id: number }>(sql`
        insert into ${trabajoRevision} (trabajo_id, parte_id, parte, estado, created_by)
        select ${trabajoId}, p.id, p.nombre, 'bien', ${autorId}
        from ${parteRevision} p
        where p.activo
          and p.id in (${sql.join(parteIds.map((x) => sql`${x}`), sql`, `)})
          and not exists (select 1 from ${trabajoRevision} r where r.trabajo_id = ${trabajoId} and r.parte_id = p.id)
        on conflict do nothing
        returning id`);
      return { marcadas: marcadas.rows.length, clienteId: t.clienteId };
    });
  } catch (error) {
    if (error instanceof Conflicto) return { mensaje: error.message };
    throw error;
  }
  if (!resultado) return { mensaje: "Esa reserva ya no existe. Recarga la página." };
  // Siempre: con 0 (otro teléfono ya las marcó), la pantalla se renueva igual y muestra lo que de verdad hay
  await despuesDelChecklist(trabajoId, { archivoId: null, clienteId: resultado.clienteId });
  return { ok: true, mensaje: textoRestoBien(resultado.marcadas) };
}

/**
 * Pedido 26: desmarcar una parte (se tocó por error): vuelve a "Sin revisar". Si tenía un detalle, se borran su nota y su
 * foto. Mismas reglas que marcarla: quien recibe, el día que llega y antes de recibir.
 */
export async function desmarcarParte(datos: { trabajoId: number; parteId: number }): Promise<EstadoFormulario> {
  const usuario = await exigirModulo("ordenes");
  if (!puede(usuario, "recibir_vehiculo")) return { mensaje: "El checklist lo hace quien recibe el vehículo." };
  const entrada = esquemaMarcarBien.safeParse(datos);
  if (!entrada.success) return { mensaje: RECARGA };
  const { trabajoId, parteId } = entrada.data;

  let quitada: { archivoId: number | null; clienteId: number } | "sin cambios" | null;
  try {
    quitada = await db.transaction(async (tx) => {
      const p = await parteDelChecklist(tx, trabajoId, parteId);
      if (!p) return null;
      // Ya estaba sin revisar: no hay nada que quitar
      if (!p.antes) return "sin cambios";
      // Una parte desactivada ya no se puede volver a marcar: lo revisado con ella se cambia (bien o detalle), no se quita
      if (!p.parte.activo) throw new Conflicto("Esa parte ya no está en el checklist: se puede cambiar a bien o a detalle, no quitar.");
      await tx.delete(trabajoRevision).where(and(eq(trabajoRevision.trabajoId, trabajoId), eq(trabajoRevision.parteId, parteId)));
      return { archivoId: p.antes.archivoId, clienteId: p.clienteId };
    });
  } catch (error) {
    if (error instanceof Conflicto) return { mensaje: error.message };
    throw error;
  }
  if (!quitada) return { mensaje: "Esa parte ya no está en el checklist. Recarga la página." };
  if (quitada !== "sin cambios") await despuesDelChecklist(trabajoId, quitada);
  return { ok: true };
}
