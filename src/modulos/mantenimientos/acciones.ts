"use server";

import { and, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { auditoria, cliente, recordatorioMantenimiento as recordatorio, vehiculo } from "@/db/esquema";
import { erroresDe, type EstadoFormulario } from "@/lib/formularios";
import { exigirModulo } from "@/lib/sesion";
import { esquemaAvisarMantenimiento, esquemaCerrarMantenimiento } from "./esquemas";
import { ESTADOS_RECORDATORIO_ABIERTO } from "./reglas";

// Recordatorios de mantenimiento (HU-38, RF-50). Entra el dueño o el encargado con "Mantenimientos". Al agendar, el
// recordatorio pasa a "agendado" en la acción de la reserva (agendarReserva), en la misma transacción.
// Especificación: docs/08-desarrollo/etapas/C4-taller-entrega.md §6.

const RECARGA = "No se pudo leer el pedido. Recarga la página.";
const YA_NO = "Ese mantenimiento ya no está por avisar: se agendó, se cerró o el cliente se desactivó. Recarga la página.";

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
