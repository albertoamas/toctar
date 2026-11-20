"use server";

import { and, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect, RedirectType } from "next/navigation";
import { db } from "@/db";
import { auditoria, cliente, consulta, cotizacion, pago, recordatorioMantenimiento, servicio, trabajo, trabajoLinea, variante, vehiculo } from "@/db/esquema";
import { diaLegible, fechaEnBolivia } from "@/lib/fechas";
import { erroresDe, indiceUnicoViolado, type EstadoFormulario } from "@/lib/formularios";
import type { z } from "zod";
import { clienteConTelefono } from "@/modulos/clientes/consultas";
import { esquemaCliente, esquemaVehiculo } from "@/modulos/clientes/esquemas";
import { conMarcaDeLaLista, type EstadoCliente, type Existentes, revisarVehiculo } from "@/modulos/clientes/servidor";
import { camposConPrefijo, erroresConPrefijo, leerValores, PREFIJO_VEHICULO } from "@/modulos/clientes/valores";
import { puedeVerModulo } from "@/lib/permisos";
import { exigirModulo } from "@/lib/sesion";
import { sucursalPrincipal } from "@/modulos/configuracion/consultas";
import { mostrarMonto } from "@/modulos/catalogo/reglas";
import { tieneReservaActiva } from "@/modulos/cotizaciones/consultas/lista";
import { descripcionLinea, montoNoMayor } from "@/modulos/cotizaciones/reglas";
import { borrarFotosSueltas, soltarFotosIngreso } from "@/modulos/ordenes/fotos";
import { ESTADOS_RECORDATORIO_ABIERTO } from "@/modulos/mantenimientos/reglas";
import { descartarComprobante, guardarComprobante } from "@/modulos/pagos/comprobante";
import { calcularSaldo, tipoDePago } from "@/modulos/pagos/reglas";
import { bloquearSucursal, disponibilidad, type Disponibilidad } from "./consultas/lugares";
import { textoDiasLlenos } from "./reglas";
import { datosDeCotizacion } from "./consultas/reservar";
import { entradaReserva, esquemaAdelanto, esquemaCancelar, esquemaConsultaLugares, esquemaFechas, esquemaReprogramar, esquemaReserva } from "./esquemas";
import { conDesde, leerDesde } from "@/lib/volver";

// Agenda (HU-30). Entra el dueño o un encargado con "Agenda"; el adelanto, solo con "Pagos" (o el dueño, RN-12). Un
// espacio no tiene dos vehículos el mismo día (RN-06): la pantalla solo ofrece los libres y la base
// rechaza un cruce aunque dos personas reserven a la vez (D-5). Especificación: docs/08-desarrollo/etapas/C3-agenda-pagos.md.

/** Dos personas reservaron el último lugar a la vez: la segunda, ya con la sucursal bloqueada, ve el día lleno. */
const LLENO_RECIEN = "Ese día se llenó recién. Elige otra fecha.";
const COTIZACION_CAMBIO = "Esa cotización ya fue reservada o tiene una versión nueva. Vuelve a la cotización.";

/** Algo cambió entre la revisión y la escritura: se lanza dentro de la transacción para deshacerla entera. */
class Conflicto extends Error {}

/** Un día del rango se llenó entre la revisión y la escritura (otra reserva a la vez). */
class DiaLleno extends Error {}

/**
 * Con la sucursal ya bloqueada, vuelve a contar: si otra reserva tomó el último lugar recién, se deshace todo (pedido
 * 55; antes lo cuidaba la restricción de exclusión por espacio).
 */
async function revisarLugaresEn(tx: Parameters<Parameters<typeof db.transaction>[0]>[0], fechaInicio: string, fechaFin: string, excepto?: number) {
  await bloquearSucursal(tx);
  const { llenos } = await disponibilidad(fechaInicio, fechaFin, excepto, tx);
  if (llenos.length > 0) throw new DiaLleno(LLENO_RECIEN);
}

/** Los días llenos de unas fechas, para el formulario (datos sueltos: se validan). Pedido 55. */
export async function consultarLugares(datos: { fechaInicio: string; fechaFin: string; excepto?: number }): Promise<Disponibilidad | null> {
  await exigirModulo("agenda");
  const entrada = esquemaConsultaLugares.safeParse(datos);
  if (!entrada.success) return null;
  const fechas = esquemaFechas.safeParse(entrada.data);
  // Con fechas que no valen no hay nada que decir: el formulario muestra su error al enviar
  if (!fechas.success) return null;
  return disponibilidad(fechas.data.fechaInicio, fechas.data.fechaFin, entrada.data.excepto);
}

type Linea = { varianteId: number; descripcion: string; precio: string };

/**
 * Agenda una reserva (HU-30, RF-36, RF-37): desde la cotización vigente de una consulta (que pasa a "aceptada" y la
 * consulta a "confirmado") o directa, con servicios del catálogo. Con el adelanto, si lo hay (RN-04). La directa que
 * viene de un mantenimiento (HU-38) deja el recordatorio "agendado" con la reserva. Todo o nada.
 */
export async function agendarReserva(_previo: EstadoCliente, datos: FormData): Promise<EstadoCliente> {
  const usuario = await exigirModulo("agenda");
  const conPagos = puedeVerModulo(usuario, "pagos");
  const entrada = entradaReserva(datos);
  const r = esquemaReserva.safeParse(entrada.reserva);
  const f = esquemaFechas.safeParse(entrada.fechas);
  // Sin "Pagos" no se registra adelanto: la reserva queda "sin adelanto" y lo carga quien cobra. Con "Pagos", la
  // respuesta a "¿Dejó adelanto?" es obligatoria (20/11): un pago no se registra sin que se haya dicho que lo hubo
  const sinRespuesta = conPagos && entrada.dejoAdelanto !== "si" && entrada.dejoAdelanto !== "no";
  const a = conPagos && !sinRespuesta ? esquemaAdelanto.safeParse(entrada.adelanto) : ({ success: true, data: { sinAdelanto: true } } as const);

  const errores: Record<string, string> = {};
  if (sinRespuesta) errores.dejoAdelanto = "Elige si dejó adelanto.";

  // Cliente o vehículo nuevos, escritos en sus pasos (20/11, como en Nueva cotización): los mismos esquemas que el alta
  // de Clientes. Se crean con la reserva, en la misma transacción: si la reserva no se guarda, no queda nada a medias
  const valores = leerValores(datos);
  const clienteNuevo = datos.get("origen") === "directa" && datos.get("clienteNuevo") === "1";
  const vehiculoNuevo = clienteNuevo || (datos.get("origen") === "directa" && datos.get("vehiculoNuevo") === "1");
  let nuevoCliente: z.output<typeof esquemaCliente> | null = null;
  let nuevoVehiculo: z.output<typeof esquemaVehiculo> | null = null;
  if (clienteNuevo) {
    const c = esquemaCliente.safeParse(valores);
    if (c.success) nuevoCliente = c.data;
    else Object.assign(errores, erroresDe(c.error));
  }
  if (vehiculoNuevo) {
    const n = esquemaVehiculo.safeParse(camposConPrefijo(valores, PREFIJO_VEHICULO));
    if (n.success) nuevoVehiculo = n.data;
    else Object.assign(errores, erroresConPrefijo(erroresDe(n.error), PREFIJO_VEHICULO));
  }
  const conNuevos = clienteNuevo || vehiculoNuevo;
  if (!r.success) Object.assign(errores, erroresDe(r.error));
  if (!f.success) Object.assign(errores, erroresDe(f.error));
  if (!a.success) {
    const deAdelanto = erroresDe(a.error);
    if (deAdelanto.monto) errores.adelanto = deAdelanto.monto;
    if (deAdelanto.metodo) errores.metodo = deAdelanto.metodo;
  }
  if (!r.success || !f.success || !a.success || sinRespuesta || (conNuevos && Object.keys(errores).length > 0)) {
    if (errores.origen || errores.cotizacionId || errores.clienteId || errores.vehiculoId) return { mensaje: "No se pudo leer el pedido. Recarga la página." };
    return { errores, valores };
  }
  const d = r.data;
  const { fechaInicio, fechaFin } = f.data;

  // Cliente, vehículo y servicios: de la cotización o de la reserva directa
  let clienteId: number | null;
  let vehiculoId: number | null;
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
    // Registrar un cliente o un vehículo es de Clientes
    if (conNuevos && !puedeVerModulo(usuario, "clientes")) return { mensaje: "Registrar un cliente o un vehículo es de quien tiene «Clientes»." };
    if (!clienteNuevo && !d.clienteId) return { mensaje: "No se pudo leer el pedido. Recarga la página." };
    if (!vehiculoNuevo && !d.vehiculoId) return { mensaje: "No se pudo leer el pedido. Recarga la página." };
    if (!clienteNuevo && !vehiculoNuevo) {
      const [suyo] = await db
        .select({ id: vehiculo.id })
        .from(vehiculo)
        .innerJoin(cliente, eq(vehiculo.clienteId, cliente.id))
        .where(and(eq(vehiculo.id, d.vehiculoId!), eq(vehiculo.clienteId, d.clienteId!), eq(vehiculo.activo, true), eq(cliente.activo, true)));
      if (!suyo) return { mensaje: "Ese cliente o vehículo ya no está activo. Vuelve a elegirlo." };
    } else if (!clienteNuevo) {
      const [c] = await db.select({ id: cliente.id }).from(cliente).where(and(eq(cliente.id, d.clienteId!), eq(cliente.activo, true)));
      if (!c) return { mensaje: "Ese cliente ya no está activo. Vuelve a elegirlo." };
    }
    // Los repetidos (RF-23): el error dice de quién es y la pantalla ofrece usarlo, como en Nueva cotización
    const existentes: Existentes = {};
    if (nuevoCliente) {
      const conTelefono = await clienteConTelefono(nuevoCliente.telefono);
      if (conTelefono) {
        errores.telefono = `Ese número ya es de ${conTelefono.nombre}.`;
        existentes.telefono = conTelefono;
      }
    }
    if (nuevoVehiculo) await revisarVehiculo(nuevoVehiculo, PREFIJO_VEHICULO, errores, existentes);
    if (Object.keys(errores).length > 0) return { errores, valores, existentes };
    clienteId = clienteNuevo ? null : d.clienteId!;
    vehiculoId = vehiculoNuevo ? null : d.vehiculoId!;
    recordatorioId = d.recordatorioId;
    if (recordatorioId && !puedeVerModulo(usuario, "mantenimientos")) return { mensaje: "Los mantenimientos los reserva el dueño o quien tiene «Mantenimientos»." };
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

  // Lo que el esquema no sabe: que haya lugar todos los días (RN-06, pedido 55) y el tope del adelanto
  const lugares = await disponibilidad(fechaInicio, fechaFin);
  if (lugares.llenos.length > 0) errores.fechaInicio = textoDiasLlenos(lugares.llenos, lugares.lugares);
  const { total } = calcularSaldo(
    lineas.map((l) => l.precio),
    descuento,
    [],
  );
  const adelanto = a.data.sinAdelanto ? null : a.data;
  if (adelanto && !montoNoMayor(adelanto.monto, total)) errores.adelanto = `El adelanto no puede ser mayor que el total (${mostrarMonto(total)} Bs).`;
  if (Object.keys(errores).length > 0) return { errores, valores };

  const { id: sucursalId } = await sucursalPrincipal();
  const autorId = Number(usuario.id);
  // El comprobante del adelanto, si vino: se sube antes de la transacción y se borra si la reserva no se guarda
  const foto = await guardarComprobante(adelanto ? datos.get("comprobante") : null, autorId);
  if (!foto.ok) return { errores: { comprobante: foto.error } };
  const comprobanteId = foto.archivoId;
  let resultado: { id: number; clienteId: number };
  try {
    resultado = await db.transaction(async (tx) => {
      if (cotizacionId && consultaId) {
        // Solo la vigente de una consulta "cotizado": si otra persona la agendó o la corrigió recién, no se toca.
        // Primero la consulta y después la cotización, en el mismo orden que una versión nueva (cotizaciones/acciones.ts):
        // con el orden al revés, agendar y corregir a la vez se esperaban entre sí y la base cortaba uno (auditoría QA-10)
        // Pedido 31: también la aceptada sin fecha. Con la consulta bloqueada se mira que no tenga ya una reserva: dos
        // personas que reservan la misma cotización a la vez no crean dos
        const [encabezado] = await tx.select({ estado: consulta.estado }).from(consulta).where(eq(consulta.id, consultaId)).for("update");
        if (!encabezado || (encabezado.estado !== "cotizado" && encabezado.estado !== "confirmado") || (await tieneReservaActiva(consultaId, tx))) {
          throw new Conflicto(COTIZACION_CAMBIO);
        }
        await tx.update(consulta).set({ estado: "confirmado", ultimoMovimientoAt: sql`now()` }).where(eq(consulta.id, consultaId));
        const [aceptada] = await tx
          .update(cotizacion)
          .set({ estado: "aceptada" })
          .where(and(eq(cotizacion.id, cotizacionId), eq(cotizacion.estado, encabezado.estado === "cotizado" ? "enviada" : "aceptada")))
          .returning({ id: cotizacion.id });
        // Lanzar (y no devolver) deshace la transacción: si no, la cotización quedaría aceptada sin reserva
        if (!aceptada) throw new Conflicto(COTIZACION_CAMBIO);
      }
      // El cliente y el vehículo nuevos, primero (20/11)
      if (nuevoCliente) {
        const [c] = await tx.insert(cliente).values({ ...nuevoCliente, createdBy: autorId, updatedBy: autorId }).returning({ id: cliente.id });
        clienteId = c.id;
      }
      if (nuevoVehiculo) {
        const [v] = await tx.insert(vehiculo).values({ ...(await conMarcaDeLaLista(tx, nuevoVehiculo)), clienteId: clienteId!, createdBy: autorId }).returning({ id: vehiculo.id });
        vehiculoId = v.id;
      } else {
        // El vehículo, bloqueado (después de la consulta, el orden del cambio de dueño) y todavía de ese cliente: una
        // reserva y un cambio de dueño a la vez no dejan una reserva del anterior con un auto del nuevo (pedido 37)
        const [suyo] = await tx
          .select({ id: vehiculo.id })
          .from(vehiculo)
          .where(and(eq(vehiculo.id, vehiculoId!), eq(vehiculo.clienteId, clienteId!), eq(vehiculo.activo, true)))
          // "no key update": choca con el FOR UPDATE del cambio de dueño, pero no con las claves foráneas de otra acción
          // (crear una cotización de ese vehículo), que formarían un ciclo con el cliente
          .for("no key update");
        if (!suyo) throw new Conflicto("Ese vehículo cambió de dueño o se desactivó recién. Vuelve a elegirlo.");
      }
      await revisarLugaresEn(tx, fechaInicio, fechaFin);
      const [nuevo] = await tx
        .insert(trabajo)
        .values({
          sucursalId,
          clienteId: clienteId!,
          vehiculoId: vehiculoId!,
          consultaId,
          cotizacionId,
          fechaInicio,
          fechaFin,
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
        datos: { fechaInicio, fechaFin, cotizacionId },
      });
      if (adelanto) {
        const [p] = await tx
          .insert(pago)
          .values({ trabajoId: nuevo.id, monto: adelanto.monto, metodo: adelanto.metodo, tipo: tipoDePago(fechaEnBolivia(), null), fecha: fechaEnBolivia(), comprobanteArchivoId: comprobanteId, createdBy: autorId })
          .returning({ id: pago.id });
        await tx.insert(auditoria).values({ usuarioId: autorId, entidad: "pago", entidadId: p.id, accion: "crear", datos: { trabajoId: nuevo.id, monto: adelanto.monto, tipo: tipoDePago(fechaEnBolivia(), null), metodo: adelanto.metodo, fecha: fechaEnBolivia(), comprobanteArchivoId: comprobanteId } });
      }
      if (recordatorioId) {
        // Solo uno abierto y de este cliente y vehículo: si otra persona lo agendó o lo cerró recién, no se reserva
        const [agendado] = await tx
          .update(recordatorioMantenimiento)
          .set({ estado: "agendado", trabajoAgendadoId: nuevo.id, updatedAt: sql`now()` })
          .where(
            and(
              eq(recordatorioMantenimiento.id, recordatorioId),
              eq(recordatorioMantenimiento.clienteId, clienteId!),
              eq(recordatorioMantenimiento.vehiculoId, vehiculoId!),
              inArray(recordatorioMantenimiento.estado, [...ESTADOS_RECORDATORIO_ABIERTO]),
            ),
          )
          .returning({ id: recordatorioMantenimiento.id });
        if (!agendado) throw new Conflicto("Ese mantenimiento ya se reservó o se cerró. Vuelve a Mantenimientos.");
        await tx.insert(auditoria).values({ usuarioId: autorId, entidad: "recordatorio_mantenimiento", entidadId: recordatorioId, accion: "agendar", datos: { trabajoId: nuevo.id } });
      }
      // Un cliente que reserva sube en la lista de recientes de Clientes
      await tx.update(cliente).set({ updatedAt: sql`now()` }).where(eq(cliente.id, clienteId!));
      return { id: nuevo.id, clienteId: clienteId! };
    });
  } catch (error) {
    await descartarComprobante(comprobanteId);
    if (error instanceof Conflicto) return { mensaje: error.message };
    // Dos personas reservaron el mismo espacio a la vez: la base frenó la segunda (D-5)
    if (error instanceof DiaLleno) return { errores: { fechaInicio: error.message }, valores };
    if (indiceUnicoViolado(error) === "trabajo_cotizacion_unica") return { mensaje: "Esa cotización ya fue reservada." };
    // Dos personas registrando el mismo cliente o la misma placa a la vez: lo frena el índice único
    if (indiceUnicoViolado(error) === "cliente_telefono_unico") return { errores: { telefono: "Ese número ya está registrado. Busca al cliente." }, valores };
    if (indiceUnicoViolado(error) === "vehiculo_placa_unica") return { errores: { [`${PREFIJO_VEHICULO}placa`]: "Esa placa ya está registrada. Busca al cliente." }, valores };
    throw error;
  }

  despuesDeCambiar(resultado.id, resultado.clienteId, consultaId);
  if (conNuevos) revalidatePath("/panel/clientes");
  if (recordatorioId) revalidatePath("/panel/mantenimientos");
  // La reserva vuelve a donde se empezó (pedido 43) y reemplaza al formulario en el historial: "atrás" no vuelve a él
  redirect(conDesde(`/panel/agenda/${resultado.id}?agendada=1`, leerDesde(datos.get("volver"))), RedirectType.replace);
}

/** Revalida lo que muestra una reserva (y lo que depende de ella) después de agendarla o cambiarla. */
function despuesDeCambiar(id: number, clienteId: number, consultaId: number | null) {
  revalidatePath("/panel/agenda");
  revalidatePath(`/panel/agenda/${id}`);
  revalidatePath(`/panel/clientes/${clienteId}`, "layout"); // también las fichas de sus vehículos (pedido 51)
  if (consultaId) {
    revalidatePath("/panel/cotizaciones");
    revalidatePath(`/panel/cotizaciones/${consultaId}`);
  }
}

/**
 * Mueve una reserva agendada a otras fechas (HU-31, RF-39), con la misma validación que al agendar: lugar todos los días
 * (sin contar la propia reserva), revisado otra vez con la sucursal bloqueada (pedido 55).
 */
export async function reprogramarReserva(_previo: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const usuario = await exigirModulo("agenda");
  const r = esquemaReprogramar.safeParse({ id: datos.get("id") });
  const f = esquemaFechas.safeParse({ fechaInicio: String(datos.get("fechaInicio") ?? ""), fechaFin: String(datos.get("fechaFin") ?? "") });
  const errores: Record<string, string> = {};
  if (!r.success) Object.assign(errores, erroresDe(r.error));
  if (!f.success) Object.assign(errores, erroresDe(f.error));
  if (!r.success || !f.success) return errores.id ? { mensaje: "No se pudo leer el pedido. Recarga la página." } : { errores };
  const { id } = r.data;
  const { fechaInicio, fechaFin } = f.data;

  const [actual] = await db
    .select({ estado: trabajo.estado, clienteId: trabajo.clienteId, consultaId: trabajo.consultaId, fechaInicio: trabajo.fechaInicio, fechaFin: trabajo.fechaFin })
    .from(trabajo)
    .where(eq(trabajo.id, id));
  if (!actual) return { mensaje: "Esa reserva ya no existe." };
  if (actual.estado !== "agendado") return { mensaje: "Solo se reprograma una reserva agendada." };

  const lugares = await disponibilidad(fechaInicio, fechaFin, id);
  if (lugares.llenos.length > 0) return { errores: { fechaInicio: textoDiasLlenos(lugares.llenos, lugares.lugares) } };

  let sueltas: number[];
  try {
    sueltas = await db.transaction(async (tx) => {
      await revisarLugaresEn(tx, fechaInicio, fechaFin, id);
      // Solo si sigue agendada: si otra persona la canceló recién, no se mueve
      const [movida] = await tx
        .update(trabajo)
        .set({ fechaInicio, fechaFin, updatedAt: sql`now()` })
        .where(and(eq(trabajo.id, id), eq(trabajo.estado, "agendado")))
        .returning({ id: trabajo.id });
      if (!movida) throw new Conflicto("Esa reserva cambió recién. Recarga la página.");
      await tx.insert(auditoria).values({
        usuarioId: Number(usuario.id),
        entidad: "trabajo",
        entidadId: id,
        accion: "reprogramar",
        datos: { antes: { fechaInicio: actual.fechaInicio, fechaFin: actual.fechaFin }, despues: { fechaInicio, fechaFin } },
      });
      // Las fotos de ingreso que se alcanzaron a tomar no prueban cómo llega otro día
      return soltarFotosIngreso(tx, id);
    });
  } catch (error) {
    if (error instanceof Conflicto) return { mensaje: error.message };
    if (error instanceof DiaLleno) return { errores: { fechaInicio: error.message } };
    throw error;
  }

  await borrarFotosSueltas(sueltas);
  despuesDeCambiar(id, actual.clienteId, actual.consultaId);
  return { ok: true, mensaje: `Reserva movida al ${diaLegible(fechaInicio, fechaEnBolivia()).toLowerCase()}.` };
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
