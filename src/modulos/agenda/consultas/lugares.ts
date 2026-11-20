import "server-only";

import { and, eq, gte, inArray, lte, or } from "drizzle-orm";
import { db, type Transaccion } from "@/db";
import { sucursal, trabajo } from "@/db/esquema";
import { fechaEnBolivia } from "@/lib/fechas";
import { sucursalPrincipal } from "@/modulos/configuracion/consultas";
import { diasLlenos } from "../reglas";

// Pedido 55 (etapas/P55-lugares-por-dia.md): los lugares del taller por día. Quien las llama ya pasó por
// exigirModulo("agenda"). Las reglas (qué ocupa cada día, qué días están llenos) son puras, en ../reglas.ts.

/** Lo que ocupa un lugar: una reserva o una orden que sigue en el taller. */
const OCUPAN = ["agendado", "recibido", "en_proceso", "listo"] as const;
const EN_EL_TALLER = ["recibido", "en_proceso", "listo"] as const;

export type Disponibilidad = { lugares: number; llenos: string[] };

/**
 * Los días del rango que ya tienen todos los lugares ocupados (RN-06), sin contar `excepto` (la reserva que se
 * reprograma). Una orden en el taller cuenta aunque su entrega haya pasado: sigue ocupando hasta entregarse. Con `tx`,
 * dentro de la transacción que ya bloqueó la sucursal (`bloquearSucursal`).
 */
export async function disponibilidad(fechaInicio: string, fechaFin: string, excepto?: number, tx?: Transaccion): Promise<Disponibilidad> {
  const base = tx ?? db;
  const s = await sucursalPrincipal();
  const trabajos = await base
    .select({ id: trabajo.id, estado: trabajo.estado, inicio: trabajo.fechaInicio, fin: trabajo.fechaFin })
    .from(trabajo)
    .where(
      and(
        eq(trabajo.sucursalId, s.id),
        inArray(trabajo.estado, [...OCUPAN]),
        lte(trabajo.fechaInicio, fechaFin),
        // Las que siguen en el taller ocupan hasta hoy aunque su entrega ya haya pasado
        or(gte(trabajo.fechaFin, fechaInicio), inArray(trabajo.estado, [...EN_EL_TALLER])),
      ),
    );
  return { lugares: s.lugares, llenos: diasLlenos(trabajos, { inicio: fechaInicio, fin: fechaFin }, s.lugares, fechaEnBolivia(), excepto) };
}

/**
 * Quien va a sumar un trabajo a la agenda (reservar o reprogramar), de a uno por sucursal: así dos reservas del último
 * lugar a la vez no pasan las dos. La segunda espera, vuelve a contar y ve el día lleno (antes lo cuidaba la restricción
 * de exclusión por espacio, D-5). "no key update": no frena las claves foráneas de lo que solo apunta a la sucursal.
 */
export async function bloquearSucursal(tx: Transaccion): Promise<void> {
  const s = await sucursalPrincipal();
  await tx.select({ id: sucursal.id }).from(sucursal).where(eq(sucursal.id, s.id)).for("no key update");
}
