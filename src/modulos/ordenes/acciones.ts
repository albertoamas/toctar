"use server";

import { and, count, eq, lte, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { auditoria, trabajo, trabajoAvance, trabajoFoto } from "@/db/esquema";
import { fechaEnBolivia } from "@/lib/fechas";
import { eliminarFoto, guardarFoto } from "@/lib/fotos";
import { erroresDe, type EstadoFormulario } from "@/lib/formularios";
import { exigirModulo } from "@/lib/sesion";
import { tecnicosActivos } from "@/modulos/agenda/consultas";
import { esquemaFotoOrden, esquemaQuitarFotoOrden, esquemaRecibir } from "./esquemas";
import { etapaAbierta, MAXIMO_FOTOS_ETAPA, NOMBRE_ETAPA, puedeVerOrden } from "./reglas";

// Órdenes (C4). Entra el dueño, el encargado con "Órdenes" y el técnico, que solo toca las suyas (RN-12). Recibir el
// vehículo es del dueño y del encargado: sale de la agenda, que el técnico no ve. Especificación:
// docs/08-desarrollo/etapas/C4-taller-entrega.md.

const RECARGA = "No se pudo leer el pedido. Recarga la página.";
const NO_ES_TUYA = "Esa orden no es tuya.";
const ERROR_FOTO = "La foto debe ser JPG, PNG o WebP de hasta 5 MB.";

/** Algo cambió entre la revisión y la escritura: se lanza dentro de la transacción para deshacerla entera. */
class Conflicto extends Error {}

function despuesDeCambiar(id: number, clienteId: number) {
  revalidatePath("/panel/ordenes");
  revalidatePath(`/panel/ordenes/${id}`);
  revalidatePath(`/panel/agenda/${id}`);
  revalidatePath("/panel/agenda");
  revalidatePath(`/panel/clientes/${clienteId}`);
}

/** Agrega una foto a una etapa de la orden (RF-40, RF-42): achicada en el navegador, WebP en el servidor, bucket privado. */
export async function subirFotoOrden(_previo: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const usuario = await exigirModulo("ordenes");
  const entrada = esquemaFotoOrden.safeParse({ trabajoId: datos.get("trabajoId"), etapa: datos.get("etapa") });
  if (!entrada.success) return { mensaje: RECARGA };
  const { trabajoId, etapa } = entrada.data;

  const [t] = await db.select({ estado: trabajo.estado, tecnicoId: trabajo.tecnicoId, clienteId: trabajo.clienteId }).from(trabajo).where(eq(trabajo.id, trabajoId));
  if (!t) return { mensaje: "Esa orden ya no existe." };
  if (!puedeVerOrden(usuario, t.tecnicoId)) return { mensaje: NO_ES_TUYA };
  // Las de ingreso las toma quien recibe el vehículo (dueño o encargado), no el técnico
  if (etapa === "ingreso" && usuario.rol === "tecnico") return { mensaje: "Las fotos de ingreso las toma quien recibe el vehículo." };
  if (!etapaAbierta(etapa, t.estado)) return { mensaje: `Ya no se agregan fotos de ${NOMBRE_ETAPA[etapa].toLowerCase()}.` };

  const autorId = Number(usuario.id);
  const r = await guardarFoto(datos.get("foto"), { carpeta: "ordenes", miniatura: true, autorId, privado: true });
  if (!r.ok) return { errores: { foto: r.motivo === "vacia" ? "Elige una foto." : ERROR_FOTO } };
  try {
    await db.transaction(async (tx) => {
      // Candado sobre la orden: dos subidas a la vez no pasan juntas el límite, y el estado no cambia en el medio
      const [actual] = await tx.select({ estado: trabajo.estado }).from(trabajo).where(eq(trabajo.id, trabajoId)).for("update");
      if (!actual || !etapaAbierta(etapa, actual.estado)) throw new Conflicto("Esa orden cambió recién. Recarga la página.");
      const [{ fotos }] = await tx
        .select({ fotos: count() })
        .from(trabajoFoto)
        .where(and(eq(trabajoFoto.trabajoId, trabajoId), eq(trabajoFoto.etapa, etapa)));
      if (fotos >= MAXIMO_FOTOS_ETAPA) throw new Conflicto(`Hasta ${MAXIMO_FOTOS_ETAPA} fotos por etapa.`);
      await tx.insert(trabajoFoto).values({ trabajoId, archivoId: r.archivoId, etapa, subidoPor: autorId });
    });
  } catch (error) {
    // Sin la fila en la orden, la foto no la encontraría nadie: se borra
    await eliminarFoto(r.archivoId).catch((e) => console.error("No se pudo borrar la foto de la orden", e));
    if (error instanceof Conflicto) return { errores: { foto: error.message } };
    throw error;
  }

  despuesDeCambiar(trabajoId, t.clienteId);
  return { ok: true, mensaje: "Foto guardada." };
}

/** Quita una foto: solo mientras su etapa está abierta, y solo quien la subió o el dueño (D-6). */
export async function quitarFotoOrden(datos: { trabajoId: number; fotoId: number }): Promise<EstadoFormulario> {
  const usuario = await exigirModulo("ordenes");
  const entrada = esquemaQuitarFotoOrden.safeParse(datos);
  if (!entrada.success) return { mensaje: RECARGA };
  const { trabajoId, fotoId } = entrada.data;

  const [f] = await db
    .select({ archivoId: trabajoFoto.archivoId, etapa: trabajoFoto.etapa, subidoPor: trabajoFoto.subidoPor, estado: trabajo.estado, tecnicoId: trabajo.tecnicoId, clienteId: trabajo.clienteId })
    .from(trabajoFoto)
    .innerJoin(trabajo, eq(trabajoFoto.trabajoId, trabajo.id))
    .where(and(eq(trabajoFoto.id, fotoId), eq(trabajoFoto.trabajoId, trabajoId)));
  if (!f) return { mensaje: "Esa foto ya no está." };
  if (!puedeVerOrden(usuario, f.tecnicoId)) return { mensaje: NO_ES_TUYA };
  if (usuario.rol !== "dueno" && f.subidoPor !== Number(usuario.id)) return { mensaje: "Solo quien subió la foto, o el dueño, la puede quitar." };
  if (!etapaAbierta(f.etapa, f.estado)) return { mensaje: "Esa foto ya no se puede quitar." };

  const borrada = await db.transaction(async (tx) => {
    const [actual] = await tx.select({ estado: trabajo.estado }).from(trabajo).where(eq(trabajo.id, trabajoId)).for("update");
    if (!actual || !etapaAbierta(f.etapa, actual.estado)) return false;
    const [fila] = await tx.delete(trabajoFoto).where(eq(trabajoFoto.id, fotoId)).returning({ id: trabajoFoto.id });
    return !!fila;
  });
  if (!borrada) return { mensaje: "Esa foto ya no se puede quitar." };
  await eliminarFoto(f.archivoId).catch((e) => console.error("No se pudo borrar la foto de la orden", e));

  despuesDeCambiar(trabajoId, f.clienteId);
  return { ok: true, mensaje: "Foto quitada." };
}

/**
 * Recibe el vehículo (HU-33, RF-40): la reserva agendada, desde su día de ingreso, pasa a orden "recibida" con las
 * observaciones de ingreso y su técnico. Las fotos de ingreso ya se subieron mientras se recibía.
 */
export async function recibirVehiculo(_previo: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const usuario = await exigirModulo("ordenes");
  if (usuario.rol === "tecnico") return { mensaje: "El vehículo lo recibe el dueño o el encargado." };
  const valores = { tecnicoId: String(datos.get("tecnicoId") ?? ""), observaciones: String(datos.get("observaciones") ?? "") };
  const r = esquemaRecibir.safeParse({ id: datos.get("id"), ...valores });
  if (!r.success) {
    const errores = erroresDe(r.error);
    return errores.id || errores.tecnicoId ? { mensaje: RECARGA } : { errores, valores };
  }
  const { id, tecnicoId, observaciones } = r.data;
  if (tecnicoId && !(await tecnicosActivos()).some((t) => t.id === tecnicoId)) return { errores: { tecnicoId: "Ese técnico ya no está activo." }, valores };

  const autorId = Number(usuario.id);
  const hoy = fechaEnBolivia();
  let clienteId: number;
  try {
    clienteId = await db.transaction(async (tx) => {
      // Solo una reserva agendada que ya llegó a su día: si otra persona la recibió o la canceló recién, no se toca
      const [recibida] = await tx
        .update(trabajo)
        .set({ estado: "recibido", recibidoAt: sql`now()`, recibidoPor: autorId, observacionesIngreso: observaciones, tecnicoId, updatedAt: sql`now()` })
        .where(and(eq(trabajo.id, id), eq(trabajo.estado, "agendado"), lte(trabajo.fechaInicio, hoy)))
        .returning({ clienteId: trabajo.clienteId });
      if (!recibida) throw new Conflicto("Esa reserva ya fue recibida, se canceló o todavía no llega a su día de ingreso. Recarga la página.");
      await tx.insert(trabajoAvance).values({ trabajoId: id, usuarioId: autorId, nota: "Vehículo recibido." });
      await tx.insert(auditoria).values({ usuarioId: autorId, entidad: "trabajo", entidadId: id, accion: "recibir", datos: { tecnicoId, observaciones } });
      return recibida.clienteId;
    });
  } catch (error) {
    if (error instanceof Conflicto) return { mensaje: error.message, valores };
    throw error;
  }

  despuesDeCambiar(id, clienteId);
  redirect(`/panel/ordenes/${id}?recibido=1`);
}
