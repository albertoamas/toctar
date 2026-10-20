import { sql } from "drizzle-orm";
import { check, index, integer, numeric, pgTable, timestamp } from "drizzle-orm/pg-core";
import { usuario } from "./acceso";
import { tamanoVehiculo } from "./configuracion";
import { variante } from "./sitio";

// Precios del catálogo (C1, HU-20). Especificación: docs/08-desarrollo/etapas/C1-catalogo-clientes.md §4.

/**
 * Precio de una variante para un tamaño de vehículo (RN-07). Las filas no se modifican ni se borran: cada cambio es
 * una fila nueva (D-3), así el historial sale solo (RF-28, RNF-10). El vigente es la fila más reciente de cada par.
 * `monto` nulo es "según evaluación" (RF-26); un par sin filas está "sin cargar".
 */
export const precio = pgTable(
  "precio",
  {
    id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
    varianteId: integer("variante_id")
      .notNull()
      .references(() => variante.id),
    tamanoId: integer("tamano_id")
      .notNull()
      .references(() => tamanoVehiculo.id),
    monto: numeric("monto", { precision: 10, scale: 2 }),
    vigenteDesde: timestamp("vigente_desde", { withTimezone: true }).defaultNow().notNull(),
    createdBy: integer("created_by")
      .notNull()
      .references(() => usuario.id),
  },
  (t) => [
    index("precio_vigente").on(t.varianteId, t.tamanoId, t.vigenteDesde.desc(), t.id.desc()),
    check("precio_monto_positivo", sql`${t.monto} > 0`),
  ],
);
