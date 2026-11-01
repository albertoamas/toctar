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
// en la migración 0026 (Drizzle no la describe). Especificación: docs/08-desarrollo/etapas/C3-agenda-pagos.md §4 y,
// para la orden (recepción, fotos, avances y entrega), C4-taller-entrega.md §4.

const momento = (nombre: string) => timestamp(nombre, { withTimezone: true });
const monto = (nombre: string) => numeric(nombre, { precision: 10, scale: 2 });
const lista = (valores: readonly string[]) => sql.raw(valores.map((v) => `'${v}'`).join(", "));

export const ESTADOS_TRABAJO = ["agendado", "recibido", "en_proceso", "listo", "entregado", "cancelado"] as const;
export type EstadoTrabajo = (typeof ESTADOS_TRABAJO)[number];
export const METODOS_PAGO = ["efectivo", "qr", "transferencia"] as const;
export type MetodoPago = (typeof METODOS_PAGO)[number];
export const TIPOS_PAGO = ["adelanto", "saldo"] as const;
export type TipoPago = (typeof TIPOS_PAGO)[number];
export const ETAPAS_FOTO = ["ingreso", "antes", "durante", "despues"] as const;
export type EtapaFoto = (typeof ETAPAS_FOTO)[number];
/** Estados de una orden: la reserva ya se recibió (C4). */
export const ESTADOS_ORDEN = ["recibido", "en_proceso", "listo", "entregado"] as const;

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
    /** Una cotización tiene a lo sumo una reserva que no esté cancelada (índice único parcial). */
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
    // La orden (C4, HU-33 a HU-36)
    /** Inspección de ingreso: rayones, golpes, objetos que deja el cliente (RF-40). */
    observacionesIngreso: text("observaciones_ingreso"),
    recibidoAt: momento("recibido_at"),
    recibidoPor: integer("recibido_por").references(() => usuario.id),
    /** La última vez que pasó a listo. */
    listoAt: momento("listo_at"),
    /** La entrega aproximada antes de marcarla lista antes de tiempo: si vuelve a en proceso, se recupera (HU-34). */
    fechaFinPrevista: date("fecha_fin_prevista"),
    /** El último aviso de "listo" por WhatsApp (RF-48). */
    avisadoListoAt: momento("avisado_listo_at"),
    avisadoListoPor: integer("avisado_listo_por").references(() => usuario.id),
    entregadoAt: momento("entregado_at"),
    entregadoPor: integer("entregado_por").references(() => usuario.id),
    /** Quién autorizó entregar con saldo pendiente (RN-13). */
    entregaConSaldoAutorizadaPor: integer("entrega_con_saldo_autorizada_por").references(() => usuario.id),
    /** El saldo al momento de la entrega (lista de saldos y auditoría). */
    saldoAlEntregar: monto("saldo_al_entregar"),
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
    // Una orden siempre se recibió y una entregada siempre tiene su entrega (C4)
    check("trabajo_recibido_si_orden", sql`(${t.estado} in (${lista(ESTADOS_ORDEN)})) = (${t.recibidoAt} is not null)`),
    check("trabajo_entregado_con_fecha", sql`(${t.estado} = 'entregado') = (${t.entregadoAt} is not null)`),
    // Una cotización tiene a lo sumo una reserva activa: una cancelada no cuenta, así se agenda de nuevo (HU-31)
    uniqueIndex("trabajo_cotizacion_unica").on(t.cotizacionId).where(sql`${t.estado} <> 'cancelado'`),
    index("trabajo_por_fechas").on(t.fechaInicio, t.fechaFin),
    index("trabajo_por_cliente").on(t.clienteId),
    index("trabajo_por_consulta").on(t.consultaId),
    index("trabajo_por_tecnico").on(t.tecnicoId, t.estado),
    index("trabajo_por_entrega").on(t.estado, t.entregadoAt),
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

/**
 * Fotos de la orden por etapa (RF-40, RF-42). En el bucket privado: son vehículos de clientes. Las de ingreso son la
 * prueba de cómo llegó el vehículo: no se quitan después de recibirlo (D-6).
 */
export const trabajoFoto = pgTable(
  "trabajo_foto",
  {
    id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
    trabajoId: integer("trabajo_id")
      .notNull()
      .references(() => trabajo.id),
    archivoId: integer("archivo_id")
      .notNull()
      .unique()
      .references(() => archivo.id),
    etapa: text("etapa").$type<EtapaFoto>().notNull(),
    subidoPor: integer("subido_por")
      .notNull()
      .references(() => usuario.id),
    createdAt: momento("created_at").defaultNow().notNull(),
  },
  (t) => [index("trabajo_foto_por_etapa").on(t.trabajoId, t.etapa), check("trabajo_foto_etapa_valida", sql`${t.etapa} in (${lista(ETAPAS_FOTO)})`)],
);

/** La historia de la orden: avances escritos y cambios de estado (RF-42). */
export const trabajoAvance = pgTable(
  "trabajo_avance",
  {
    id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
    trabajoId: integer("trabajo_id")
      .notNull()
      .references(() => trabajo.id),
    usuarioId: integer("usuario_id")
      .notNull()
      .references(() => usuario.id),
    nota: text("nota").notNull(),
    createdAt: momento("created_at").defaultNow().notNull(),
  },
  (t) => [index("trabajo_avance_por_trabajo").on(t.trabajoId)],
);

// Checklist de recepción (pedido 12, P12-checklist-recepcion.md §4): las partes que revisa quien recibe, y lo que
// encontró en cada una. Lo que no tiene fila llegó bien.

export const TIPOS_DETALLE = ["rayon", "golpe", "raspon", "roto", "otro"] as const;
export type TipoDetalle = (typeof TIPOS_DETALLE)[number];

/** Las partes del checklist, que arma el dueño en Configuración (RNF-11). Se desactivan, no se borran (D-6). */
export const parteRevision = pgTable(
  "parte_revision",
  {
    id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
    nombre: text("nombre").notNull(),
    orden: integer("orden").notNull(),
    activo: boolean("activo").default(true).notNull(),
  },
  (t) => [uniqueIndex("parte_revision_nombre_unico").on(sql`lower(${t.nombre})`)],
);

/** Un detalle con que llegó el vehículo: la parte (su nombre copiado, D-4), qué tiene, una nota y su foto (privada). */
export const trabajoRevision = pgTable(
  "trabajo_revision",
  {
    id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
    trabajoId: integer("trabajo_id")
      .notNull()
      .references(() => trabajo.id),
    parteId: integer("parte_id")
      .notNull()
      .references(() => parteRevision.id),
    parte: text("parte").notNull(),
    tipo: text("tipo").$type<TipoDetalle>().notNull(),
    nota: text("nota"),
    archivoId: integer("archivo_id")
      .unique()
      .references(() => archivo.id),
    createdBy: integer("created_by")
      .notNull()
      .references(() => usuario.id),
    createdAt: momento("created_at").defaultNow().notNull(),
    updatedAt: momento("updated_at").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("trabajo_revision_unica").on(t.trabajoId, t.parteId), check("trabajo_revision_tipo_valido", sql`${t.tipo} in (${lista(TIPOS_DETALLE)})`)],
);
