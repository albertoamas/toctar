import { sql } from "drizzle-orm";
import { boolean, integer, jsonb, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { usuario } from "./acceso";
import { archivo } from "./configuracion";

// Contenido del sitio (B3). Especificación: docs/08-desarrollo/etapas/B3-contenido.md §4.
// El servicio del sitio es el mismo registro que el del catálogo (C1 le suma precios y duración).

const momento = (nombre: string) => timestamp(nombre, { withTimezone: true });

export type Paso = { titulo: string; detalle: string };

export const servicio = pgTable(
  "servicio",
  {
    id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
    nombre: text("nombre").notNull(),
    /** Dirección de la página: /servicios/<slug>. */
    slug: text("slug").notNull().unique(),
    resumen: text("resumen").notNull(),
    descripcion: text("descripcion").notNull().default(""),
    beneficios: jsonb("beneficios").$type<string[]>().notNull().default([]),
    pasos: jsonb("pasos").$type<Paso[]>().notNull().default([]),
    fotoArchivoId: integer("foto_archivo_id").references(() => archivo.id),
    orden: integer("orden").notNull(),
    visibleSitio: boolean("visible_sitio").default(true).notNull(),
    /** Catálogo (C1). En B3 siempre verdadero. */
    activo: boolean("activo").default(true).notNull(),
    createdAt: momento("created_at").defaultNow().notNull(),
    updatedAt: momento("updated_at").defaultNow().notNull(),
    updatedBy: integer("updated_by").references(() => usuario.id),
  },
  (t) => [uniqueIndex("servicio_nombre_unico").on(sql`lower(${t.nombre})`)],
);

/** Opciones de un servicio (D-2: al menos una; "Única" si no hay opciones). Los precios llegan en C1. */
export const variante = pgTable(
  "variante",
  {
    id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
    servicioId: integer("servicio_id")
      .notNull()
      .references(() => servicio.id),
    nombre: text("nombre").notNull(),
    descripcion: text("descripcion"),
    orden: integer("orden").notNull(),
    activo: boolean("activo").default(true).notNull(),
  },
  (t) => [uniqueIndex("variante_nombre_unico").on(t.servicioId, sql`lower(${t.nombre})`)],
);
