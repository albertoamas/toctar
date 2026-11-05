"use server";

import { and, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { auditoria, cliente, recordatorioMantenimiento as recordatorio, servicio, vehiculo } from "@/db/esquema";
import { fechaEnBolivia, sumarMeses } from "@/lib/fechas";
import { erroresDe, indiceUnicoViolado, type EstadoFormulario } from "@/lib/formularios";
import { exigirModulo } from "@/lib/sesion";
import { esquemaAgregarMantenimiento, esquemaAvisarMantenimiento, esquemaCerrarMantenimiento, esquemaEditarPlan } from "./esquemas";
import { ESTADOS_RECORDATORIO_ABIERTO } from "./reglas";

// Recordatorios de mantenimiento (HU-38, RF-50) y planes por vehículo (pedido 21). Entra el dueño o el encargado con
// "Mantenimientos". Al agendar, el recordatorio pasa a "agendado" en la acción de la reserva (agendarReserva); al
// entregar, los planes se resuelven en la entrega (aplicarPlanesAlEntregar), cada uno en su transacción.
// Especificación: docs/08-desarrollo/etapas/C4-taller-entrega.md §6 y P21-planes-mantenimiento.md §6.

const RECARGA = "No se pudo leer el pedido. Recarga la página.";
const YA_NO = "Ese mantenimiento ya no está por avisar: se reservó, se cerró o el cliente se desactivó. Recarga la página.";

/** Abierto, y de un cliente y un vehículo activos: los mismos que muestra la lista (mantenimientosPorAvisar). */
const abierto = (id: number) =>
  and(
    eq(recordatorio.id, id),
    inArray(recordatorio.estado, [...ESTADOS_RECORDATORIO_ABIERTO]),
    inArray(recordatorio.clienteId, db.select({ id: cliente.id }).from(cliente).where(eq(cliente.activo, true))),
    inArray(recordatorio.vehiculoId, db.select({ id: vehiculo.id }).from(vehiculo).where(eq(vehiculo.activo, true))),
  );

function despuesDeCambiar(clienteId: number) {
  revalidatePath("/panel/mantenimientos");
  revalidatePath(`/panel/clientes/${clienteId}`);
}

/** Registra quién avisó y cuándo (el chat de WhatsApp lo abre el navegador en el mismo toque). Se puede volver a avisar. */
export async function avisarMantenimiento(datos: { id: number }): Promise<EstadoFormulario> {
  const usuario = await exigirModulo("mantenimientos");
  const r = esquemaAvisarMantenimiento.safeParse(datos);
  if (!r.success) return { mensaje: RECARGA };
  const { id } = r.data;
  const autorId = Number(usuario.id);

  const clienteId = await db.transaction(async (tx) => {
    const [avisado] = await tx
      .update(recordatorio)
      .set({ estado: "avisado", avisadoAt: sql`now()`, avisadoPor: autorId, updatedAt: sql`now()` })
      .where(abierto(id))
      .returning({ clienteId: recordatorio.clienteId });
    if (!avisado) return null;
    await tx.insert(auditoria).values({ usuarioId: autorId, entidad: "recordatorio_mantenimiento", entidadId: id, accion: "avisar", datos: {} });
    return avisado.clienteId;
  });
  if (clienteId === null) return { mensaje: YA_NO };

  despuesDeCambiar(clienteId);
  return { ok: true };
}

/** "No le interesa": no se le vuelve a avisar de ese mantenimiento. Con una nota opcional (por qué). */
export async function cerrarMantenimiento(_previo: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const usuario = await exigirModulo("mantenimientos");
  const valores = { nota: String(datos.get("nota") ?? "") };
  const r = esquemaCerrarMantenimiento.safeParse({ id: datos.get("id"), ...valores });
  if (!r.success) {
    const errores = erroresDe(r.error);
    return errores.id ? { mensaje: RECARGA } : { errores, valores };
  }
  const { id, nota } = r.data;
  const autorId = Number(usuario.id);

  const clienteId = await db.transaction(async (tx) => {
    const [cerrado] = await tx
      .update(recordatorio)
      .set({ estado: "no_interesado", nota, updatedAt: sql`now()` })
      .where(abierto(id))
      .returning({ clienteId: recordatorio.clienteId });
    if (!cerrado) return null;
    await tx.insert(auditoria).values({ usuarioId: autorId, entidad: "recordatorio_mantenimiento", entidadId: id, accion: "no_interesado", datos: { nota } });
    return cerrado.clienteId;
  });
  if (clienteId === null) return { mensaje: YA_NO };

  despuesDeCambiar(clienteId);
  return { ok: true, mensaje: "Listo: no se le volverá a avisar." };
}

const REPETIDO = "Ese vehículo ya tiene un mantenimiento de ese servicio por hacer: está en su lista.";

/**
 * Agrega un mantenimiento desde la ficha del cliente (pedido 21, el pedido 17): un servicio que el vehículo se hizo
 * antes del sistema. El próximo es la fecha en que se hizo más la frecuencia; si ya pasó, queda vencido y aparece en
 * "Por avisar". Un plan abierto de ese vehículo y servicio no se duplica (índice único en la base).
 */
export async function agregarMantenimiento(_previo: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const usuario = await exigirModulo("mantenimientos");
  const valores = {
    clienteId: String(datos.get("clienteId") ?? ""),
    vehiculoId: String(datos.get("vehiculoId") ?? ""),
    servicioId: String(datos.get("servicioId") ?? ""),
    hecho: String(datos.get("hecho") ?? ""),
    meses: String(datos.get("meses") ?? ""),
  };
  const r = esquemaAgregarMantenimiento.safeParse(valores);
  if (!r.success) {
    const errores = erroresDe(r.error);
    return errores.clienteId ? { mensaje: RECARGA } : { errores, valores };
  }
  const { clienteId, vehiculoId, servicioId, hecho, meses } = r.data;
  if (hecho > fechaEnBolivia()) return { errores: { hecho: "La fecha no puede ser después de hoy." }, valores };

  const [[suyo], [delCatalogo]] = await Promise.all([
    db
      .select({ id: vehiculo.id })
      .from(vehiculo)
      .innerJoin(cliente, eq(vehiculo.clienteId, cliente.id))
      .where(and(eq(vehiculo.id, vehiculoId), eq(vehiculo.clienteId, clienteId), eq(vehiculo.activo, true), eq(cliente.activo, true))),
    db.select({ mantenimientoServicioId: servicio.mantenimientoServicioId }).from(servicio).where(and(eq(servicio.id, servicioId), eq(servicio.activo, true))),
  ]);
  if (!suyo) return { errores: { vehiculoId: "Ese vehículo ya no está activo: elige otro." }, valores };
  if (!delCatalogo?.mantenimientoServicioId) return { errores: { servicioId: "Ese servicio no programa mantenimiento: elige otro." }, valores };

  const autorId = Number(usuario.id);
  try {
    await db.transaction(async (tx) => {
      const [nuevo] = await tx
        .insert(recordatorio)
        .values({
          clienteId,
          vehiculoId,
          servicioId,
          servicioMantenimientoId: delCatalogo.mantenimientoServicioId!,
          intervaloMeses: meses,
          fechaProgramada: sumarMeses(hecho, meses),
        })
        .returning({ id: recordatorio.id });
      await tx.insert(auditoria).values({ usuarioId: autorId, entidad: "recordatorio_mantenimiento", entidadId: nuevo.id, accion: "agregar", datos: { vehiculoId, servicioId, hecho, meses } });
    });
  } catch (error) {
    if (indiceUnicoViolado(error) === "recordatorio_un_plan_abierto") return { errores: { servicioId: REPETIDO }, valores };
    throw error;
  }

  despuesDeCambiar(clienteId);
  return { ok: true, mensaje: "Mantenimiento agregado." };
}

/**
 * Edita un plan sin agendar (pendiente o avisado): cada cuántos meses y cuándo es el próximo. Si cambia la fecha, se
 * vuelve a avisar (el aviso de antes era por otra fecha). Agendado, se cambia al reprogramar o cancelar la reserva.
 */
export async function editarPlan(_previo: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const usuario = await exigirModulo("mantenimientos");
  const valores = { id: String(datos.get("id") ?? ""), meses: String(datos.get("meses") ?? ""), proximo: String(datos.get("proximo") ?? "") };
  const r = esquemaEditarPlan.safeParse(valores);
  if (!r.success) {
    const errores = erroresDe(r.error);
    return errores.id ? { mensaje: RECARGA } : { errores, valores };
  }
  const { id, meses, proximo } = r.data;
  const hoy = fechaEnBolivia();
  if (proximo < hoy || proximo > sumarMeses(hoy, 24)) return { errores: { proximo: "Elige una fecha desde hoy y hasta dentro de 24 meses." }, valores };
  const autorId = Number(usuario.id);

  const clienteId = await db.transaction(async (tx) => {
    const [actual] = await tx.select({ fecha: recordatorio.fechaProgramada }).from(recordatorio).where(abierto(id)).for("update");
    if (!actual) return null;
    const otraFecha = actual.fecha !== proximo;
    const [editado] = await tx
      .update(recordatorio)
      .set({
        intervaloMeses: meses,
        fechaProgramada: proximo,
        ...(otraFecha && { estado: "pendiente" as const, avisadoAt: null, avisadoPor: null }),
        updatedAt: sql`now()`,
      })
      .where(eq(recordatorio.id, id))
      .returning({ clienteId: recordatorio.clienteId });
    await tx.insert(auditoria).values({ usuarioId: autorId, entidad: "recordatorio_mantenimiento", entidadId: id, accion: "editar", datos: { meses, proximo } });
    return editado.clienteId;
  });
  if (clienteId === null) return { mensaje: YA_NO };

  despuesDeCambiar(clienteId);
  return { ok: true, mensaje: "Plan guardado." };
}
