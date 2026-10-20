import { sql } from "drizzle-orm";
import { boolean, check, index, integer, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { usuario } from "./acceso";
import { tamanoVehiculo } from "./configuracion";

// Clientes y vehículos (C1, HU-21 a HU-23). Especificación: docs/08-desarrollo/etapas/C1-catalogo-clientes.md §4.
// El cliente no usa el sistema (RN-11): los registra el personal. Se desactivan, no se borran (RN-14).

const momento = (nombre: string) => timestamp(nombre, { withTimezone: true });

export const cliente = pgTable("cliente", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  nombre: text("nombre").notNull(),
  /** WhatsApp en formato internacional sin "+": 591 y 8 dígitos (src/lib/whatsapp.ts). Único: avisa duplicados (RF-23). */
  telefono: text("telefono").notNull().unique("cliente_telefono_unico"),
  correo: text("correo"),
  /** Para la factura SIAT futura (RNF-13). */
  nit: text("nit"),
  razonSocial: text("razon_social"),
  notas: text("notas"),
  activo: boolean("activo").default(true).notNull(),
  createdAt: momento("created_at").defaultNow().notNull(),
  updatedAt: momento("updated_at").defaultNow().notNull(),
  createdBy: integer("created_by")
    .notNull()
    .references(() => usuario.id),
  updatedBy: integer("updated_by").references(() => usuario.id),
});

export const vehiculo = pgTable(
  "vehiculo",
  {
    id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
    clienteId: integer("cliente_id")
      .notNull()
      .references(() => cliente.id),
    /** Mayúsculas, sin espacios ni guiones: "1234ABC" (normalizarPlaca). */
    placa: text("placa").notNull(),
    tamanoId: integer("tamano_id")
      .notNull()
      .references(() => tamanoVehiculo.id),
    marca: text("marca"),
    modelo: text("modelo"),
    anio: integer("anio"),
    color: text("color"),
    activo: boolean("activo").default(true).notNull(),
    createdAt: momento("created_at").defaultNow().notNull(),
    updatedAt: momento("updated_at").defaultNow().notNull(),
    createdBy: integer("created_by")
      .notNull()
      .references(() => usuario.id),
  },
  (t) => [
    // Única solo entre los activos: si el vehículo cambia de dueño, se desactiva en la ficha del anterior y se
    // registra con el nuevo; el historial queda con el dueño anterior.
    uniqueIndex("vehiculo_placa_unica").on(t.placa).where(sql`${t.activo}`),
    check("vehiculo_anio_valido", sql`${t.anio} between 1950 and 2100`),
    index("vehiculo_cliente").on(t.clienteId),
  ],
);
