"use server";

import { and, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { auditoria, cliente, consulta, cotizacion, pago, recordatorioMantenimiento, servicio, trabajo, trabajoLinea, variante, vehiculo } from "@/db/esquema";
import { fechaEnBolivia, formatearFecha } from "@/lib/fechas";
import { erroresDe, exclusionViolada, indiceUnicoViolado, type EstadoFormulario } from "@/lib/formularios";
import { puedeVerModulo } from "@/lib/permisos";
import { exigirModulo } from "@/lib/sesion";
import { sucursalPrincipal } from "@/modulos/configuracion/consultas";
import { mostrarMonto } from "@/modulos/catalogo/reglas";
import { descripcionLinea, montoNoMayor } from "@/modulos/cotizaciones/reglas";
import { borrarFotosSueltas, soltarFotosIngreso } from "@/modulos/ordenes/fotos";
import { ESTADOS_RECORDATORIO_ABIERTO } from "@/modulos/mantenimientos/reglas";
import { descartarComprobante, guardarComprobante } from "@/modulos/pagos/comprobante";
import { calcularSaldo } from "@/modulos/pagos/reglas";
import { datosDeCotizacion, espaciosEnFechas, type EspacioDisponible } from "./consultas";
import { entradaReserva, esquemaAdelanto, esquemaCancelar, esquemaConsultaEspacios, esquemaFechas, esquemaReprogramar, esquemaReserva } from "./esquemas";

// Agenda (HU-30). Entra el dueño o un encargado con "Agenda"; el adelanto, solo con "Pagos" (o el dueño, RN-12). Un
// espacio no tiene dos vehículos el mismo día (RN-06): la pantalla solo ofrece los libres y la base
// rechaza un cruce aunque dos personas reserven a la vez (D-5). Especificación: docs/08-desarrollo/etapas/C3-agenda-pagos.md.

const ESPACIO_OCUPADO = "Ese espacio se ocupó recién: elige otro.";
const COTIZACION_CAMBIO = "Esa cotización ya fue agendada o tiene una versión nueva. Vuelve a la cotización.";

/** Algo cambió entre la revisión y la escritura: se lanza dentro de la transacción para deshacerla entera. */
class Conflicto extends Error {}

/** Los espacios y si están libres en esas fechas, para el formulario (datos sueltos: se validan). */
export async function consultarEspacios(datos: { fechaInicio: string; fechaFin: string; excepto?: number }): Promise<EspacioDisponible[] | null> {
  await exigirModulo("agenda");
  const entrada = esquemaConsultaEspacios.safeParse(datos);
  if (!entrada.success) return null;
  const fechas = esquemaFechas.safeParse(entrada.data);
  // Con fechas que no valen no hay nada que ofrecer: el formulario muestra su error al enviar
  if (!fechas.success) return null;
  return espaciosEnFechas(fechas.data.fechaInicio, fechas.data.fechaFin, entrada.data.excepto);
}

type Linea = { varianteId: number; descripcion: string; precio: string };

/**
 * Agenda una reserva (HU-30, RF-36, RF-37): desde la cotización vigente de una consulta (que pasa a "aceptada" y la
 * consulta a "confirmado") o directa, con servicios del catálogo. Con el adelanto, si lo hay (RN-04). La directa que
 * viene de un mantenimiento (HU-38) deja el recordatorio "agendado" con la reserva. Todo o nada.
 */
export async function agendarReserva(_previo: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const usuario = await exigirModulo("agenda");
  const conPagos = puedeVerModulo(usuario, "pagos");
  const entrada = entradaReserva(datos);
  const r = esquemaReserva.safeParse(entrada.reserva);
  const f = esquemaFechas.safeParse(entrada.fechas);
  // Sin "Pagos" no se registra adelanto: la reserva queda "sin adelanto" y lo carga quien cobra
  const a = conPagos ? esquemaAdelanto.safeParse(entrada.adelanto) : ({ success: true, data: { sinAdelanto: true } } as const);

  const errores: Record<string, string> = {};
  if (!r.success) Object.assign(errores, erroresDe(r.error));
  if (!f.success) Object.assign(errores, erroresDe(f.error));
  if (!a.success) {
    const deAdelanto = erroresDe(a.error);
    if (deAdelanto.monto) errores.adelanto = deAdelanto.monto;
    if (deAdelanto.metodo) errores.metodo = deAdelanto.metodo;
  }
  if (!r.success || !f.success || !a.success) {
    if (errores.origen || errores.cotizacionId || errores.clienteId || errores.vehiculoId) return { mensaje: "No se pudo leer el pedido. Recarga la página." };
    return { errores };
  }
  const d = r.data;
  const { fechaInicio, fechaFin } = f.data;

  // Cliente, vehículo y servicios: de la cotización o de la reserva directa
  let clienteId: number;
  let vehiculoId: number;
  let consultaId: number | null = null;
  let cotizacionId: number | null = null;
  let descuento = "0.00";
  let lineas: Linea[];
  let recordatorioId: number | null = null;
  if (d.origen === "cotizacion") {
    const c = await datosDeCotizacion(d.cotizacionId);
    if (!c) return { mensaje: "Esa cotización ya no existe." };
    if (!c.agendable) return { mensaje: COTIZACION_CAMBIO };
    if (!c.activos) return { mensaje: "El cliente o el vehículo de esa cotización ya no está activo. Reactívalo en su ficha." };
    ({ consultaId, cotizacionId, descuento } = c);
    clienteId = c.cliente.id;
    vehiculoId = c.vehiculo.id;
    lineas = c.lineas;
  } else {
    // Una reserva directa lleva precios: la arma el dueño o quien registra pagos
    if (!conPagos) return { mensaje: "La reserva directa la arma el dueño o quien registra pagos: lleva precios." };
    const [suyo] = await db
      .select({ id: vehiculo.id })
      .from(vehiculo)
      .innerJoin(cliente, eq(vehiculo.clienteId, cliente.id))
      .where(and(eq(vehiculo.id, d.vehiculoId), eq(vehiculo.clienteId, d.clienteId), eq(vehiculo.activo, true), eq(cliente.activo, true)));
    if (!suyo) return { mensaje: "Ese cliente o vehículo ya no está activo. Vuelve a elegirlo." };
    clienteId = d.clienteId;
    vehiculoId = d.vehiculoId;
    recordatorioId = d.recordatorioId;
    if (recordatorioId && !puedeVerModulo(usuario, "mantenimientos")) return { mensaje: "Los mantenimientos los agenda el dueño o quien tiene «Mantenimientos»." };
    const opciones = await db
      .select({ id: variante.id, servicio: servicio.nombre, variante: variante.nombre })
      .from(variante)
      .innerJoin(servicio, eq(variante.servicioId, servicio.id))
      .where(and(inArray(variante.id, [...new Set(d.lineas.map((l) => l.varianteId))]), eq(variante.activo, true), eq(servicio.activo, true)));
    const errLineas: Record<string, string> = {};
    lineas = d.lineas.map((l, i) => {
      const o = opciones.find((x) => x.id === l.varianteId);
      if (!o) errLineas[`lineas.${i}`] = "Ese servicio ya no se ofrece: quítalo.";
      return { varianteId: l.varianteId, descripcion: o ? descripcionLinea(o.servicio, o.variante) : "", precio: l.precio };
    });
    if (Object.keys(errLineas).length > 0) return { errores: errLineas };
  }

  // Lo que el esquema no sabe: el espacio y el tope del adelanto
  const espacios = await espaciosEnFechas(fechaInicio, fechaFin);
  const espacio = espacios.find((e) => e.id === d.espacioId);
  if (!espacio) errores.espacioId = "Elige el espacio.";
  else if (!espacio.libre) errores.espacioId = ESPACIO_OCUPADO;
  const { total } = calcularSaldo(
    lineas.map((l) => l.precio),
    descuento,
    [],
  );
  const adelanto = a.data.sinAdelanto ? null : a.data;
  if (adelanto && !montoNoMayor(adelanto.monto, total)) errores.adelanto = `El adelanto no puede ser mayor que el total (${mostrarMonto(total)} Bs).`;
  if (Object.keys(errores).length > 0) return { errores };

  const { id: sucursalId } = await sucursalPrincipal();
  const autorId = Number(usuario.id);
  // El comprobante del adelanto, si vino: se sube antes de la transacción y se borra si la reserva no se guarda
  const foto = await guardarComprobante(adelanto ? datos.get("comprobante") : null, autorId);
  if (!foto.ok) return { errores: { comprobante: foto.error } };
  const comprobanteId = foto.archivoId;
  let resultado: { id: number };
  try {
    resultado = await db.transaction(async (tx) => {
      if (cotizacionId && consultaId) {
        // Solo la vigente de una consulta "cotizado": si otra persona la agendó o la corrigió recién, no se toca
        const [aceptada] = await tx
          .update(cotizacion)
          .set({ estado: "aceptada" })
          .where(and(eq(cotizacion.id, cotizacionId), eq(cotizacion.estado, "enviada")))
          .returning({ id: cotizacion.id });
        const [confirmada] = await tx
          .update(consulta)
          .set({ estado: "confirmado", ultimoMovimientoAt: sql`now()` })
          .where(and(eq(consulta.id, consultaId), eq(consulta.estado, "cotizado")))
          .returning({ id: consulta.id });
        // Lanzar (y no devolver) deshace la transacción: si no, la cotización quedaría aceptada sin reserva
        if (!aceptada || !confirmada) throw new Conflicto(COTIZACION_CAMBIO);
      }
      const [nuevo] = await tx
        .insert(trabajo)
        .values({
          sucursalId,
          clienteId,
          vehiculoId,
          consultaId,
          cotizacionId,
          espacioId: d.espacioId,
          fechaInicio,
          fechaFin,
          horaIngreso: d.horaIngreso,
          descuento,
          nota: d.nota,
          createdBy: autorId,
        })
        .returning({ id: trabajo.id });
      await tx.insert(trabajoLinea).values(lineas.map((l, orden) => ({ ...l, trabajoId: nuevo.id, orden })));
      await tx.insert(auditoria).values({
        usuarioId: autorId,
        entidad: "trabajo",
        entidadId: nuevo.id,
        accion: "agendar",
        datos: { espacioId: d.espacioId, fechaInicio, fechaFin, cotizacionId },
      });
      if (adelanto) {
        const [p] = await tx
          .insert(pago)
          .values({ trabajoId: nuevo.id, monto: adelanto.monto, metodo: adelanto.metodo, tipo: "adelanto", fecha: fechaEnBolivia(), comprobanteArchivoId: comprobanteId, createdBy: autorId })
          .returning({ id: pago.id });
        await tx.insert(auditoria).values({ usuarioId: autorId, entidad: "pago", entidadId: p.id, accion: "crear", datos: { trabajoId: nuevo.id, monto: adelanto.monto, tipo: "adelanto", metodo: adelanto.metodo, fecha: fechaEnBolivia(), comprobanteArchivoId: comprobanteId } });
      }
      if (recordatorioId) {
        // Solo uno abierto y de este cliente y vehículo: si otra persona lo agendó o lo cerró recién, no se reserva
        const [agendado] = await tx
          .update(recordatorioMantenimiento)
          .set({ estado: "agendado", trabajoAgendadoId: nuevo.id, updatedAt: sql`now()` })
          .where(
            and(
              eq(recordatorioMantenimiento.id, recordatorioId),
              eq(recordatorioMantenimiento.clienteId, clienteId),
              eq(recordatorioMantenimiento.vehiculoId, vehiculoId),
              inArray(recordatorioMantenimiento.estado, [...ESTADOS_RECORDATORIO_ABIERTO]),
            ),
          )
          .returning({ id: recordatorioMantenimiento.id });
        if (!agendado) throw new Conflicto("Ese mantenimiento ya se agendó o se cerró. Vuelve a Mantenimientos.");
        await tx.insert(auditoria).values({ usuarioId: autorId, entidad: "recordatorio_mantenimiento", entidadId: recordatorioId, accion: "agendar", datos: { trabajoId: nuevo.id } });
      }
      // Un cliente que reserva sube en la lista de recientes de Clientes
      await tx.update(cliente).set({ updatedAt: sql`now()` }).where(eq(cliente.id, clienteId));
      return { id: nuevo.id };
    });
  } catch (error) {
    await descartarComprobante(comprobanteId);
    if (error instanceof Conflicto) return { mensaje: error.message };
    // Dos personas reservaron el mismo espacio a la vez: la base frenó la segunda (D-5)
    if (exclusionViolada(error) === "trabajo_sin_cruces") return { errores: { espacioId: ESPACIO_OCUPADO } };
    if (indiceUnicoViolado(error) === "trabajo_cotizacion_unica") return { mensaje: "Esa cotización ya fue agendada." };
    throw error;
  }

  despuesDeCambiar(resultado.id, clienteId, consultaId);
  if (recordatorioId) revalidatePath("/panel/mantenimientos");
  redirect(`/panel/agenda/${resultado.id}?agendada=1`);
}

/** Revalida lo que muestra una reserva (y lo que depende de ella) después de agendarla o cambiarla. */
function despuesDeCambiar(id: number, clienteId: number, consultaId: number | null) {
  revalidatePath("/panel/agenda");
  revalidatePath(`/panel/agenda/${id}`);
  revalidatePath(`/panel/clientes/${clienteId}`);
  if (consultaId) {
    revalidatePath("/panel/cotizaciones");
    revalidatePath(`/panel/cotizaciones/${consultaId}`);
  }
}

/**
 * Mueve una reserva agendada a otras fechas o a otro espacio (HU-31, RF-39), con la misma validación que al agendar:
 * solo un espacio libre en esos días (sin contar la propia reserva), y la base rechaza un cruce (D-5).
 */
export async function reprogramarReserva(_previo: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const usuario = await exigirModulo("agenda");
  const r = esquemaReprogramar.safeParse({ id: datos.get("id"), espacioId: datos.get("espacioId") });
  const f = esquemaFechas.safeParse({ fechaInicio: String(datos.get("fechaInicio") ?? ""), fechaFin: String(datos.get("fechaFin") ?? "") });
  const errores: Record<string, string> = {};
  if (!r.success) Object.assign(errores, erroresDe(r.error));
  if (!f.success) Object.assign(errores, erroresDe(f.error));
  if (!r.success || !f.success) return errores.id ? { mensaje: "No se pudo leer el pedido. Recarga la página." } : { errores };
  const { id, espacioId } = r.data;
  const { fechaInicio, fechaFin } = f.data;

  const [actual] = await db
    .select({ estado: trabajo.estado, clienteId: trabajo.clienteId, consultaId: trabajo.consultaId, espacioId: trabajo.espacioId, fechaInicio: trabajo.fechaInicio, fechaFin: trabajo.fechaFin })
    .from(trabajo)
    .where(eq(trabajo.id, id));
  if (!actual) return { mensaje: "Esa reserva ya no existe." };
  if (actual.estado !== "agendado") return { mensaje: "Solo se reprograma una reserva agendada." };

  const espacio = (await espaciosEnFechas(fechaInicio, fechaFin, id)).find((e) => e.id === espacioId);
  if (!espacio) return { errores: { espacioId: "Elige el espacio." } };
  if (!espacio.libre) return { errores: { espacioId: ESPACIO_OCUPADO } };

  let sueltas: number[];
  try {
    sueltas = await db.transaction(async (tx) => {
      // Solo si sigue agendada: si otra persona la canceló recién, no se mueve
      const [movida] = await tx
        .update(trabajo)
        .set({ espacioId, fechaInicio, fechaFin, updatedAt: sql`now()` })
        .where(and(eq(trabajo.id, id), eq(trabajo.estado, "agendado")))
        .returning({ id: trabajo.id });
      if (!movida) throw new Conflicto("Esa reserva cambió recién. Recarga la página.");
      await tx.insert(auditoria).values({
        usuarioId: Number(usuario.id),
        entidad: "trabajo",
        entidadId: id,
        accion: "reprogramar",
        datos: { antes: { espacioId: actual.espacioId, fechaInicio: actual.fechaInicio, fechaFin: actual.fechaFin }, despues: { espacioId, fechaInicio, fechaFin } },
      });
      // Las fotos de ingreso que se alcanzaron a tomar no prueban cómo llega otro día
      return soltarFotosIngreso(tx, id);
    });
  } catch (error) {
    if (error instanceof Conflicto) return { mensaje: error.message };
    if (exclusionViolada(error) === "trabajo_sin_cruces") return { errores: { espacioId: ESPACIO_OCUPADO } };
    throw error;
  }

  await borrarFotosSueltas(sueltas);
  despuesDeCambiar(id, actual.clienteId, actual.consultaId);
  return { ok: true, mensaje: `Reserva movida al ${formatearFecha(fechaInicio).slice(0, 5)} en ${espacio.nombre}.` };
}

/**
 * Cancela una reserva agendada, con motivo (HU-31, RF-39). Los pagos no se tocan: el adelanto queda como ingreso
 * (RN-05). Si salió de una consulta, la consulta pasa a "perdido" (motivo "otro", con el de la cancelación) y la
 * cotización vuelve a estar vigente: si el cliente vuelve, se reabre la consulta y se agenda de nuevo. Las dos van
 * juntas: si la consulta ya no estaba "confirmado" (alguien la movió a mano), ninguna se toca.
 */
export async function cancelarReserva(_previo: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const usuario = await exigirModulo("agenda");
  const valores = { motivo: String(datos.get("motivo") ?? "") };
  const r = esquemaCancelar.safeParse({ id: datos.get("id"), ...valores });
  if (!r.success) {
    const errores = erroresDe(r.error);
    return errores.id ? { mensaje: "No se pudo leer el pedido. Recarga la página." } : { errores, valores };
  }
  const { id, motivo } = r.data;
  const autorId = Number(usuario.id);

  const [actual] = await db
    .select({ estado: trabajo.estado, clienteId: trabajo.clienteId, consultaId: trabajo.consultaId, cotizacionId: trabajo.cotizacionId })
    .from(trabajo)
    .where(eq(trabajo.id, id));
  if (!actual) return { mensaje: "Esa reserva ya no existe." };
  if (actual.estado !== "agendado") return { mensaje: "Solo se cancela una reserva agendada." };

  let sueltas: number[];
  let conMantenimiento = false;
  try {
    sueltas = await db.transaction(async (tx) => {
      const [cancelada] = await tx
        .update(trabajo)
        .set({ estado: "cancelado", motivoCancelacion: motivo, canceladoAt: sql`now()`, canceladoPor: autorId, updatedAt: sql`now()` })
        .where(and(eq(trabajo.id, id), eq(trabajo.estado, "agendado")))
        .returning({ id: trabajo.id });
      if (!cancelada) throw new Conflicto("Esa reserva cambió recién. Recarga la página.");
      let consultaPerdida = false;
      let cotizacionVigente = false;
      if (actual.consultaId) {
        const [perdida] = await tx
          .update(consulta)
          .set({ estado: "perdido", motivoPerdida: "otro", detallePerdida: `Reserva cancelada: ${motivo}`.slice(0, 300), ultimoMovimientoAt: sql`now()` })
          .where(and(eq(consulta.id, actual.consultaId), eq(consulta.estado, "confirmado")))
          .returning({ id: consulta.id });
        consultaPerdida = !!perdida;
      }
      if (actual.cotizacionId && consultaPerdida) {
        const [vigente] = await tx
          .update(cotizacion)
          .set({ estado: "enviada" })
          .where(and(eq(cotizacion.id, actual.cotizacionId), eq(cotizacion.estado, "aceptada")))
          .returning({ id: cotizacion.id });
        // Una consulta perdida con su cotización todavía aceptada no se podría volver a agendar
        if (!vigente) throw new Conflicto("Esa reserva cambió recién. Recarga la página.");
        cotizacionVigente = true;
      }
      // El mantenimiento que se agendó con esta reserva vuelve a la lista, como estaba (avisado o por avisar)
      const devueltos = await tx
        .update(recordatorioMantenimiento)
        .set({ estado: sql`case when ${recordatorioMantenimiento.avisadoAt} is null then 'pendiente' else 'avisado' end`, trabajoAgendadoId: null, updatedAt: sql`now()` })
        .where(eq(recordatorioMantenimiento.trabajoAgendadoId, id))
        .returning({ id: recordatorioMantenimiento.id });
      conMantenimiento = devueltos.length > 0;
      await tx.insert(auditoria).values({ usuarioId: autorId, entidad: "trabajo", entidadId: id, accion: "cancelar", datos: { motivo, consultaPerdida, cotizacionVigente, mantenimientos: devueltos.map((r) => r.id) } });
      // Las fotos de ingreso que se alcanzaron a tomar ya no sirven: el vehículo no se recibió
      return soltarFotosIngreso(tx, id);
    });
  } catch (error) {
    if (error instanceof Conflicto) return { mensaje: error.message };
    throw error;
  }

  await borrarFotosSueltas(sueltas);
  despuesDeCambiar(id, actual.clienteId, actual.consultaId);
  if (conMantenimiento) revalidatePath("/panel/mantenimientos");
  const [conPagos] = await db.select({ id: pago.id }).from(pago).where(and(eq(pago.trabajoId, id), eq(pago.anulado, false))).limit(1);
  return { ok: true, mensaje: conPagos ? "Reserva cancelada. El adelanto queda como ingreso." : "Reserva cancelada." };
}
