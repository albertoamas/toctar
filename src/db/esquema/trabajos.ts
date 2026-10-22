import { sql } from "drizzle-orm";
import { boolean, check, date, index, integer, numeric, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { usuario } from "./acceso";
import { cliente, vehiculo } from "./clientes";
import { archivo, espacioTaller, sucursal } from "./configuracion";
import { consulta } from "./consultas";
import { cotizacion } from "./cotizaciones";
import { variante } from "./sitio";

// Trabajos: la reserva y, desde C4, la orden son una sola tabla (D-1). Agenda por día y espacio (S-3); un espacio no
// tiene dos vehículos el mismo día (RN-06): lo garantiza la restricción de exclusión `trabajo_sin_cruces`, que se crea
// en la migración 0026 (Drizzle no la describe). Especificación: docs/08-desarrollo/etapas/C3-agenda-pagos.md §4.

const momento = (nombre: string) => timestamp(nombre, { withTimezone: true });
const monto = (nombre: string) => numeric(nombre, { precision: 10, scale: 2 });
const lista = (valores: readonly string[]) => sql.raw(valores.map((v) => `'${v}'`).join(", "));

export const ESTADOS_TRABAJO = ["agendado", "recibido", "en_proceso", "listo", "entregado", "cancelado"] as const;
export type EstadoTrabajo = (typeof ESTADOS_TRABAJO)[number];
export const METODOS_PAGO = ["efectivo", "qr", "transferencia"] as const;
export type MetodoPago = (typeof METODOS_PAGO)[number];
export const TIPOS_PAGO = ["adelanto", "saldo"] as const;
export type TipoPago = (typeof TIPOS_PAGO)[number];

export const trabajo = pgTable(
  "trabajo",
  {
    id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
    sucursalId: integer("sucursal_id")
      .notNull()
      .references(() => sucursal.id),
    clienteId: integer("cliente_id")
      .notNull()
      .references(() => cliente.id),
    vehiculoId: integer("vehiculo_id")
      .notNull()
      .references(() => vehiculo.id),
    consultaId: integer("consulta_id").references(() => consulta.id),
    /** Una cotización se agenda una sola vez (índice único). */
    cotizacionId: integer("cotizacion_id").references(() => cotizacion.id),
    espacioId: integer("espacio_id")
      .notNull()
      .references(() => espacioTaller.id),
    fechaInicio: date("fecha_inicio").notNull(),
    /** Entrega aproximada: la sugiere la duración del catálogo y se edita en cada reserva. */
    fechaFin: date("fecha_fin").notNull(),
    /** "a las 9", "en la tarde": solo una nota (S-3). */
    horaIngreso: text("hora_ingreso"),
    tecnicoId: integer("tecnico_id").references(() => usuario.id),
    /** Copiado de la cotización (D-4); 0 en una reserva directa. Total = suma de las líneas − descuento. */
    descuento: monto("descuento").default("0").notNull(),
    estado: text("estado").$type<EstadoTrabajo>().default("agendado").notNull(),
    nota: text("nota"),
    motivoCancelacion: text("motivo_cancelacion"),
    canceladoAt: momento("cancelado_at"),
    canceladoPor: integer("cancelado_por").references(() => usuario.id),
    createdAt: momento("created_at").defaultNow().notNull(),
    createdBy: integer("created_by")
      .notNull()
      .references(() => usuario.id),
    updatedAt: momento("updated_at").defaultNow().notNull(),
  },
  (t) => [
    check("trabajo_estado_valido", sql`${t.estado} in (${lista(ESTADOS_TRABAJO)})`),
    check("trabajo_fechas_validas", sql`${t.fechaFin} >= ${t.fechaInicio}`),
    check("trabajo_descuento_valido", sql`${t.descuento} >= 0`),
    check("trabajo_motivo_si_cancelado", sql`(${t.estado} = 'cancelado') = (${t.motivoCancelacion} is not null)`),
    uniqueIndex("trabajo_cotizacion_unica").on(t.cotizacionId),
    index("trabajo_por_fechas").on(t.fechaInicio, t.fechaFin),
    index("trabajo_por_cliente").on(t.clienteId),
    index("trabajo_por_consulta").on(t.consultaId),
  ],
);

/** Servicios del trabajo, con descripción y precio copiados (D-4). Total = suma de las líneas − descuento del trabajo. */
export const trabajoLinea = pgTable(
  "trabajo_linea",
  {
    id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
    trabajoId: integer("trabajo_id")
      .notNull()
      .references(() => trabajo.id),
    varianteId: integer("variante_id")
      .notNull()
      .references(() => variante.id),
    descripcion: text("descripcion").notNull(),
    precio: monto("precio").notNull(),
    /** Sumado por el dueño en la orden (C4, RF-43). */
    esAdicional: boolean("es_adicional").default(false).notNull(),
    orden: integer("orden").notNull(),
  },
  (t) => [index("trabajo_linea_por_trabajo").on(t.trabajoId), check("trabajo_linea_precio_positivo", sql`${t.precio} > 0`)],
);

/** Pagos de un trabajo (RF-45). No se borran: se anulan con motivo (D-6). Saldo = total − pagos no anulados (RF-46). */
export const pago = pgTable(
  "pago",
  {
    id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
    trabajoId: integer("trabajo_id")
      .notNull()
      .references(() => trabajo.id),
    monto: monto("monto").notNull(),
    metodo: text("metodo").$type<MetodoPago>().notNull(),
    tipo: text("tipo").$type<TipoPago>().notNull(),
    /** Día del pago, en Bolivia. */
    fecha: date("fecha").notNull(),
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
    index("pago_por_trabajo").on(t.trabajoId),
    check("pago_monto_positivo", sql`${t.monto} > 0`),
    check("pago_metodo_valido", sql`${t.metodo} in (${lista(METODOS_PAGO)})`),
    check("pago_tipo_valido", sql`${t.tipo} in (${lista(TIPOS_PAGO)})`),
    check("pago_motivo_si_anulado", sql`${t.anulado} = (${t.motivoAnulacion} is not null)`),
  ],
);
