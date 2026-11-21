import "server-only";

import { and, eq, exists, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { cliente, consulta, cotizacion, trabajo, vehiculo } from "@/db/esquema";

// Lecturas de las cotizaciones (C2, P23, P39, P40, P47). Quien las llama ya pasó por su permiso (Cotizaciones;
// los precios, solo con él). Especificación: docs/08-desarrollo/etapas/C2-consultas-cotizaciones.md.
// Aquí: lo que comparten la lista y la ficha (si tiene versiones, si tiene una reserva activa, si quedó sin fecha).

/** Es una cotización (D-12): un encabezado con alguna versión. Las consultas de antes sin cotizar no lo son. */
export const tieneVersiones = exists(db.select({ id: cotizacion.id }).from(cotizacion).where(eq(cotizacion.consultaId, consulta.id)));

/** Tiene una reserva que no se canceló (agendada, en el taller o entregada). */
export const conReservaActiva = sql<boolean>`${exists(
  db.select({ id: trabajo.id }).from(trabajo).where(and(eq(trabajo.consultaId, consulta.id), ne(trabajo.estado, "cancelado"))),
)}`;

/**
 * Pedido 31, parte 2 (P31b-cotizacion-rapida.md): de quién es la cotización, del cliente o, si todavía no se registró,
 * del interesado. Van con `cliente` y `vehiculo` unidos con leftJoin (una cotización de un interesado no los tiene): así
 * la lista, la ficha, las versiones, el PDF y la reserva leen lo mismo, de un solo lugar.
 */
export const nombreDeQuien = sql<string>`coalesce(${cliente.nombre}, ${consulta.interesadoNombre})`;
export const telefonoDeQuien = sql<string>`coalesce(${cliente.telefono}, ${consulta.interesadoTelefono})`;
/** El tamaño que da el precio: el del vehículo registrado o el que se eligió para el interesado. */
export const tamanoDeLaConsulta = sql<number>`coalesce(${vehiculo.tamanoId}, ${consulta.interesadoTamanoId})`;
/** Todavía sin registrar: la cotización es de un interesado. */
export const esInteresado = sql<boolean>`(${consulta.clienteId} is null)`;

/** Aceptada sin reserva activa (pedido 31, P31-flujo-de-un-trabajo.md §4). */
export const sinFecha = sql<boolean>`(${consulta.estado} = 'confirmado' and not ${conReservaActiva})`;
