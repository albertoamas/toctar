import { sql } from "drizzle-orm";
import { boolean, check, date, index, integer, numeric, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { usuario } from "./acceso";
import { archivo, sucursal } from "./configuracion";
import { METODOS_PAGO, type MetodoPago } from "./trabajos";

// Pedido 16 (opción B): los gastos del taller, para saber cuánto quedó en el mes. Especificación:
// docs/08-desarrollo/etapas/P16-reportes-y-gastos.md §4. Solo el dueño los registra y los ve.

const momento = (nombre: string) => timestamp(nombre, { withTimezone: true });
const lista = (valores: readonly string[]) => sql.raw(valores.map((v) => `'${v}'`).join(", "));

/**
 * En qué se gasta (Insumos y productos, Alquiler del local…): una lista de Configuración, como las partes del
 * checklist. Desactivar no borra: los gastos ya registrados la siguen mostrando (D-6).
 */
export const categoriaGasto = pgTable(
  "categoria_gasto",
  {
    id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
    nombre: text("nombre").notNull(),
    orden: integer("orden").notNull(),
    activo: boolean("activo").default(true).notNull(),
  },
  (t) => [uniqueIndex("categoria_gasto_nombre_unico").on(sql`lower(${t.nombre})`)],
);

/** Un gasto del taller. No se borra: se anula con motivo, como un pago (RN-14, D-6), y deja de contar. */
export const gasto = pgTable(
  "gasto",
  {
    id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
    sucursalId: integer("sucursal_id")
      .notNull()
      .references(() => sucursal.id),
    categoriaId: integer("categoria_id")
      .notNull()
      .references(() => categoriaGasto.id),
    /** Los mismos montos que un pago (numeric(10,2)). */
    monto: numeric("monto", { precision: 10, scale: 2 }).notNull(),
    metodo: text("metodo").$type<MetodoPago>().notNull(),
    /** Día del gasto, en Bolivia. */
    fecha: date("fecha").notNull(),
    detalle: text("detalle"),
    /** La foto del comprobante, en el bucket privado: es un dato del negocio. */
    comprobanteArchivoId: integer("comprobante_archivo_id").references(() => archivo.id),
    anulado: boolean("anulado").default(false).notNull(),
    motivoAnulacion: text("motivo_anulacion"),
    anuladoAt: momento("anulado_at"),
    anuladoPor: integer("anulado_por").references(() => usuario.id),
    createdAt: momento("created_at").defaultNow().notNull(),
    createdBy: integer("created_by")
      .notNull()
      .references(() => usuario.id),
  },
  (t) => [
    index("gasto_por_fecha").on(t.sucursalId, t.fecha),
    check("gasto_monto_positivo", sql`${t.monto} > 0`),
    check("gasto_metodo_valido", sql`${t.metodo} in (${lista(METODOS_PAGO)})`),
    check("gasto_motivo_si_anulado", sql`${t.anulado} = (${t.motivoAnulacion} is not null)`),
  ],
);
