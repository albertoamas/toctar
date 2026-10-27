import { sql } from "drizzle-orm";
import { boolean, check, integer, jsonb, pgTable, text, timestamp, uniqueIndex, type AnyPgColumn } from "drizzle-orm/pg-core";
import { usuario } from "./acceso";
import { archivo } from "./configuracion";
// Ciclo con trabajos.ts (que usa `variante`): las dos referencias se leen recién al usarse, () => …
import { trabajo } from "./trabajos";

// Contenido del sitio (B3). Especificación: docs/08-desarrollo/etapas/B3-contenido.md §4.
// El servicio del sitio es el mismo registro que el del catálogo: C1 le suma duración, mantenimiento y precios
// (docs/08-desarrollo/etapas/C1-catalogo-clientes.md §4).

const momento = (nombre: string) => timestamp(nombre, { withTimezone: true });

export type Paso = { titulo: string; detalle: string };
/** Un beneficio con su ícono, elegido de una lista fija (`ICONOS_BENEFICIO`, pedido de la demo del 24/10). */
export type Beneficio = { texto: string; icono: string };

export const servicio = pgTable(
  "servicio",
  {
    id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
    nombre: text("nombre").notNull(),
    /** Dirección de la página: /servicios/<slug>. */
    slug: text("slug").notNull().unique(),
    resumen: text("resumen").notNull(),
    /** Sin uso desde el 24/10: repetía el resumen, que ahora dice en qué consiste (revisión de YankoSoft). Se conserva lo escrito. */
    descripcion: text("descripcion").notNull().default(""),
    beneficios: jsonb("beneficios").$type<Beneficio[]>().notNull().default([]),
    pasos: jsonb("pasos").$type<Paso[]>().notNull().default([]),
    /** Las opciones (variantes) van de menor a mayor: el sitio las muestra como escalones (pedido de la demo del 24/10). */
    opcionesEnEscalera: boolean("opciones_en_escalera").default(false).notNull(),
    fotoArchivoId: integer("foto_archivo_id").references(() => archivo.id),
    orden: integer("orden").notNull(),
    visibleSitio: boolean("visible_sitio").default(true).notNull(),
    /** Catálogo (C1): inactivo no se cotiza ni sale en el sitio. */
    activo: boolean("activo").default(true).notNull(),
    /** Días estimados que ocupa un espacio del taller (RF-27): solo sugiere la fecha de entrega. Una variante puede tener la suya. */
    duracionDias: integer("duracion_dias").default(1).notNull(),
    /**
     * Al entregarlo se programa su mantenimiento (RN-08, pedido 21): qué servicio se agenda (puede ser él mismo) y cada
     * cuántos meses. Los dos o ninguno.
     */
    mantenimientoServicioId: integer("mantenimiento_servicio_id").references((): AnyPgColumn => servicio.id),
    mantenimientoMeses: integer("mantenimiento_meses"),
    createdAt: momento("created_at").defaultNow().notNull(),
    updatedAt: momento("updated_at").defaultNow().notNull(),
    updatedBy: integer("updated_by").references(() => usuario.id),
  },
  (t) => [
    uniqueIndex("servicio_nombre_unico").on(sql`lower(${t.nombre})`),
    check("servicio_duracion_valida", sql`${t.duracionDias} between 1 and 60`),
    check("servicio_mantenimiento_completo", sql`(${t.mantenimientoServicioId} is null) = (${t.mantenimientoMeses} is null)`),
    check("servicio_mantenimiento_meses_valido", sql`${t.mantenimientoMeses} between 1 and 24`),
  ],
);

/**
 * La foto al lado de una sección de la página de un servicio (pedido de la demo del 24/10): "Cómo lo hacemos" u
 * "Opciones" (`SECCIONES_FOTO`). Una por sección. Decorativa: el texto de la sección dice lo mismo.
 */
export const servicioFoto = pgTable(
  "servicio_foto",
  {
    id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
    servicioId: integer("servicio_id")
      .notNull()
      .references(() => servicio.id),
    seccion: text("seccion").notNull(),
    archivoId: integer("archivo_id")
      .notNull()
      .references(() => archivo.id),
    createdAt: momento("created_at").defaultNow().notNull(),
    createdBy: integer("created_by").references(() => usuario.id),
  },
  (t) => [
    uniqueIndex("servicio_foto_una_por_seccion").on(t.servicioId, t.seccion),
    // Las mismas claves de SECCIONES_FOTO (src/modulos/sitio/secciones-foto.ts): si se suma una, va también aquí
    check("servicio_foto_seccion_valida", sql`${t.seccion} in ('proceso', 'opciones')`),
  ],
);

/** Opciones de un servicio (D-2: al menos una; "Única" si no hay opciones). Sus precios están en `precio` (catalogo.ts). */
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
    /** Días estimados propios (C1, HU-20). Vacío: usa los del servicio. */
    duracionDias: integer("duracion_dias"),
  },
  (t) => [
    uniqueIndex("variante_nombre_unico").on(t.servicioId, sql`lower(${t.nombre})`),
    check("variante_duracion_valida", sql`${t.duracionDias} between 1 and 60`),
  ],
);

/** Textos editables de las páginas del sitio (RF-10): una fila por página, validada en src/modulos/sitio/contenido.ts. */
export const contenidoPagina = pgTable("contenido_pagina", {
  clave: text("clave").primaryKey(),
  datos: jsonb("datos").$type<Record<string, unknown>>().notNull(),
  /** Foto de la página, opcional. Hoy solo la portada: la foto del taller detrás del lema. */
  fotoArchivoId: integer("foto_archivo_id").references(() => archivo.id),
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
export const galeriaItem = pgTable(
  "galeria_item",
  {
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
    /** El trabajo elegido para el comparador de la portada (pedido de la demo del 24/10): uno solo, y con foto de antes. */
    enPortada: boolean("en_portada").default(false).notNull(),
    /** La orden de donde salieron las fotos, si se publicó desde ella (HU-41, RF-44). Las fotos son copias públicas. */
    trabajoId: integer("trabajo_id").references(() => trabajo.id),
    createdAt: momento("created_at").defaultNow().notNull(),
    createdBy: integer("created_by").references(() => usuario.id),
  },
  (t) => [
    uniqueIndex("galeria_item_una_en_portada").on(t.enPortada).where(sql`${t.enPortada}`),
    // Una orden se publica una vez (HU-41): frena también dos envíos a la vez. Quitada de la galería, se puede volver a publicar
    uniqueIndex("galeria_item_un_trabajo").on(t.trabajoId).where(sql`${t.trabajoId} is not null`),
    check("galeria_item_portada_con_antes", sql`not ${t.enPortada} or ${t.fotoAntesId} is not null`),
  ],
);
