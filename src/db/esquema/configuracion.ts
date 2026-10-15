import { sql } from "drizzle-orm";
import { boolean, check, integer, jsonb, numeric, pgTable, text, timestamp } from "drizzle-orm/pg-core";
// Rutas relativas: drizzle-kit también carga este archivo y no conoce el alias "@/".
import type { DiaHorario } from "../../lib/horarios";
import { usuario } from "./acceso";

// Datos del negocio (HU-04, RF-17) y archivos subidos.
// Especificación: docs/08-desarrollo/etapas/B2-configuracion.md §4.

const momento = (nombre: string) => timestamp(nombre, { withTimezone: true });

/** Archivos guardados en R2 (en desarrollo, RustFS). La clave nunca se reutiliza. */
export const archivo = pgTable("archivo", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  clave: text("clave").notNull().unique(),
  tipoMime: text("tipo_mime").notNull(),
  bytes: integer("bytes").notNull(),
  ancho: integer("ancho"),
  alto: integer("alto"),
  createdAt: momento("created_at").defaultNow().notNull(),
  createdBy: integer("created_by").references(() => usuario.id),
});

export type Redes = { facebook?: string; instagram?: string; tiktok?: string };

/** Una sola fila (id = 1): los datos del negocio que se muestran en el sitio y en el PDF. */
export const negocio = pgTable(
  "negocio",
  {
    id: integer("id").primaryKey().default(1),
    nombre: text("nombre").notNull(),
    logoArchivoId: integer("logo_archivo_id").references(() => archivo.id),
    correo: text("correo"),
    redes: jsonb("redes").$type<Redes>().notNull().default({}),
    nit: text("nit"),
    razonSocial: text("razon_social"),
    updatedAt: momento("updated_at").defaultNow().notNull(),
    updatedBy: integer("updated_by").references(() => usuario.id),
  },
  (t) => [check("negocio_fila_unica", sql`${t.id} = 1`)],
);

/** Locales del negocio. Hoy hay uno; el modelo admite más (D-7). */
export const sucursal = pgTable("sucursal", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  nombre: text("nombre").notNull(),
  direccion: text("direccion").notNull(),
  lat: numeric("lat", { precision: 9, scale: 6, mode: "number" }),
  lng: numeric("lng", { precision: 9, scale: 6, mode: "number" }),
  horarios: jsonb("horarios").$type<DiaHorario[]>().notNull(),
  /** Formato internacional sin "+": 591 y los 8 dígitos del celular. */
  telefonoWhatsapp: text("telefono_whatsapp"),
  activo: boolean("activo").default(true).notNull(),
  updatedAt: momento("updated_at").defaultNow().notNull(),
  updatedBy: integer("updated_by").references(() => usuario.id),
});
