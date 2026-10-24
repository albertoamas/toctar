import "server-only";
import { and, asc, eq, gt, sql } from "drizzle-orm";
import { db } from "@/db";
import { cliente, pago, trabajo, trabajoLinea, vehiculo } from "@/db/esquema";

// Lecturas de los pagos (C4). Quien las llama ya pasó por exigirModulo("pagos"). Especificación:
// docs/08-desarrollo/etapas/C4-taller-entrega.md (HU-37).

/**
 * El saldo de un trabajo en SQL, con la misma cuenta que `calcularSaldo` (src/modulos/pagos/reglas.ts): suma de sus
 * líneas − descuento − pagos no anulados. `numeric` en la base: sin errores de redondeo.
 */
const saldo = sql<string>`(
  coalesce((select sum(${trabajoLinea.precio}) from ${trabajoLinea} where ${trabajoLinea.trabajoId} = ${trabajo.id}), 0)
  - ${trabajo.descuento}
  - coalesce((select sum(${pago.monto}) from ${pago} where ${pago.trabajoId} = ${trabajo.id} and not ${pago.anulado}), 0)
)`;

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

/** Las órdenes entregadas que todavía deben algo (RF-47), la más antigua primero: es la que más urge cobrar. */
export async function saldosPendientes(): Promise<SaldoPendiente[]> {
  const filas = await db
    .select({
      id: trabajo.id,
      saldo: sql<string>`(${saldo})::numeric(10, 2)::text`,
      entregadoAt: trabajo.entregadoAt,
      cliente: cliente.nombre,
      telefono: cliente.telefono,
      placa: vehiculo.placa,
      marca: vehiculo.marca,
      modelo: vehiculo.modelo,
    })
    .from(trabajo)
    .innerJoin(cliente, eq(trabajo.clienteId, cliente.id))
    .innerJoin(vehiculo, eq(trabajo.vehiculoId, vehiculo.id))
    .where(and(eq(trabajo.estado, "entregado"), gt(saldo, sql`0`)))
    .orderBy(asc(trabajo.entregadoAt), asc(trabajo.id));
  // Una entregada siempre tiene su fecha de entrega (restricción `trabajo_entregado_con_fecha`)
  return filas.map((f) => ({ ...f, entregadoAt: f.entregadoAt! }));
}
