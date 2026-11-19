import "server-only";

import { asc, desc, eq, inArray, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { cliente, espacioTaller, pago, trabajo, trabajoLinea, vehiculo } from "@/db/esquema";
import { type EstadoTrabajo } from "@/db/esquema/trabajos";
import { fechaEnBolivia } from "@/lib/fechas";
import { calcularSaldo, type Saldo } from "@/modulos/pagos/reglas";

// Lecturas de la agenda (C3). Quien las llama ya pasó por exigirModulo("agenda"); los montos y pagos solo se piden
// para quien además ve "pagos" (o el dueño). Especificación: docs/08-desarrollo/etapas/C3-agenda-pagos.md.
// Aquí: las reservas de una consulta, de un cliente o de un vehículo.

export type ReservaCorta = { id: number; estado: EstadoTrabajo; fechaInicio: string; fechaFin: string; espacio: string; placa: string; clienteId: number; cliente: string };

const columnasCortas = {
  id: trabajo.id,
  estado: trabajo.estado,
  fechaInicio: trabajo.fechaInicio,
  fechaFin: trabajo.fechaFin,
  espacio: espacioTaller.nombre,
  placa: vehiculo.placa,
  clienteId: cliente.id,
  cliente: cliente.nombre,
};

/** Las reservas que salieron de una consulta (para mostrarlas en ella), la más nueva primero. */
export async function reservasDeConsulta(consultaId: number): Promise<ReservaCorta[]> {
  return db
    .select(columnasCortas)
    .from(trabajo)
    .innerJoin(espacioTaller, eq(trabajo.espacioId, espacioTaller.id))
    .innerJoin(vehiculo, eq(trabajo.vehiculoId, vehiculo.id))
    .innerJoin(cliente, eq(trabajo.clienteId, cliente.id))
    .where(eq(trabajo.consultaId, consultaId))
    .orderBy(desc(trabajo.createdAt));
}

export type ReservaDelCliente = ReservaCorta & {
  saldo: Saldo | null;
  /** Sus servicios, en su orden: "Pulido y nano cerámico, Pulido de vidrios" (la historia de la ficha, C7 §5.6). */
  servicios: string;
};

/**
 * Las reservas de un cliente para su ficha (HU-32): primero las que vienen (la más cercana arriba), después las pasadas
 * (la más reciente arriba). Con el saldo de cada una solo si quien mira ve pagos (RN-12); las cuentas, las mismas de la
 * reserva (`calcularSaldo`).
 */
export async function reservasDelCliente(clienteId: number, conMontos: boolean): Promise<ReservaDelCliente[]> {
  return reservasDonde(eq(trabajo.clienteId, clienteId), conMontos);
}

/**
 * Las reservas y órdenes de un vehículo, para su ficha (pedido 51): las mismas que las de un cliente, por `vehiculo_id`.
 * Incluye las de un dueño anterior (P37: el vehículo es el mismo); cada una dice de quién era en ese momento (`cliente`).
 */
export async function reservasDelVehiculo(vehiculoId: number, conMontos: boolean): Promise<ReservaDelCliente[]> {
  return reservasDonde(eq(trabajo.vehiculoId, vehiculoId), conMontos);
}

async function reservasDonde(donde: SQL, conMontos: boolean): Promise<ReservaDelCliente[]> {
  const hoy = fechaEnBolivia();
  const reservas = await db
    .select({ ...columnasCortas, descuento: trabajo.descuento })
    .from(trabajo)
    .innerJoin(espacioTaller, eq(trabajo.espacioId, espacioTaller.id))
    .innerJoin(vehiculo, eq(trabajo.vehiculoId, vehiculo.id))
    .innerJoin(cliente, eq(trabajo.clienteId, cliente.id))
    .where(donde)
    .orderBy(asc(trabajo.fechaInicio), asc(trabajo.id));
  const proximas = reservas.filter((r) => r.fechaFin >= hoy);
  const pasadas = reservas.filter((r) => r.fechaFin < hoy).reverse();
  const ids = reservas.map((r) => r.id);
  // Las líneas siempre (sus servicios van en la historia); los precios y los pagos, solo para quien ve montos
  const [lineas, pagos] =
    ids.length > 0
      ? await Promise.all([
          db
            .select({ trabajoId: trabajoLinea.trabajoId, precio: trabajoLinea.precio, descripcion: trabajoLinea.descripcion })
            .from(trabajoLinea)
            .where(inArray(trabajoLinea.trabajoId, ids))
            .orderBy(asc(trabajoLinea.orden), asc(trabajoLinea.id)),
          conMontos ? db.select({ trabajoId: pago.trabajoId, monto: pago.monto, anulado: pago.anulado }).from(pago).where(inArray(pago.trabajoId, ids)) : [],
        ])
      : [[], []];
  const servicios = new Map<number, string[]>();
  for (const l of lineas) servicios.set(l.trabajoId, [...(servicios.get(l.trabajoId) ?? []), l.descripcion]);
  const precios = new Map<number, string[]>();
  for (const l of lineas) precios.set(l.trabajoId, [...(precios.get(l.trabajoId) ?? []), l.precio]);
  const pagosPor = new Map<number, { monto: string; anulado: boolean }[]>();
  for (const p of pagos) pagosPor.set(p.trabajoId, [...(pagosPor.get(p.trabajoId) ?? []), p]);
  return [...proximas, ...pasadas].map(({ descuento, ...r }) => ({
    ...r,
    saldo: conMontos ? calcularSaldo(precios.get(r.id) ?? [], descuento, pagosPor.get(r.id) ?? []) : null,
    servicios: (servicios.get(r.id) ?? []).join(", "),
  }));
}
