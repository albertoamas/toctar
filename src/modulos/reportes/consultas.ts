import "server-only";
import { and, asc, count, countDistinct, desc, eq, gte, lte, sql, type AnyColumn, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { archivo, categoriaGasto, consulta, cotizacion, gasto, recordatorioMantenimiento, servicio, trabajo, trabajoLinea, variante } from "@/db/esquema";
import type { MotivoPerdida } from "@/db/esquema/consultas";
import type { MetodoPago } from "@/db/esquema/trabajos";
import { urlsFotoPrivada, type UrlsFoto } from "@/lib/fotos";
import { sucursalPrincipal } from "@/modulos/configuracion/consultas";
import { rangoDelMes } from "./reglas";

// Pedido 16 (P16-reportes-y-gastos.md §4): los gastos del taller. Solo el dueño: quien llama ya lo verificó.

export type CategoriaGasto = { id: number; nombre: string };

/** Las categorías que se eligen al registrar un gasto, en el orden de Configuración. */
export async function categoriasActivas(): Promise<CategoriaGasto[]> {
  return db
    .select({ id: categoriaGasto.id, nombre: categoriaGasto.nombre })
    .from(categoriaGasto)
    .where(eq(categoriaGasto.activo, true))
    .orderBy(asc(categoriaGasto.orden), asc(categoriaGasto.id));
}

export type GastoEnLista = {
  id: number;
  fecha: string;
  categoriaId: number;
  categoria: string;
  detalle: string | null;
  metodo: MetodoPago;
  monto: string;
  anulado: boolean;
  motivoAnulacion: string | null;
  comprobante: UrlsFoto | null;
};

/** Los gastos de un mes, del más reciente al más viejo, también los anulados (se ven tachados). */
export async function gastosDelMes(mes: string): Promise<GastoEnLista[]> {
  const s = await sucursalPrincipal();
  const { inicio, fin } = rangoDelMes(mes);
  const filas = await db
    .select({
      id: gasto.id,
      fecha: gasto.fecha,
      categoriaId: gasto.categoriaId,
      categoria: categoriaGasto.nombre,
      detalle: gasto.detalle,
      metodo: gasto.metodo,
      monto: gasto.monto,
      anulado: gasto.anulado,
      motivoAnulacion: gasto.motivoAnulacion,
      clave: archivo.clave,
      miniaturaClave: archivo.miniaturaClave,
      ancho: archivo.ancho,
      alto: archivo.alto,
    })
    .from(gasto)
    .innerJoin(categoriaGasto, eq(gasto.categoriaId, categoriaGasto.id))
    .leftJoin(archivo, eq(gasto.comprobanteArchivoId, archivo.id))
    .where(and(eq(gasto.sucursalId, s.id), gte(gasto.fecha, inicio), lte(gasto.fecha, fin)))
    .orderBy(desc(gasto.fecha), desc(gasto.id));
  return Promise.all(
    filas.map(async ({ clave, miniaturaClave, ancho, alto, ...g }) => ({
      ...g,
      comprobante: clave ? await urlsFotoPrivada({ clave, miniaturaClave, ancho, alto }) : null,
    })),
  );
}

// ---------------------------------------------------------------------------------------------
// Los reportes del mes (P16 §4 y §5). Lo que entró sale de los pagos no anulados, por su día; lo que salió, de los gastos
// no anulados. Las fechas ya son días de Bolivia: un mes es del día 1 al último. Lo que pasó en el taller (entregas,
// cotizaciones, avisos) se mide por su instante, llevado al día de Bolivia.

const enBolivia = (columna: SQL | SQL.Aliased | AnyColumn) => sql`(${columna} at time zone 'America/La_Paz')::date`;

export type ElTallerEntre = {
  /** Los servicios de los vehículos entregados, los más pedidos primero (hasta 5). */
  servicios: { nombre: string; veces: number }[];
  /** Las cotizaciones que se enviaron por primera vez en las fechas, cuántas se aceptaron y reservaron, y por qué no las otras. */
  cotizaciones: { enviadas: number; aceptadas: number; reservadas: number; motivos: { motivo: MotivoPerdida; veces: number }[] };
  /** Los mantenimientos avisados en las fechas y cuántos de ellos ya reservaron. */
  avisados: number;
  reservaron: number;
};

export async function elTallerEntre(inicio: string, fin: string): Promise<ElTallerEntre> {
  const s = await sucursalPrincipal();
  const entregadoEnElMes = and(
    eq(trabajo.sucursalId, s.id),
    eq(trabajo.estado, "entregado"),
    gte(enBolivia(trabajo.entregadoAt), inicio),
    lte(enBolivia(trabajo.entregadoAt), fin),
  );
  // La primera versión de cada cotización: la fecha en que se envió
  const primeraVersion = db
    .select({ consultaId: cotizacion.consultaId, enviada: sql<Date>`min(${cotizacion.createdAt})`.as("enviada") })
    .from(cotizacion)
    .groupBy(cotizacion.consultaId)
    .as("primera");

  // Reservada: tiene una reserva que no se canceló (el último paso del embudo). Una sola expresión en el select y el group by
  const reservada = sql<boolean>`exists (select 1 from trabajo reserva where reserva.consulta_id = "consulta"."id" and reserva.estado <> 'cancelado')`;
  const [servicios, cotizaciones, [avisos]] = await Promise.all([
    db
      .select({ nombre: servicio.nombre, veces: countDistinct(trabajo.id) })
      .from(trabajoLinea)
      .innerJoin(trabajo, eq(trabajoLinea.trabajoId, trabajo.id))
      .innerJoin(variante, eq(trabajoLinea.varianteId, variante.id))
      .innerJoin(servicio, eq(variante.servicioId, servicio.id))
      .where(entregadoEnElMes)
      .groupBy(servicio.id, servicio.nombre)
      .orderBy(desc(countDistinct(trabajo.id)), asc(servicio.nombre))
      .limit(5),
    db
      .select({ estado: consulta.estado, motivo: consulta.motivoPerdida, reservada, n: count() })
      .from(primeraVersion)
      .innerJoin(consulta, eq(primeraVersion.consultaId, consulta.id))
      .where(and(gte(enBolivia(primeraVersion.enviada), inicio), lte(enBolivia(primeraVersion.enviada), fin)))
      .groupBy(consulta.estado, consulta.motivoPerdida, reservada),
    db
      // Reservó: lo tiene agendado o ya se hizo (al hacerse, la reserva pasa a trabajo_hecho_id)
      .select({ avisados: count(), reservaron: count(sql`coalesce(${recordatorioMantenimiento.trabajoAgendadoId}, ${recordatorioMantenimiento.trabajoHechoId})`) })
      .from(recordatorioMantenimiento)
      .where(and(gte(enBolivia(recordatorioMantenimiento.avisadoAt), inicio), lte(enBolivia(recordatorioMantenimiento.avisadoAt), fin))),
  ]);

  const motivos = new Map<MotivoPerdida, number>();
  for (const c of cotizaciones) if (c.motivo) motivos.set(c.motivo, (motivos.get(c.motivo) ?? 0) + c.n);
  return {
    servicios: servicios.map((x) => ({ nombre: x.nombre, veces: x.veces })),
    cotizaciones: {
      enviadas: cotizaciones.reduce((suma, c) => suma + c.n, 0),
      aceptadas: cotizaciones.filter((c) => c.estado === "confirmado").reduce((suma, c) => suma + c.n, 0),
      reservadas: cotizaciones.filter((c) => c.reservada).reduce((suma, c) => suma + c.n, 0),
      motivos: [...motivos.entries()].map(([motivo, veces]) => ({ motivo, veces })).sort((a, b) => b.veces - a.veces),
    },
    avisados: avisos?.avisados ?? 0,
    reservaron: avisos?.reservaron ?? 0,
  };
}

// ---------------------------------------------------------------------------------------------
// Las pestañas de Reportes (16/11, opción A del desarrollador, registro-de-cambios.md, pedido 16): Ingresos y Taller y
// clientes, con sus tendencias.

/** Cada entrega: de qué cliente y qué día (en Bolivia). Base de los entregados y los clientes de cada tramo. */
