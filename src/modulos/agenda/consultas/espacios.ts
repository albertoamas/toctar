import "server-only";

import { and, asc, eq, gte, lte, ne, notInArray } from "drizzle-orm";
import { db, type Transaccion } from "@/db";
import { espacioTaller, trabajo } from "@/db/esquema";
import { ESTADOS_TRABAJO } from "@/db/esquema/trabajos";
import { sucursalPrincipal } from "@/modulos/configuracion/consultas";
import { ocupaEspacio } from "../reglas";

// Lecturas de la agenda (C3). Quien las llama ya pasó por exigirModulo("agenda"); los montos y pagos solo se piden
// para quien además ve "pagos" (o el dueño). Especificación: docs/08-desarrollo/etapas/C3-agenda-pagos.md.
// Aquí: los espacios del taller libres en unas fechas, y el bloqueo de un espacio al reservar.

/** Estados que no ocupan un espacio en la agenda (como la restricción `trabajo_sin_cruces`): una sola regla. */
const NO_OCUPAN = ESTADOS_TRABAJO.filter((e) => !ocupaEspacio(e));

export type EspacioDisponible = { id: number; nombre: string; libre: boolean };

/**
 * Los espacios activos de la sucursal y si están libres en esas fechas (RN-06). `excepto`: la reserva que se
 * reprograma, que no choca consigo misma.
 */
export async function espaciosEnFechas(fechaInicio: string, fechaFin: string, excepto?: number): Promise<EspacioDisponible[]> {
  const s = await sucursalPrincipal();
  const [espacios, ocupados] = await Promise.all([
    db
      .select({ id: espacioTaller.id, nombre: espacioTaller.nombre })
      .from(espacioTaller)
      .where(and(eq(espacioTaller.sucursalId, s.id), eq(espacioTaller.activo, true)))
      .orderBy(asc(espacioTaller.orden), asc(espacioTaller.id)),
    db
      .selectDistinct({ espacioId: trabajo.espacioId })
      .from(trabajo)
      .where(
        and(
          notInArray(trabajo.estado, NO_OCUPAN),
          lte(trabajo.fechaInicio, fechaFin),
          gte(trabajo.fechaFin, fechaInicio),
          excepto ? ne(trabajo.id, excepto) : undefined,
        ),
      ),
  ]);
  const ocupadoSet = new Set(ocupados.map((o) => o.espacioId));
  return espacios.map((e) => ({ ...e, libre: !ocupadoSet.has(e.id) }));
}

/**
 * Quien va a ocupar un espacio, de a uno por espacio. Sin esto, dos reservas a la vez en el mismo espacio se esperan entre
 * sí al revisar `trabajo_sin_cruces` y la base corta una con un bloqueo mutuo (40P01), que llega como un error y no como
 * "se ocupó recién". Con esto, la segunda espera, y la restricción la rechaza limpia. "no key update": no frena las claves
 * foráneas de lo que solo apunta al espacio.
 */
export async function bloquearEspacio(tx: Transaccion, espacioId: number): Promise<void> {
  await tx.select({ id: espacioTaller.id }).from(espacioTaller).where(eq(espacioTaller.id, espacioId)).for("no key update");
}
