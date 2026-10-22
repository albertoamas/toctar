"use server";

import { and, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { auditoria, cliente, consulta, cotizacion, pago, servicio, trabajo, trabajoLinea, variante, vehiculo } from "@/db/esquema";
import { fechaEnBolivia } from "@/lib/fechas";
import { erroresDe, exclusionViolada, indiceUnicoViolado, type EstadoFormulario } from "@/lib/formularios";
import { puedeVerModulo } from "@/lib/permisos";
import { exigirModulo } from "@/lib/sesion";
import { sucursalPrincipal } from "@/modulos/configuracion/consultas";
import { mostrarMonto } from "@/modulos/catalogo/reglas";
import { descripcionLinea, montoNoMayor } from "@/modulos/cotizaciones/reglas";
import { calcularSaldo } from "@/modulos/pagos/reglas";
import { datosDeCotizacion, espaciosEnFechas, tecnicosActivos, type EspacioDisponible } from "./consultas";
import { entradaReserva, esquemaAdelanto, esquemaConsultaEspacios, esquemaFechas, esquemaReserva } from "./esquemas";

// Agenda (HU-30). Entra el dueño o un encargado con "Agenda"; el adelanto, solo con "Pagos" (o el dueño). El técnico
// nunca (RN-12). Un espacio no tiene dos vehículos el mismo día (RN-06): la pantalla solo ofrece los libres y la base
// rechaza un cruce aunque dos personas reserven a la vez (D-5). Especificación: docs/08-desarrollo/etapas/C3-agenda-pagos.md.

const ESPACIO_OCUPADO = "Ese espacio se ocupó recién: elige otro.";
const COTIZACION_CAMBIO = "Esa cotización ya fue agendada o se corrigió. Vuelve a la consulta.";

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
 * consulta a "confirmado") o directa, con servicios del catálogo. Con el adelanto, si lo hay (RN-04). Todo o nada.
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

  // Lo que el esquema no sabe: el espacio, el técnico y el tope del adelanto
  const [espacios, tecnicos] = await Promise.all([espaciosEnFechas(fechaInicio, fechaFin), d.tecnicoId ? tecnicosActivos() : []]);
  const espacio = espacios.find((e) => e.id === d.espacioId);
  if (!espacio) errores.espacioId = "Elige el espacio.";
  else if (!espacio.libre) errores.espacioId = ESPACIO_OCUPADO;
  if (d.tecnicoId && !tecnicos.some((t) => t.id === d.tecnicoId)) errores.tecnicoId = "Ese técnico ya no está activo.";
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
          tecnicoId: d.tecnicoId,
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
          .values({ trabajoId: nuevo.id, monto: adelanto.monto, metodo: adelanto.metodo, tipo: "adelanto", fecha: fechaEnBolivia(), createdBy: autorId })
          .returning({ id: pago.id });
        await tx.insert(auditoria).values({ usuarioId: autorId, entidad: "pago", entidadId: p.id, accion: "crear", datos: { trabajoId: nuevo.id, monto: adelanto.monto, tipo: "adelanto" } });
      }
      // Un cliente que reserva sube en la lista de recientes de Clientes
      await tx.update(cliente).set({ updatedAt: sql`now()` }).where(eq(cliente.id, clienteId));
      return { id: nuevo.id };
    });
  } catch (error) {
    if (error instanceof Conflicto) return { mensaje: error.message };
    // Dos personas reservaron el mismo espacio a la vez: la base frenó la segunda (D-5)
    if (exclusionViolada(error) === "trabajo_sin_cruces") return { errores: { espacioId: ESPACIO_OCUPADO } };
    if (indiceUnicoViolado(error) === "trabajo_cotizacion_unica") return { mensaje: "Esa cotización ya fue agendada." };
    throw error;
  }

  revalidatePath("/panel/agenda");
  if (consultaId) {
    revalidatePath("/panel/consultas");
    revalidatePath(`/panel/consultas/${consultaId}`);
  }
  revalidatePath(`/panel/clientes/${clienteId}`);
  redirect(`/panel/agenda/${resultado.id}?agendada=1`);
}

