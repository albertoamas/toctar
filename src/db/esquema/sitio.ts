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

/** Textos editables de las páginas del sitio (RF-10): una fila por página, validada en src/modulos/sitio/contenido.ts. */
export const contenidoPagina = pgTable("contenido_pagina", {
  clave: text("clave").primaryKey(),
  datos: jsonb("datos").$type<Record<string, unknown>>().notNull(),
  updatedAt: momento("updated_at").defaultNow().notNull(),
  updatedBy: integer("updated_by").references(() => usuario.id),
});

/** Preguntas frecuentes (RF-05, RF-10). Se pueden eliminar: no tienen historial. */
export const faq = pgTable("faq", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  pregunta: text("pregunta").notNull(),
  respuesta: text("respuesta").notNull(),
  orden: integer("orden").notNull(),
  visible: boolean("visible").default(true).notNull(),
});

/** Fotos de antes y después de la galería (RF-12). La foto sola va en `foto_despues_id`. */
export const galeriaItem = pgTable("galeria_item", {
  id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
  servicioId: integer("servicio_id")
    .notNull()
    .references(() => servicio.id),
  fotoAntesId: integer("foto_antes_id").references(() => archivo.id),
  fotoDespuesId: integer("foto_despues_id")
    .notNull()
    .references(() => archivo.id),
  /** También es el texto alternativo de las fotos (RNF-14). */
  descripcion: text("descripcion").notNull(),
  orden: integer("orden").notNull(),
  visible: boolean("visible").default(true).notNull(),
  createdAt: momento("created_at").defaultNow().notNull(),
  createdBy: integer("created_by").references(() => usuario.id),
});
