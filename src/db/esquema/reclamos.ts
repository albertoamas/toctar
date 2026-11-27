import { sql } from "drizzle-orm";
import { check, date, index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { usuario } from "./acceso";
import { archivo } from "./configuracion";
import { servicio } from "./sitio";

// Reclamos y pedidos de garantía que llegan desde el sitio (HU-16, HU-17).
// Especificación: docs/08-desarrollo/etapas/B5-reclamos-google.md §4.

const momento = (nombre: string) => timestamp(nombre, { withTimezone: true });

export const ESTADOS_RECLAMO = ["pendiente", "atendido"] as const;
export type EstadoReclamo = (typeof ESTADOS_RECLAMO)[number];

export const reclamo = pgTable(
  "reclamo",
  {
    id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
    nombre: text("nombre").notNull(),
    /** WhatsApp normalizado: 591 y 8 dígitos. */
    telefono: text("telefono").notNull(),
    /** En mayúsculas, sin espacios ni guiones. */
    placa: text("placa").notNull(),
    servicioId: integer("servicio_id").references(() => servicio.id),
    fechaAproximada: date("fecha_aproximada"),
    descripcion: text("descripcion").notNull(),
    estado: text("estado", { enum: ESTADOS_RECLAMO }).notNull().default("pendiente"),
    notaAtencion: text("nota_atencion"),
    atendidoPor: integer("atendido_por").references(() => usuario.id),
    atendidoAt: momento("atendido_at"),
    /** SHA-256 de la IP con un secreto: solo para limitar envíos por hora. No se guarda la IP. */
    ipHash: text("ip_hash").notNull(),
    createdAt: momento("created_at").defaultNow().notNull(),
  },
  (t) => [
    check("reclamo_estado_valido", sql`${t.estado} in ('pendiente', 'atendido')`),
    index("reclamo_estado_idx").on(t.estado, t.createdAt),
    index("reclamo_ip_idx").on(t.ipHash, t.createdAt),
  ],
);

export const reclamoArchivo = pgTable("reclamo_archivo", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  reclamoId: integer("reclamo_id")
    .notNull()
    .references(() => reclamo.id),
  archivoId: integer("archivo_id")
    .notNull()
    .references(() => archivo.id),
  orden: integer("orden").notNull(),
});
