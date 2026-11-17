import "server-only";

import { and, eq, exists, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { consulta, cotizacion, trabajo } from "@/db/esquema";

// Lecturas de las cotizaciones (C2, P23, P39, P40, P47). Quien las llama ya pasó por su permiso (Cotizaciones;
// los precios, solo con él). Especificación: docs/08-desarrollo/etapas/C2-consultas-cotizaciones.md.
// Aquí: lo que comparten la lista y la ficha (si tiene versiones, si tiene una reserva activa, si quedó sin fecha).

/** Es una cotización (D-12): un encabezado con alguna versión. Las consultas de antes sin cotizar no lo son. */
export const tieneVersiones = exists(db.select({ id: cotizacion.id }).from(cotizacion).where(eq(cotizacion.consultaId, consulta.id)));

/** Tiene una reserva que no se canceló (agendada, en el taller o entregada). */
export const conReservaActiva = sql<boolean>`${exists(
  db.select({ id: trabajo.id }).from(trabajo).where(and(eq(trabajo.consultaId, consulta.id), ne(trabajo.estado, "cancelado"))),
)}`;

/** Aceptada sin reserva activa (pedido 31, P31-flujo-de-un-trabajo.md §4). */
export const sinFecha = sql<boolean>`(${consulta.estado} = 'confirmado' and not ${conReservaActiva})`;
