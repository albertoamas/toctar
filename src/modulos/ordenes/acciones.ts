"use server";

import { and, count, eq, inArray, isNull, lte, or, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { auditoria, pago, recordatorioMantenimiento, trabajo, trabajoAvance, trabajoFoto, trabajoLinea, usuario as tablaUsuario, vehiculo as tablaVehiculo } from "@/db/esquema";
import { fechaEnBolivia, formatearFecha, sumarDias, sumarMeses } from "@/lib/fechas";
import { copiarFotoAlPublico, eliminarFoto, guardarFoto } from "@/lib/fotos";
import { erroresDe, exclusionViolada, indiceUnicoViolado, type EstadoFormulario } from "@/lib/formularios";
import { puede, puedeVerModulo, puedeVerOrden } from "@/lib/permisos";
import { exigirAccion, exigirModulo } from "@/lib/sesion";
import type { EstadoTrabajo, EtapaFoto } from "@/db/esquema/trabajos";
import { espaciosEnFechas, type EspacioDisponible } from "@/modulos/agenda/consultas";
import { DIAS_MAXIMOS_TRABAJO, NOMBRE_ESTADO_TRABAJO } from "@/modulos/agenda/reglas";
import { mostrarMonto } from "@/modulos/catalogo/reglas";
import { obtenerParametros } from "@/modulos/configuracion/consultas";
import { opcionesDeServicio } from "@/modulos/cotizaciones/consultas";
import { descripcionLinea } from "@/modulos/cotizaciones/reglas";
import { calcularSaldo, estaPagada, precioCotizadoYFinal } from "@/modulos/pagos/reglas";
import { agregarAGaleria } from "@/modulos/sitio/agregar-a-galeria";
import { galeriaCambiada } from "@/modulos/sitio/galeria-cambiada";
import { publicadaDeOrden, serviciosConMantenimiento, serviciosDeOrden } from "./consultas";
import { esquemaAdicional, esquemaAvance, esquemaAvisoListo, esquemaEntregar, esquemaEstadoOrden, esquemaExtender, esquemaFotoOrden, esquemaPublicar, esquemaQuitarFotoOrden, esquemaRecibir } from "./esquemas";
import { esFotoDeAntes, estaAbierta, etapaAbierta, puedeExtenderse, MAXIMO_FOTOS_ETAPA, NOMBRE_ETAPA, puedeRecibirse, transicionOrden } from "./reglas";

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

const MENSAJE_ESTADO: Partial<Record<EstadoTrabajo, string>> = {
  recibido: "La orden volvió a recibida.",
  en_proceso: "La orden está en proceso.",
  listo: "La orden está lista. Avisa al cliente.",
};

/**
 * Cambia el estado de la orden un paso adelante o atrás (HU-34, RF-41). El técnico, solo en las suyas. Al pasar a
 * listo, si la entrega aproximada es después de hoy, pasa a hoy: el espacio queda libre desde mañana (decisión del 20/10).
 * Si se marcó lista por error y vuelve a en proceso, recupera esa entrega, salvo que el espacio ya se haya tomado; y el
 * aviso al cliente se borra, porque ya no es cierto.
 */
export async function cambiarEstadoOrden(_previo: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const usuario = await exigirModulo("ordenes");
  const r = esquemaEstadoOrden.safeParse({ id: datos.get("id"), estado: datos.get("estado") });
  if (!r.success) return { mensaje: RECARGA };
  const { id, estado } = r.data;
  const autorId = Number(usuario.id);
  const hoy = fechaEnBolivia();

  const cambiar = (recuperarEntrega: boolean) =>
    db.transaction(async (tx) => {
      const [actual] = await tx
        .select({ estado: trabajo.estado, tecnicoId: trabajo.tecnicoId, clienteId: trabajo.clienteId, fechaFin: trabajo.fechaFin, fechaFinPrevista: trabajo.fechaFinPrevista })
        .from(trabajo)
        .where(eq(trabajo.id, id))
        .for("update");
      if (!actual) throw new Conflicto("Esa orden ya no existe.");
      if (!puedeVerOrden(usuario, actual.tecnicoId)) throw new Conflicto(NO_ES_TUYA);
      if (!transicionOrden(actual.estado, estado)) throw new Conflicto(CAMBIO);
      const antesDeTiempo = actual.fechaFin > hoy;
      const vuelveDeLista = actual.estado === "listo";
      // La que tenía, si todavía no pasó
      const prevista = actual.fechaFinPrevista && actual.fechaFinPrevista > actual.fechaFin ? actual.fechaFinPrevista : null;
      await tx
        .update(trabajo)
        .set({
          estado,
          updatedAt: sql`now()`,
          ...(estado === "listo" && { listoAt: sql`now()`, ...(antesDeTiempo && { fechaFin: hoy, fechaFinPrevista: actual.fechaFin }) }),
          ...(vuelveDeLista && { avisadoListoAt: null, avisadoListoPor: null, fechaFinPrevista: null, ...(recuperarEntrega && prevista && { fechaFin: prevista }) }),
        })
        .where(eq(trabajo.id, id));
      await tx.insert(trabajoAvance).values({ trabajoId: id, usuarioId: autorId, nota: `Pasó a ${NOMBRE_ESTADO_TRABAJO[estado].toLowerCase()}.` });
      await tx.insert(auditoria).values({ usuarioId: autorId, entidad: "trabajo", entidadId: id, accion: "estado", datos: { de: actual.estado, a: estado } });
      return { clienteId: actual.clienteId, sinEntrega: vuelveDeLista && !recuperarEntrega && !!prevista };
    });

  let resultado: { clienteId: number; sinEntrega: boolean };
  try {
    try {
      resultado = await cambiar(true);
    } catch (error) {
      // El espacio que liberó al marcarla lista ya se tomó: vuelve a en proceso con la entrega de hoy
      if (exclusionViolada(error) !== "trabajo_sin_cruces") throw error;
      resultado = await cambiar(false);
    }
  } catch (error) {
    if (error instanceof Conflicto) return { mensaje: error.message };
    throw error;
  }

  despuesDeCambiar(id, resultado.clienteId);
  if (resultado.sinEntrega) return { ok: true, mensaje: "La orden está en proceso, pero su espacio ya se tomó desde mañana: extiende la entrega." };
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
  if (!t || !puedeExtenderse(t.estado)) return "Solo se extiende una orden recibida o en proceso.";
  if (fechaFin <= t.fechaFin) return "La nueva entrega tiene que ser después de la actual.";
  // Una atrasada se extiende desde hoy: una fecha que ya pasó no sirve de nada
  if (fechaFin < fechaEnBolivia()) return "La nueva entrega no puede ser antes de hoy.";
  if (fechaFin > sumarDias(t.fechaInicio, DIAS_MAXIMOS_TRABAJO)) return `Una orden dura hasta ${DIAS_MAXIMOS_TRABAJO} días desde el ingreso.`;
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
  // Solo se ofrecen los activos: si es el suyo y no está, lo desactivaron
  if (!espacio) return { errores: { espacioId: espacioId === rango.espacioId ? "Ese espacio está desactivado: elige otro." : "Elige el espacio." }, valores };
  if (!espacio.libre) return { errores: { espacioId: `${espacio.nombre} está ocupado en esas fechas: elige otro espacio.` }, valores };

  const autorId = Number(usuario.id);
  // "al 2/11" o "al 2/11 en Espacio 1": lo mismo en la historia y en el aviso
  const destino = `al ${formatearFecha(fechaFin).slice(0, 5)}${espacioId !== rango.espacioId ? ` en ${espacio.nombre}` : ""}`;
  try {
    await db.transaction(async (tx) => {
      // Solo si se sigue trabajando y nadie la cambió en el medio
      const [movida] = await tx
        .update(trabajo)
        .set({ fechaFin, espacioId, updatedAt: sql`now()` })
        .where(and(eq(trabajo.id, id), inArray(trabajo.estado, ["recibido", "en_proceso"]), lte(trabajo.fechaFin, sumarDias(fechaFin, -1))))
        .returning({ id: trabajo.id });
      if (!movida) throw new Conflicto(CAMBIO);
      await tx.insert(trabajoAvance).values({ trabajoId: id, usuarioId: autorId, nota: `Entrega extendida ${destino}.` });
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
  return { ok: true, mensaje: `Entrega movida ${destino}.` };
}

/**
 * Registra que se avisó al cliente que su vehículo está listo (HU-35, RF-48): quién y cuándo. El mensaje lo arma la
 * página (con el saldo solo si quien avisa lo ve) y lo envía la persona desde WhatsApp. Datos sueltos: se validan.
 */
export async function registrarAvisoListo(datos: { id: number }): Promise<EstadoFormulario> {
  const usuario = await exigirModulo("ordenes");
  if (!puede(usuario, "avisar_cliente")) return { mensaje: "Al cliente lo avisa el dueño o el encargado." };
  const r = esquemaAvisoListo.safeParse(datos);
  if (!r.success) return { mensaje: RECARGA };
  const { id } = r.data;
  const autorId = Number(usuario.id);

  const clienteId = await db.transaction(async (tx) => {
    const [avisada] = await tx
      .update(trabajo)
      .set({ avisadoListoAt: sql`now()`, avisadoListoPor: autorId })
      .where(and(eq(trabajo.id, id), eq(trabajo.estado, "listo")))
      .returning({ clienteId: trabajo.clienteId });
    if (!avisada) return null;
    await tx.insert(auditoria).values({ usuarioId: autorId, entidad: "trabajo", entidadId: id, accion: "avisar_listo", datos: {} });
    return avisada.clienteId;
  });
  if (clienteId === null) return { mensaje: "Esa orden ya no está lista. Recarga la página." };

  despuesDeCambiar(id, clienteId);
  return { ok: true };
}

/**
 * Suma un servicio a la orden (HU-36, RF-43): solo el dueño, que es quien pone precios (RN-01). Del catálogo, con el
 * precio vigente del tamaño o el que él escriba. También sirve para cobrar lo que el cliente deja de más. No en una
 * orden entregada.
 */
export async function agregarAdicional(_previo: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const usuario = await exigirModulo("ordenes");
  if (!puede(usuario, "agregar_adicional")) return { mensaje: "Los servicios adicionales los suma el dueño." };
  const valores = { servicioId: String(datos.get("servicioId") ?? ""), varianteId: String(datos.get("varianteId") ?? ""), precio: String(datos.get("precio") ?? "") };
  const r = esquemaAdicional.safeParse({ id: datos.get("id"), ...valores });
  if (!r.success) {
    const errores = erroresDe(r.error);
    return errores.id ? { mensaje: RECARGA } : { errores, valores };
  }
  const { id, varianteId, precio } = r.data;

  const [t] = await db
    .select({ estado: trabajo.estado, clienteId: trabajo.clienteId, tamanoId: tablaVehiculo.tamanoId })
    .from(trabajo)
    .innerJoin(tablaVehiculo, eq(trabajo.vehiculoId, tablaVehiculo.id))
    .where(eq(trabajo.id, id));
  if (!t) return { mensaje: "Esa orden ya no existe." };
  if (!estaAbierta(t.estado)) return { mensaje: "Solo se suman servicios a una orden abierta (recibida, en proceso o lista)." };
  // Solo esa variante, con su precio vigente para el tamaño: no hace falta el catálogo entero
  const [opcion] = await opcionesDeServicio(t.tamanoId, varianteId);
  if (!opcion) return { errores: { varianteId: "Ese servicio ya no se ofrece: elige otro." }, valores };
  const descripcion = descripcionLinea(opcion.servicio, opcion.variante);
  const autorId = Number(usuario.id);

  let final: string;
  try {
    final = await db.transaction(async (tx) => {
      const [actual] = await tx.select({ estado: trabajo.estado, descuento: trabajo.descuento }).from(trabajo).where(eq(trabajo.id, id)).for("update");
      if (!actual || !estaAbierta(actual.estado)) throw new Conflicto(CAMBIO);
      const lineas = await tx.select({ precio: trabajoLinea.precio, esAdicional: trabajoLinea.esAdicional, orden: trabajoLinea.orden }).from(trabajoLinea).where(eq(trabajoLinea.trabajoId, id));
      await tx.insert(trabajoLinea).values({ trabajoId: id, varianteId, descripcion, precio, esAdicional: true, orden: Math.max(-1, ...lineas.map((l) => l.orden)) + 1 });
      // En la historia sin el precio: la ve también el técnico (RN-12)
      await tx.insert(trabajoAvance).values({ trabajoId: id, usuarioId: autorId, nota: `Se sumó un servicio: ${descripcion}.` });
      await tx.insert(auditoria).values({ usuarioId: autorId, entidad: "trabajo", entidadId: id, accion: "adicional", datos: { varianteId, descripcion, precio } });
      return precioCotizadoYFinal([...lineas, { precio, esAdicional: true }], actual.descuento).final;
    });
  } catch (error) {
    if (error instanceof Conflicto) return { mensaje: error.message, valores };
    throw error;
  }

  despuesDeCambiar(id, t.clienteId);
  return { ok: true, mensaje: `Servicio agregado. Precio final: ${mostrarMonto(final)} Bs.` };
}

const SALDO_SIN_PERMISO = "Queda saldo pendiente: la entrega con saldo la autoriza el dueño o quien tenga el permiso.";

/**
 * Entrega el vehículo (HU-36, RF-43, RF-49, CU-19). Con saldo pendiente, solo el dueño o un encargado con "autorizar
 * entrega con saldo", y queda quién lo autorizó (RN-13). El saldo se vuelve a calcular con la orden bloqueada: un pago
 * o un adicional a último momento cuenta. Cada servicio que genera mantenimiento programa su recordatorio (RN-08).
 */
export async function entregarVehiculo(_previo: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const usuario = await exigirModulo("ordenes");
  if (!puede(usuario, "entregar_vehiculo")) return { mensaje: "El vehículo lo entrega el dueño o el encargado." };
  const r = esquemaEntregar.safeParse({ id: datos.get("id"), conSaldo: datos.get("conSaldo") ?? undefined });
  if (!r.success) return { mensaje: RECARGA };
  const { id, conSaldo } = r.data;
  const autorId = Number(usuario.id);
  const hoy = fechaEnBolivia();
  const { intervalo_mantenimiento_meses: meses } = await obtenerParametros();

  let resultado: { clienteId: number; saldo: string | null; conMantenimiento: boolean };
  try {
    resultado = await db.transaction(async (tx) => {
      const [t] = await tx
        .select({ estado: trabajo.estado, descuento: trabajo.descuento, clienteId: trabajo.clienteId, vehiculoId: trabajo.vehiculoId })
        .from(trabajo)
        .where(eq(trabajo.id, id))
        .for("update");
      if (!t) throw new Conflicto("Esa orden ya no existe.");
      if (t.estado !== "listo") throw new Conflicto("Solo se entrega una orden lista.");
      const [lineas, pagos] = await Promise.all([
        tx.select({ precio: trabajoLinea.precio }).from(trabajoLinea).where(eq(trabajoLinea.trabajoId, id)),
        tx.select({ monto: pago.monto, anulado: pago.anulado }).from(pago).where(eq(pago.trabajoId, id)),
      ]);
      const { saldo } = calcularSaldo(
        lineas.map((l) => l.precio),
        t.descuento,
        pagos,
      );
      const conDeuda = !estaPagada(saldo);
      if (conDeuda && !puede(usuario, "entrega_con_saldo")) throw new Conflicto(SALDO_SIN_PERMISO);
      if (conDeuda && !conSaldo) {
        // El monto, solo a quien ve pagos (RN-12); el error va con la casilla, que así aparece aunque al abrir no hubiera saldo
        const monto = puedeVerModulo(usuario, "pagos") ? ` de ${mostrarMonto(saldo)} Bs` : "";
        throw new Conflicto(`Queda un saldo${monto}: marca «Entregar con saldo pendiente» para confirmar.`, "conSaldo");
      }

      await tx
        .update(trabajo)
        .set({
          estado: "entregado",
          entregadoAt: sql`now()`,
          entregadoPor: autorId,
          entregaConSaldoAutorizadaPor: conDeuda ? autorId : null,
          saldoAlEntregar: saldo,
          // Si sale antes de la entrega aproximada, la agenda deja de mostrarlo esos días
          fechaFin: sql`least(${trabajo.fechaFin}, greatest(${trabajo.fechaInicio}, ${hoy}::date))`,
          updatedAt: sql`now()`,
        })
        .where(eq(trabajo.id, id));

      // RN-08: un recordatorio por servicio que lo genera, para dentro de los meses de Configuración
      const conMantenimiento = await serviciosConMantenimiento(id, tx);
      if (conMantenimiento.length > 0) {
        await tx
          .insert(recordatorioMantenimiento)
          .values(conMantenimiento.map((s) => ({ trabajoOrigenId: id, clienteId: t.clienteId, vehiculoId: t.vehiculoId, servicioId: s.id, fechaProgramada: sumarMeses(hoy, meses) })))
          .onConflictDoNothing();
      }

      // En la historia sin el monto: la ve también el técnico (RN-12)
      await tx.insert(trabajoAvance).values({ trabajoId: id, usuarioId: autorId, nota: conDeuda ? "Vehículo entregado con saldo pendiente." : "Vehículo entregado." });
      await tx.insert(auditoria).values({
        usuarioId: autorId,
        entidad: "trabajo",
        entidadId: id,
        accion: "entregar",
        datos: { saldo, conSaldo: conDeuda, mantenimientos: conMantenimiento.map((s) => s.id) },
      });
      return { clienteId: t.clienteId, saldo: conDeuda ? saldo : null, conMantenimiento: conMantenimiento.length > 0 };
    });
  } catch (error) {
    if (error instanceof Conflicto) return error.campo ? { errores: { [error.campo]: error.message } } : { mensaje: error.message };
    throw error;
  }

  despuesDeCambiar(id, resultado.clienteId);
  if (resultado.conMantenimiento) revalidatePath("/panel/mantenimientos");
  redirect(`/panel/ordenes/${id}?entregado=1`);
}

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
  redirect(`/panel/ordenes/${id}?publicado=1`);
}
