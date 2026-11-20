"use server";

import { and, eq, inArray, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { auditoria, trabajo, trabajoAvance, trabajoLinea, vehiculo as tablaVehiculo } from "@/db/esquema";
import { fechaEnBolivia, formatearFecha, sumarDias } from "@/lib/fechas";
import { erroresDe, type EstadoFormulario } from "@/lib/formularios";
import { puede } from "@/lib/permisos";
import { exigirModulo } from "@/lib/sesion";
import type { EstadoTrabajo } from "@/db/esquema/trabajos";
import { DIAS_MAXIMOS_TRABAJO, NOMBRE_ESTADO_TRABAJO } from "@/modulos/agenda/reglas";
import { mostrarMonto } from "@/modulos/catalogo/reglas";
import { opcionesDeServicio } from "@/modulos/cotizaciones/consultas/servicios";
import { descripcionLinea } from "@/modulos/cotizaciones/reglas";
import { precioCotizadoYFinal } from "@/modulos/pagos/reglas";
import { esquemaAdicional, esquemaAvisoListo, esquemaEstadoOrden, esquemaExtender } from "../esquemas";
import { estaAbierta, puedeExtenderse, transicionOrden } from "../reglas";
import { CAMBIO, Conflicto, RECARGA, despuesDeCambiar } from "./comun";

// Órdenes (C4): El estado de la orden: avanzar o volver un paso, extender la entrega, avisar que está lista y agregar un
// servicio adicional (HU-34).
// Entra el dueño o el encargado con "Órdenes" (pedido 32). Especificación: docs/08-desarrollo/etapas/C4-taller-entrega.md.

const MENSAJE_ESTADO: Partial<Record<EstadoTrabajo, string>> = {
  recibido: "La orden volvió a recibida.",
  en_proceso: "La orden está en proceso.",
  listo: "La orden está lista. Avisa al cliente.",
};

/**
 * Cambia el estado de la orden un paso adelante o atrás (HU-34, RF-41). Al pasar a
 * listo, si la entrega aproximada es después de hoy, pasa a hoy: su lugar queda libre desde mañana (decisión del 20/10).
 * Si se marcó lista por error y vuelve a en proceso, recupera esa entrega (pedido 55: el auto sigue en el taller, sin
 * contar lugares, como al extender); y el aviso al cliente se borra, porque ya no es cierto.
 */
export async function cambiarEstadoOrden(_previo: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const usuario = await exigirModulo("ordenes");
  const r = esquemaEstadoOrden.safeParse({ id: datos.get("id"), estado: datos.get("estado") });
  if (!r.success) return { mensaje: RECARGA };
  const { id, estado } = r.data;
  const autorId = Number(usuario.id);
  const hoy = fechaEnBolivia();

  const cambiar = () =>
    db.transaction(async (tx) => {
      const [actual] = await tx
        .select({ estado: trabajo.estado, clienteId: trabajo.clienteId, fechaFin: trabajo.fechaFin, fechaFinPrevista: trabajo.fechaFinPrevista })
        .from(trabajo)
        .where(eq(trabajo.id, id))
        .for("update");
      if (!actual) throw new Conflicto("Esa orden ya no existe.");
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
          ...(vuelveDeLista && { avisadoListoAt: null, avisadoListoPor: null, fechaFinPrevista: null, ...(prevista && { fechaFin: prevista }) }),
        })
        .where(eq(trabajo.id, id));
      await tx.insert(trabajoAvance).values({ trabajoId: id, usuarioId: autorId, nota: `Pasó a ${NOMBRE_ESTADO_TRABAJO[estado].toLowerCase()}.` });
      await tx.insert(auditoria).values({ usuarioId: autorId, entidad: "trabajo", entidadId: id, accion: "estado", datos: { de: actual.estado, a: estado } });
      return { clienteId: actual.clienteId };
    });

  let resultado: { clienteId: number };
  try {
    resultado = await cambiar();
  } catch (error) {
    if (error instanceof Conflicto) return { mensaje: error.message };
    throw error;
  }

  despuesDeCambiar(id, resultado.clienteId);
  return { ok: true, mensaje: MENSAJE_ESTADO[estado] };
}

/** Las fechas para extender una orden: desde su ingreso (ya pasó) hasta la nueva entrega; null si no valen. */
async function rangoParaExtender(id: number, fechaFin: string): Promise<{ fechaInicio: string; fechaFin: string; antes: string; clienteId: number } | string> {
  const [t] = await db
    .select({ estado: trabajo.estado, fechaInicio: trabajo.fechaInicio, fechaFin: trabajo.fechaFin, clienteId: trabajo.clienteId })
    .from(trabajo)
    .where(eq(trabajo.id, id));
  if (!t || !puedeExtenderse(t.estado)) return "Solo se extiende una orden recibida o en proceso.";
  if (fechaFin <= t.fechaFin) return "La nueva entrega tiene que ser después de la actual.";
  // Una atrasada se extiende desde hoy: una fecha que ya pasó no sirve de nada
  if (fechaFin < fechaEnBolivia()) return "La nueva entrega no puede ser antes de hoy.";
  if (fechaFin > sumarDias(t.fechaInicio, DIAS_MAXIMOS_TRABAJO)) return `Una orden dura hasta ${DIAS_MAXIMOS_TRABAJO} días desde el ingreso.`;
  return { fechaInicio: t.fechaInicio, fechaFin, antes: t.fechaFin, clienteId: t.clienteId };
}

/**
 * Extiende la entrega de una orden que se atrasa (HU-34; decisión del 20/10). Pedido 55: solo cambia la fecha, sin contar
 * lugares: el auto ya está en el taller y no se lo puede rechazar. Si un día queda con más autos que lugares, la Agenda lo
 * marca.
 */
export async function extenderEntrega(_previo: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const usuario = await exigirModulo("ordenes");
  if (!puede(usuario, "extender_entrega")) return { mensaje: "La entrega la extiende el dueño o el encargado." };
  const valores = { fechaFin: String(datos.get("fechaFin") ?? "") };
  const r = esquemaExtender.safeParse({ id: datos.get("id"), ...valores });
  if (!r.success) {
    const errores = erroresDe(r.error);
    return errores.id ? { mensaje: RECARGA } : { errores, valores };
  }
  const { id, fechaFin } = r.data;
  const rango = await rangoParaExtender(id, fechaFin);
  if (typeof rango === "string") return { errores: { fechaFin: rango }, valores };

  const autorId = Number(usuario.id);
  // "al 2/11": lo mismo en la historia y en el aviso
  const destino = `al ${formatearFecha(fechaFin).slice(0, 5)}`;
  try {
    await db.transaction(async (tx) => {
      // Solo si se sigue trabajando y nadie la cambió en el medio
      const [movida] = await tx
        .update(trabajo)
        .set({ fechaFin, updatedAt: sql`now()` })
        .where(and(eq(trabajo.id, id), inArray(trabajo.estado, ["recibido", "en_proceso"]), lte(trabajo.fechaFin, sumarDias(fechaFin, -1))))
        .returning({ id: trabajo.id });
      if (!movida) throw new Conflicto(CAMBIO);
      await tx.insert(trabajoAvance).values({ trabajoId: id, usuarioId: autorId, nota: `Entrega extendida ${destino}.` });
      await tx.insert(auditoria).values({
        usuarioId: autorId,
        entidad: "trabajo",
        entidadId: id,
        accion: "extender",
        datos: { antes: { fechaFin: rango.antes }, despues: { fechaFin } },
      });
    });
  } catch (error) {
    if (error instanceof Conflicto) return { mensaje: error.message, valores };
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
      // En la historia sin el precio: la ve también quien no tiene Pagos (RN-12)
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
