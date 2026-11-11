import { sql } from "drizzle-orm";
import { boolean, check, date, index, integer, jsonb, numeric, pgTable, primaryKey, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { usuario } from "./acceso";
import { archivo, tamanoVehiculo } from "./configuracion";
import { consulta } from "./consultas";
import { variante } from "./sitio";

// Cotizaciones (C2, HU-25 a HU-27). Especificación: docs/08-desarrollo/etapas/C2-consultas-cotizaciones.md §4.
// Una cotización enviada no cambia (RN-02, RF-34): no hay acción de editar; corregirla crea la versión siguiente con el
// mismo número. Las líneas y los textos se copian (D-4): cambiar el catálogo o la configuración no la toca.

const momento = (nombre: string) => timestamp(nombre, { withTimezone: true });
const monto = (nombre: string) => numeric(nombre, { precision: 10, scale: 2 });

export type DatosDocumento = {
  cliente: { nombre: string; telefono: string };
  vehiculo: { placa: string; descripcion: string | null; tamano: string };
  negocio: { nombre: string; razonSocial: string | null; nit: string | null; whatsapp: string | null; direccion: string | null };
};

export const ESTADOS_COTIZACION = ["enviada", "reemplazada", "aceptada"] as const;
export type EstadoCotizacion = (typeof ESTADOS_COTIZACION)[number];

export const cotizacion = pgTable(
  "cotizacion",
  {
    id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
    consultaId: integer("consulta_id")
      .notNull()
      .references(() => consulta.id),
    /** "2026-0042": año de Bolivia y correlativo del año. Las versiones lo comparten. */
    numero: text("numero").notNull(),
    version: integer("version").notNull(),
    /** Cotización por fotos o video: el precio se confirma al ver el vehículo (RN-03). */
    esEstimado: boolean("es_estimado").notNull(),
    subtotal: monto("subtotal").notNull(),
    descuento: monto("descuento").notNull(),
    total: monto("total").notNull(),
    adelantoSugerido: monto("adelanto_sugerido").notNull(),
    validaHasta: date("valida_hasta").notNull(),
    condiciones: text("condiciones").notNull(),
    garantia: text("garantia").notNull(),
    formasPago: text("formas_pago").notNull(),
    /**
     * Cliente, vehículo y negocio como estaban al cotizar (D-4): el PDF sale de acá, aunque se genere después
     * ("Generar PDF") o los datos cambien. Así un PDF de esta versión siempre dice lo mismo (RN-02).
     */
    datosDocumento: jsonb("datos_documento").$type<DatosDocumento>().notNull(),
    estado: text("estado").$type<EstadoCotizacion>().default("enviada").notNull(),
    /** El PDF guardado (HU-26). Vacío solo mientras se genera. */
    pdfArchivoId: integer("pdf_archivo_id").references(() => archivo.id),
    /**
     * Pedido 47: el código del enlace que se le manda al cliente por WhatsApp (`/c/<código>`), para ver el PDF sin cuenta.
     * 122 bits aleatorios: no se adivina. Lo pone la base al crear la versión.
     */
    enlace: text("enlace")
      .default(sql`replace(gen_random_uuid()::text, '-', '')`)
      .notNull(),
    createdAt: momento("created_at").defaultNow().notNull(),
    createdBy: integer("created_by")
      .notNull()
      .references(() => usuario.id),
  },
  (t) => [
    uniqueIndex("cotizacion_numero_version").on(t.numero, t.version),
    uniqueIndex("cotizacion_enlace_unico").on(t.enlace),
    index("cotizacion_por_consulta").on(t.consultaId),
    check("cotizacion_estado_valido", sql`${t.estado} in ('enviada', 'reemplazada', 'aceptada')`),
    check("cotizacion_descuento_valido", sql`${t.descuento} >= 0`),
    check("cotizacion_total_valido", sql`${t.total} = ${t.subtotal} - ${t.descuento} and ${t.total} >= 0`),
    check("cotizacion_adelanto_valido", sql`${t.adelantoSugerido} >= 0 and ${t.adelantoSugerido} <= ${t.total}`),
    check("cotizacion_version_valida", sql`${t.version} >= 1`),
  ],
);

/** Cada servicio cotizado, con su precio copiado (D-4). */
export const cotizacionLinea = pgTable(
  "cotizacion_linea",
  {
    id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
    cotizacionId: integer("cotizacion_id")
      .notNull()
      .references(() => cotizacion.id),
    varianteId: integer("variante_id")
      .notNull()
      .references(() => variante.id),
    /** El tamaño del vehículo al cotizar: de él salió el precio sugerido. */
    tamanoId: integer("tamano_id")
      .notNull()
      .references(() => tamanoVehiculo.id),
    /** "Pulido y nano cerámico — 5 años", copiado al cotizar. */
    descripcion: text("descripcion").notNull(),
    /** El vigente del catálogo al cotizar; vacío si era "según evaluación" o no estaba cargado. */
    precioSugerido: monto("precio_sugerido"),
    precio: monto("precio").notNull(),
    orden: integer("orden").notNull(),
  },
  (t) => [index("cotizacion_linea_por_cotizacion").on(t.cotizacionId), check("cotizacion_linea_precio_positivo", sql`${t.precio} > 0`)],
);

/** Fotos de la consulta elegidas para el PDF (hasta 4, se valida en la acción). */
export const cotizacionFoto = pgTable(
  "cotizacion_foto",
  {
    cotizacionId: integer("cotizacion_id")
      .notNull()
      .references(() => cotizacion.id),
    archivoId: integer("archivo_id")
      .notNull()
      .references(() => archivo.id),
    orden: integer("orden").notNull(),
  },
  (t) => [primaryKey({ columns: [t.cotizacionId, t.archivoId] }), index("cotizacion_foto_por_archivo").on(t.archivoId)],
);

/**
 * Último número usado por clave ("cotizacion-2026"). Se toma con INSERT … ON CONFLICT DO UPDATE … RETURNING dentro de la
 * transacción que crea la cotización: dos al mismo tiempo no repiten número.
 */
export const correlativo = pgTable("correlativo", {
  clave: text("clave").primaryKey(),
  ultimo: integer("ultimo").notNull(),
});
