import "server-only";
import { asc, eq, gt, sql } from "drizzle-orm";
import { db } from "@/db";
import { cliente, pago, trabajo, trabajoLinea, vehiculo } from "@/db/esquema";

// Lecturas de los pagos (C4). Quien las llama ya pasó por exigirModulo("pagos"). Especificación:
// docs/08-desarrollo/etapas/C4-taller-entrega.md (HU-37).

export type SaldoPendiente = {
  id: number;
  saldo: string;
  entregadoAt: Date;
  cliente: string;
  telefono: string;
  placa: string;
  marca: string | null;
  modelo: string | null;
};

/**
 * Las órdenes entregadas que todavía deben algo (RF-47), la más antigua primero: es la que más urge cobrar.
 *
 * El saldo se calcula en la base, con la **misma cuenta que `calcularSaldo`** (src/modulos/pagos/reglas.ts): total =
 * máx(0, líneas − descuento), menos los pagos no anulados. Si cambia esa regla, cambia aquí también: la prueba E2E de la
 * HU-37 compara los dos (incluso con un descuento mayor que las líneas). En la base y no en el servidor porque las
 * entregadas no dejan de crecer: así solo viajan las que deben.
 */
export async function saldosPendientes(): Promise<SaldoPendiente[]> {
  const lineas = db
    .select({ trabajoId: trabajoLinea.trabajoId, suma: sql<string>`sum(${trabajoLinea.precio})`.as("suma_lineas") })
    .from(trabajoLinea)
    .groupBy(trabajoLinea.trabajoId)
    .as("lineas");
  const pagos = db
    .select({ trabajoId: pago.trabajoId, suma: sql<string>`sum(${pago.monto})`.as("suma_pagos") })
    .from(pago)
    .where(eq(pago.anulado, false))
    .groupBy(pago.trabajoId)
    .as("pagos");
  // Cada suma una sola vez por orden; el saldo se calcula en la consulta de afuera
  const conSaldo = db
    .select({
      id: trabajo.id,
      saldo: sql<string>`(greatest(coalesce(${lineas.suma}, 0) - ${trabajo.descuento}, 0) - coalesce(${pagos.suma}, 0))::numeric(10, 2)`.as("saldo"),
      entregadoAt: trabajo.entregadoAt,
      clienteId: trabajo.clienteId,
      vehiculoId: trabajo.vehiculoId,
    })
    .from(trabajo)
    .leftJoin(lineas, eq(lineas.trabajoId, trabajo.id))
    .leftJoin(pagos, eq(pagos.trabajoId, trabajo.id))
    .where(eq(trabajo.estado, "entregado"))
    .as("con_saldo");

  const filas = await db
    .select({
      id: conSaldo.id,
      saldo: sql<string>`${conSaldo.saldo}::text`,
      entregadoAt: conSaldo.entregadoAt,
      cliente: cliente.nombre,
      telefono: cliente.telefono,
      placa: vehiculo.placa,
      marca: vehiculo.marca,
      modelo: vehiculo.modelo,
    })
    .from(conSaldo)
    .innerJoin(cliente, eq(conSaldo.clienteId, cliente.id))
    .innerJoin(vehiculo, eq(conSaldo.vehiculoId, vehiculo.id))
    .where(gt(conSaldo.saldo, sql`0`))
    .orderBy(asc(conSaldo.entregadoAt), asc(conSaldo.id));
  // Una entregada siempre tiene su fecha de entrega (restricción `trabajo_entregado_con_fecha`)
  return filas.map((f) => ({ ...f, entregadoAt: f.entregadoAt! }));
}
