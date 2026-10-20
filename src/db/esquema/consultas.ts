import { sql } from "drizzle-orm";
import { check, index, integer, jsonb, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";
import { usuario } from "./acceso";
import { cliente, vehiculo } from "./clientes";
import { archivo } from "./configuracion";
import { servicio } from "./sitio";

// Consultas (C2, HU-24 y HU-28) y auditoría (RNF-10). Especificación: docs/08-desarrollo/etapas/C2-consultas-cotizaciones.md §4.

const momento = (nombre: string) => timestamp(nombre, { withTimezone: true });

export const CANALES = ["whatsapp", "taller"] as const;
export type Canal = (typeof CANALES)[number];
export const ESTADOS_CONSULTA = ["consulto", "cotizado", "confirmado", "perdido"] as const;
export type EstadoConsulta = (typeof ESTADOS_CONSULTA)[number];
export const MOTIVOS_PERDIDA = ["precio", "no_respondio", "otro"] as const;
export type MotivoPerdida = (typeof MOTIVOS_PERDIDA)[number];

const lista = (valores: readonly string[]) => sql.raw(valores.map((v) => `'${v}'`).join(", "));

/** Cada consulta de un cliente por un vehículo (RF-29), con su estado (RF-30) y su último movimiento (RF-35). */
export const consulta = pgTable(
  "consulta",
  {
    id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
    clienteId: integer("cliente_id")
      .notNull()
      .references(() => cliente.id),
    vehiculoId: integer("vehiculo_id")
      .notNull()
      .references(() => vehiculo.id),
    /** Vacío: el cliente todavía no sabe qué servicio quiere. */
    servicioId: integer("servicio_id").references(() => servicio.id),
    canal: text("canal").$type<Canal>().notNull(),
    estado: text("estado").$type<EstadoConsulta>().default("consulto").notNull(),
    motivoPerdida: text("motivo_perdida").$type<MotivoPerdida>(),
    detallePerdida: text("detalle_perdida"),
    nota: text("nota"),
    ultimoMovimientoAt: momento("ultimo_movimiento_at").defaultNow().notNull(),
    createdAt: momento("created_at").defaultNow().notNull(),
    createdBy: integer("created_by")
      .notNull()
      .references(() => usuario.id),
  },
  (t) => [
    check("consulta_canal_valido", sql`${t.canal} in (${lista(CANALES)})`),
    check("consulta_estado_valido", sql`${t.estado} in (${lista(ESTADOS_CONSULTA)})`),
    check("consulta_motivo_valido", sql`${t.motivoPerdida} in (${lista(MOTIVOS_PERDIDA)})`),
    // El motivo va solo con "perdido", y "perdido" siempre lo lleva
    check("consulta_motivo_si_perdida", sql`(${t.estado} = 'perdido') = (${t.motivoPerdida} is not null)`),
    index("consulta_por_estado").on(t.estado, t.ultimoMovimientoAt),
    index("consulta_por_cliente").on(t.clienteId),
  ],
);

/** Fotos y videos de una consulta (RF-29). Privados: son datos de clientes. */
export const consultaArchivo = pgTable(
  "consulta_archivo",
  {
    consultaId: integer("consulta_id")
      .notNull()
      .references(() => consulta.id),
    archivoId: integer("archivo_id")
      .notNull()
      .references(() => archivo.id),
    orden: integer("orden").notNull(),
  },
  (t) => [primaryKey({ columns: [t.consultaId, t.archivoId] })],
);

/** Quién y cuándo crea o cambia cotizaciones y, en C3, pagos (RNF-10). Solo se agregan filas. */
export const auditoria = pgTable(
  "auditoria",
  {
    id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
    usuarioId: integer("usuario_id")
      .notNull()
      .references(() => usuario.id),
    entidad: text("entidad").notNull(),
    entidadId: integer("entidad_id").notNull(),
    accion: text("accion").notNull(),
    datos: jsonb("datos").$type<Record<string, unknown>>().notNull(),
    createdAt: momento("created_at").defaultNow().notNull(),
  },
  (t) => [index("auditoria_por_entidad").on(t.entidad, t.entidadId)],
);
