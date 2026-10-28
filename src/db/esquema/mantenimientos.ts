import { sql } from "drizzle-orm";
import { check, date, index, integer, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { usuario } from "./acceso";
import { cliente, vehiculo } from "./clientes";
import { servicio } from "./sitio";
import { trabajo } from "./trabajos";

// Recordatorios de mantenimiento (RN-08, RF-50). Pedido 21 (D-11): la fila abierta de un vehículo y un servicio base es
// su plan de mantenimiento; al hacerse queda "hecho" y nace la siguiente, con la frecuencia del plan. Se crean al
// entregar (con el mantenimiento que dice el catálogo) o a mano desde la ficha del cliente (un servicio anterior al
// sistema). Especificación: docs/08-desarrollo/etapas/C4-taller-entrega.md §4 y P21-planes-mantenimiento.md §4.

const momento = (nombre: string) => timestamp(nombre, { withTimezone: true });
const lista = (valores: readonly string[]) => sql.raw(valores.map((v) => `'${v}'`).join(", "));

export const ESTADOS_RECORDATORIO = ["pendiente", "avisado", "agendado", "hecho", "no_interesado"] as const;
export type EstadoRecordatorio = (typeof ESTADOS_RECORDATORIO)[number];

export const recordatorioMantenimiento = pgTable(
  "recordatorio_mantenimiento",
  {
    id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
    /** El trabajo entregado que lo generó; nulo si se cargó a mano (un servicio hecho antes del sistema). */
    trabajoOrigenId: integer("trabajo_origen_id").references(() => trabajo.id),
    clienteId: integer("cliente_id")
      .notNull()
      .references(() => cliente.id),
    vehiculoId: integer("vehiculo_id")
      .notNull()
      .references(() => vehiculo.id),
    /** El servicio base, el que se hizo (por ejemplo, el pulido y nano cerámico): el mensaje dice su mantenimiento. */
    servicioId: integer("servicio_id")
      .notNull()
      .references(() => servicio.id),
    /** El servicio que se agenda y se cobra como su mantenimiento (RN-09); puede ser el mismo servicio base. */
    servicioMantenimientoId: integer("servicio_mantenimiento_id")
      .notNull()
      .references(() => servicio.id),
    /** Cada cuántos meses, en este vehículo: llega del catálogo y se cambia en la ficha del cliente. */
    intervaloMeses: integer("intervalo_meses").notNull(),
    /** Cuándo le toca, en Bolivia. */
    fechaProgramada: date("fecha_programada").notNull(),
    estado: text("estado").$type<EstadoRecordatorio>().default("pendiente").notNull(),
    avisadoAt: momento("avisado_at"),
    avisadoPor: integer("avisado_por").references(() => usuario.id),
    trabajoAgendadoId: integer("trabajo_agendado_id").references(() => trabajo.id),
    /** La orden entregada que lo hizo: queda "hecho" y nace el siguiente del plan. */
    trabajoHechoId: integer("trabajo_hecho_id").references(() => trabajo.id),
    nota: text("nota"),
    createdAt: momento("created_at").defaultNow().notNull(),
    updatedAt: momento("updated_at").defaultNow().notNull(),
  },
  (t) => [
    check("recordatorio_estado_valido", sql`${t.estado} in (${lista(ESTADOS_RECORDATORIO)})`),
    check("recordatorio_agendado_con_trabajo", sql`(${t.estado} = 'agendado') = (${t.trabajoAgendadoId} is not null)`),
    check("recordatorio_hecho_con_trabajo", sql`(${t.estado} = 'hecho') = (${t.trabajoHechoId} is not null)`),
    check("recordatorio_intervalo_valido", sql`${t.intervaloMeses} between 1 and 24`),
    // Un solo plan abierto por vehículo y servicio base: el mantenimiento repetido no puede pasar (pedido 21)
    uniqueIndex("recordatorio_un_plan_abierto")
      .on(t.vehiculoId, t.servicioId)
      .where(sql`${t.estado} in ('pendiente', 'avisado', 'agendado')`),
    // Entregar dos veces (o reintentar) no duplica el recordatorio de un servicio
    uniqueIndex("recordatorio_unico_por_servicio").on(t.trabajoOrigenId, t.servicioId),
    index("recordatorio_por_estado").on(t.estado, t.fechaProgramada),
    index("recordatorio_por_cliente").on(t.clienteId),
  ],
);
