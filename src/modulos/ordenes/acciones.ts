"use server";

import { and, count, eq, inArray, isNull, lte, or, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { auditoria, trabajo, trabajoAvance, trabajoFoto, usuario as tablaUsuario } from "@/db/esquema";
import { fechaEnBolivia, formatearFecha, sumarDias } from "@/lib/fechas";
import { eliminarFoto, guardarFoto } from "@/lib/fotos";
import { erroresDe, exclusionViolada, type EstadoFormulario } from "@/lib/formularios";
import { puede, puedeVerOrden } from "@/lib/permisos";
import { exigirModulo } from "@/lib/sesion";
import type { EstadoTrabajo, EtapaFoto } from "@/db/esquema/trabajos";
import { espaciosEnFechas, type EspacioDisponible } from "@/modulos/agenda/consultas";
import { NOMBRE_ESTADO_TRABAJO } from "@/modulos/agenda/reglas";
import { esquemaAvance, esquemaEstadoOrden, esquemaExtender, esquemaFotoOrden, esquemaQuitarFotoOrden, esquemaRecibir } from "./esquemas";
import { ESTADOS_ORDEN_ABIERTA, estaAbierta, etapaAbierta, MAXIMO_FOTOS_ETAPA, NOMBRE_ETAPA, puedeRecibirse, transicionOrden } from "./reglas";

// Órdenes (C4). Entra el dueño, el encargado con "Órdenes" y el técnico, que solo toca las suyas (RN-12). Recibir el
// vehículo es del dueño y del encargado: sale de la agenda, que el técnico no ve. Especificación:
// docs/08-desarrollo/etapas/C4-taller-entrega.md.

const RECARGA = "No se pudo leer el pedido. Recarga la página.";
const NO_ES_TUYA = "Esa orden no es tuya.";
const ERROR_FOTO = "La foto debe ser JPG, PNG o WebP de hasta 5 MB.";

/** Algo cambió entre la revisión y la escritura: se lanza dentro de la transacción para deshacerla entera. Con
 * `campo`, el error va junto a ese campo; sin él, arriba del formulario. */
class Conflicto extends Error {
  constructor(
    mensaje: string,
    readonly campo?: string,
  ) {
    super(mensaje);
  }
}

/**
 * Si a esa etapa se le puede sumar una foto ahora: abierta y, las de ingreso, desde el día en que llega el vehículo (antes
 * no prueban nada). Devuelve el motivo si no.
 */
function motivoSinFoto(etapa: EtapaFoto, t: { estado: EstadoTrabajo; fechaInicio: string }, fotos: number): string | null {
  if (!etapaAbierta(etapa, t.estado)) return `Ya no se agregan fotos de ${NOMBRE_ETAPA[etapa].toLowerCase()}.`;
  if (etapa === "ingreso" && !puedeRecibirse(t, fechaEnBolivia())) return "Las fotos de ingreso se toman el día que llega el vehículo.";
  if (fotos >= MAXIMO_FOTOS_ETAPA) return `Hasta ${MAXIMO_FOTOS_ETAPA} fotos por etapa.`;
  return null;
}

const contarFotos = (base: Pick<typeof db, "select">, trabajoId: number, etapa: EtapaFoto) =>
  base
    .select({ fotos: count() })
    .from(trabajoFoto)
    .where(and(eq(trabajoFoto.trabajoId, trabajoId), eq(trabajoFoto.etapa, etapa)))
    .then(([{ fotos }]) => fotos);

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

  const [t] = await db
    .select({ estado: trabajo.estado, fechaInicio: trabajo.fechaInicio, tecnicoId: trabajo.tecnicoId, clienteId: trabajo.clienteId })
    .from(trabajo)
    .where(eq(trabajo.id, trabajoId));
  if (!t) return { mensaje: "Esa orden ya no existe." };
  if (!puedeVerOrden(usuario, t.tecnicoId)) return { mensaje: NO_ES_TUYA };
  // Las de ingreso las toma quien recibe el vehículo (dueño o encargado), no el técnico
  if (etapa === "ingreso" && !puede(usuario, "recibir_vehiculo")) return { mensaje: "Las fotos de ingreso las toma quien recibe el vehículo." };
  // Antes de procesar la foto: si no va a entrar, ni se convierte ni se sube
  const antes = motivoSinFoto(etapa, t, await contarFotos(db, trabajoId, etapa));
  if (antes) return { errores: { foto: antes } };

  const autorId = Number(usuario.id);
  const r = await guardarFoto(datos.get("foto"), { carpeta: "ordenes", miniatura: true, autorId, privado: true });
  if (!r.ok) return { errores: { foto: r.motivo === "vacia" ? "Elige una foto." : ERROR_FOTO } };
  try {
    await db.transaction(async (tx) => {
      // Candado sobre la orden: dos subidas a la vez no pasan juntas el límite, y el estado no cambia en el medio
      const [actual] = await tx.select({ estado: trabajo.estado, fechaInicio: trabajo.fechaInicio }).from(trabajo).where(eq(trabajo.id, trabajoId)).for("update");
      if (!actual) throw new Conflicto("Esa orden ya no existe.");
      const motivo = motivoSinFoto(etapa, actual, await contarFotos(tx, trabajoId, etapa));
      if (motivo) throw new Conflicto(motivo);
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
  if (!puede(usuario, "recibir_vehiculo")) return { mensaje: "El vehículo lo recibe el dueño o el encargado." };
  const valores = { tecnicoId: String(datos.get("tecnicoId") ?? ""), observaciones: String(datos.get("observaciones") ?? "") };
  const r = esquemaRecibir.safeParse({ id: datos.get("id"), ...valores });
  if (!r.success) {
    const errores = erroresDe(r.error);
    return errores.id || errores.tecnicoId ? { mensaje: RECARGA } : { errores, valores };
  }
  const { id, tecnicoId, observaciones } = r.data;

  const autorId = Number(usuario.id);
  const hoy = fechaEnBolivia();
  let clienteId: number;
  try {
    clienteId = await db.transaction(async (tx) => {
      // El técnico, activo: dentro de la transacción y con candado, así no se lo desactiva a mitad de camino
      if (tecnicoId) {
        const [activo] = await tx
          .select({ id: tablaUsuario.id })
          .from(tablaUsuario)
          .where(and(eq(tablaUsuario.id, tecnicoId), eq(tablaUsuario.role, "tecnico"), or(isNull(tablaUsuario.banned), eq(tablaUsuario.banned, false))))
          .for("update");
        if (!activo) throw new Conflicto("Ese técnico ya no está activo.", "tecnicoId");
      }
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
    if (error instanceof Conflicto) return error.campo ? { errores: { [error.campo]: error.message }, valores } : { mensaje: error.message, valores };
    throw error;
  }

  despuesDeCambiar(id, clienteId);
  redirect(`/panel/ordenes/${id}?recibido=1`);
}

const CAMBIO = "Esa orden cambió recién. Recarga la página.";
const abiertas = inArray(trabajo.estado, [...ESTADOS_ORDEN_ABIERTA]);

const MENSAJE_ESTADO: Partial<Record<EstadoTrabajo, string>> = {
  recibido: "La orden volvió a recibida.",
  en_proceso: "La orden está en proceso.",
  listo: "La orden está lista. Avisa al cliente.",
};

/**
 * Cambia el estado de la orden un paso adelante o atrás (HU-34, RF-41). El técnico, solo en las suyas. Al pasar a
 * listo, si la entrega aproximada es después de hoy, pasa a hoy: el espacio queda libre desde mañana (decisión del 20/10).
 */
export async function cambiarEstadoOrden(_previo: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const usuario = await exigirModulo("ordenes");
  const r = esquemaEstadoOrden.safeParse({ id: datos.get("id"), estado: datos.get("estado") });
  if (!r.success) return { mensaje: RECARGA };
  const { id, estado } = r.data;
  const autorId = Number(usuario.id);
  const hoy = fechaEnBolivia();

  let clienteId: number;
  try {
    clienteId = await db.transaction(async (tx) => {
      const [actual] = await tx.select({ estado: trabajo.estado, tecnicoId: trabajo.tecnicoId, clienteId: trabajo.clienteId }).from(trabajo).where(eq(trabajo.id, id)).for("update");
      if (!actual) throw new Conflicto("Esa orden ya no existe.");
      if (!puedeVerOrden(usuario, actual.tecnicoId)) throw new Conflicto(NO_ES_TUYA);
      if (!transicionOrden(actual.estado, estado)) throw new Conflicto(CAMBIO);
      await tx
        .update(trabajo)
        .set({
          estado,
          updatedAt: sql`now()`,
          ...(estado === "listo" && { listoAt: sql`now()`, fechaFin: sql`least(${trabajo.fechaFin}, ${hoy}::date)` }),
        })
        .where(eq(trabajo.id, id));
      await tx.insert(trabajoAvance).values({ trabajoId: id, usuarioId: autorId, nota: `Pasó a ${NOMBRE_ESTADO_TRABAJO[estado].toLowerCase()}.` });
      await tx.insert(auditoria).values({ usuarioId: autorId, entidad: "trabajo", entidadId: id, accion: "estado", datos: { de: actual.estado, a: estado } });
      return actual.clienteId;
    });
  } catch (error) {
    if (error instanceof Conflicto) return { mensaje: error.message };
    throw error;
  }

  despuesDeCambiar(id, clienteId);
  return { ok: true, mensaje: MENSAJE_ESTADO[estado] };
}

/** Escribe un avance en la historia de la orden (HU-34, RF-42). El técnico, solo en las suyas; mientras esté abierta. */
export async function agregarAvance(_previo: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const usuario = await exigirModulo("ordenes");
  const valores = { nota: String(datos.get("nota") ?? "") };
  const r = esquemaAvance.safeParse({ id: datos.get("id"), ...valores });
  if (!r.success) {
    const errores = erroresDe(r.error);
    return errores.id ? { mensaje: RECARGA } : { errores, valores };
  }
  const { id, nota } = r.data;

  const [t] = await db.select({ estado: trabajo.estado, tecnicoId: trabajo.tecnicoId, clienteId: trabajo.clienteId }).from(trabajo).where(eq(trabajo.id, id));
  if (!t) return { mensaje: "Esa orden ya no existe." };
  if (!puedeVerOrden(usuario, t.tecnicoId)) return { mensaje: NO_ES_TUYA };
  if (!estaAbierta(t.estado)) return { mensaje: "Esa orden ya no está abierta." };
  await db.insert(trabajoAvance).values({ trabajoId: id, usuarioId: Number(usuario.id), nota });

  despuesDeCambiar(id, t.clienteId);
  return { ok: true, mensaje: "Avance guardado." };
}

/** Las fechas para extender una orden: desde su ingreso (ya pasó) hasta la nueva entrega; null si no valen. */
async function rangoParaExtender(id: number, fechaFin: string): Promise<{ fechaInicio: string; fechaFin: string; clienteId: number; espacioId: number } | string> {
  const [t] = await db
    .select({ estado: trabajo.estado, fechaInicio: trabajo.fechaInicio, fechaFin: trabajo.fechaFin, clienteId: trabajo.clienteId, espacioId: trabajo.espacioId })
    .from(trabajo)
    .where(eq(trabajo.id, id));
  if (!t || !estaAbierta(t.estado)) return "Esa orden ya no está abierta.";
  if (fechaFin <= t.fechaFin) return "La nueva entrega tiene que ser después de la actual.";
  if (fechaFin > sumarDias(t.fechaInicio, 60)) return "Una orden dura hasta 60 días desde el ingreso.";
  return { fechaInicio: t.fechaInicio, fechaFin, clienteId: t.clienteId, espacioId: t.espacioId };
}

/**
 * Los espacios y si están libres para extender la orden hasta la nueva fecha (sin contar la propia orden). Datos sueltos:
 * se validan. El ingreso lo pone el servidor (el de la orden); la firma es la del formulario de agendar, para reusarlo.
 */
export async function espaciosParaExtender(datos: { fechaInicio: string; fechaFin: string; excepto?: number }): Promise<EspacioDisponible[] | null> {
  const usuario = await exigirModulo("ordenes");
  if (!puede(usuario, "extender_entrega")) return null;
  const r = esquemaExtender.pick({ id: true, fechaFin: true }).safeParse({ id: datos.excepto, fechaFin: datos.fechaFin });
  if (!r.success) return null;
  const rango = await rangoParaExtender(r.data.id, r.data.fechaFin);
  if (typeof rango === "string") return null;
  return espaciosEnFechas(rango.fechaInicio, rango.fechaFin, r.data.id);
}

/**
 * Extiende la entrega de una orden que se atrasa (HU-34; decisión del 20/10). Si su espacio está ocupado en los días
 * nuevos, se la mueve a otro libre. La base frena un cruce aunque dos personas cambien la agenda a la vez (D-5).
 */
export async function extenderEntrega(_previo: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const usuario = await exigirModulo("ordenes");
  if (!puede(usuario, "extender_entrega")) return { mensaje: "La entrega la extiende el dueño o el encargado." };
  const valores = { fechaFin: String(datos.get("fechaFin") ?? ""), espacioId: String(datos.get("espacioId") ?? "") };
  const r = esquemaExtender.safeParse({ id: datos.get("id"), ...valores });
  if (!r.success) {
    const errores = erroresDe(r.error);
    return errores.id ? { mensaje: RECARGA } : { errores, valores };
  }
  const { id, fechaFin, espacioId } = r.data;
  const rango = await rangoParaExtender(id, fechaFin);
  if (typeof rango === "string") return { errores: { fechaFin: rango }, valores };
  const espacio = (await espaciosEnFechas(rango.fechaInicio, fechaFin, id)).find((e) => e.id === espacioId);
  if (!espacio) return { errores: { espacioId: "Elige el espacio." }, valores };
  if (!espacio.libre) return { errores: { espacioId: `${espacio.nombre} está ocupado en esas fechas: elige otro espacio.` }, valores };

  const autorId = Number(usuario.id);
  try {
    await db.transaction(async (tx) => {
      // Solo si sigue abierta y nadie la cambió en el medio
      const [movida] = await tx
        .update(trabajo)
        .set({ fechaFin, espacioId, updatedAt: sql`now()` })
        .where(and(eq(trabajo.id, id), abiertas, lte(trabajo.fechaFin, sumarDias(fechaFin, -1))))
        .returning({ id: trabajo.id });
      if (!movida) throw new Conflicto(CAMBIO);
      const enOtro = espacioId !== rango.espacioId ? ` en ${espacio.nombre}` : "";
      await tx.insert(trabajoAvance).values({ trabajoId: id, usuarioId: autorId, nota: `Entrega extendida al ${formatearFecha(fechaFin).slice(0, 5)}${enOtro}.` });
      await tx.insert(auditoria).values({
        usuarioId: autorId,
        entidad: "trabajo",
        entidadId: id,
        accion: "extender",
        datos: { antes: { espacioId: rango.espacioId }, despues: { espacioId, fechaFin } },
      });
    });
  } catch (error) {
    if (error instanceof Conflicto) return { mensaje: error.message, valores };
    if (exclusionViolada(error) === "trabajo_sin_cruces") return { errores: { espacioId: `${espacio.nombre} se ocupó recién: elige otro espacio.` }, valores };
    throw error;
  }

  despuesDeCambiar(id, rango.clienteId);
  return { ok: true, mensaje: `Entrega movida al ${formatearFecha(fechaFin).slice(0, 5)}${espacioId !== rango.espacioId ? ` en ${espacio.nombre}` : ""}.` };
}
