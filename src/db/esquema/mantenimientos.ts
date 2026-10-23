import { sql } from "drizzle-orm";
import { check, date, index, integer, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { usuario } from "./acceso";
import { cliente, vehiculo } from "./clientes";
import { servicio } from "./sitio";
import { trabajo } from "./trabajos";

// Recordatorios de mantenimiento (RN-08, RF-50): se crean al entregar un trabajo con un servicio que "genera
// mantenimiento", para dentro de los meses de Configuración. Especificación: docs/08-desarrollo/etapas/C4-taller-entrega.md §4.

const momento = (nombre: string) => timestamp(nombre, { withTimezone: true });
const lista = (valores: readonly string[]) => sql.raw(valores.map((v) => `'${v}'`).join(", "));

export const ESTADOS_RECORDATORIO = ["pendiente", "avisado", "agendado", "no_interesado"] as const;
export type EstadoRecordatorio = (typeof ESTADOS_RECORDATORIO)[number];

export const recordatorioMantenimiento = pgTable(
  "recordatorio_mantenimiento",
  {
    id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
    /** El trabajo entregado que lo generó. */
    trabajoOrigenId: integer("trabajo_origen_id")
      .notNull()
      .references(() => trabajo.id),
    clienteId: integer("cliente_id")
      .notNull()
      .references(() => cliente.id),
    vehiculoId: integer("vehiculo_id")
      .notNull()
      .references(() => vehiculo.id),
    /** El servicio que lo generó (por ejemplo, el nano cerámico). */
    servicioId: integer("servicio_id")
      .notNull()
      .references(() => servicio.id),
    /** Entrega + intervalo, en Bolivia. */
    fechaProgramada: date("fecha_programada").notNull(),
    estado: text("estado").$type<EstadoRecordatorio>().default("pendiente").notNull(),
    avisadoAt: momento("avisado_at"),
    avisadoPor: integer("avisado_por").references(() => usuario.id),
    trabajoAgendadoId: integer("trabajo_agendado_id").references(() => trabajo.id),
    nota: text("nota"),
    createdAt: momento("created_at").defaultNow().notNull(),
    updatedAt: momento("updated_at").defaultNow().notNull(),
  },
  (t) => [
    check("recordatorio_estado_valido", sql`${t.estado} in (${lista(ESTADOS_RECORDATORIO)})`),
    check("recordatorio_agendado_con_trabajo", sql`(${t.estado} = 'agendado') = (${t.trabajoAgendadoId} is not null)`),
    // Entregar dos veces (o reintentar) no duplica el recordatorio de un servicio
    uniqueIndex("recordatorio_unico_por_servicio").on(t.trabajoOrigenId, t.servicioId),
    index("recordatorio_por_estado").on(t.estado, t.fechaProgramada),
    index("recordatorio_por_cliente").on(t.clienteId),
  ],
);
