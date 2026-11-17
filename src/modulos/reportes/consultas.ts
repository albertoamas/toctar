import "server-only";
import { and, asc, count, countDistinct, desc, eq, gte, lte, sql, type AnyColumn, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { archivo, categoriaGasto, consulta, cotizacion, gasto, pago, recordatorioMantenimiento, servicio, trabajo, trabajoLinea, variante } from "@/db/esquema";
import type { MotivoPerdida } from "@/db/esquema/consultas";
import type { MetodoPago } from "@/db/esquema/trabajos";
import { urlsFotoPrivada, type UrlsFoto } from "@/lib/fotos";
import { sucursalPrincipal } from "@/modulos/configuracion/consultas";
import { rangoDelMes, sumarMeses } from "./reglas";

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

export type MovimientoDelMes = { mes: string; entro: number; salio: number };

/** Lo que entró y salió en cada mes, del más viejo al más nuevo (los que no tuvieron nada, en cero). */
export async function movimientosPorMes(desde: string, hasta: string): Promise<MovimientoDelMes[]> {
  const s = await sucursalPrincipal();
  const inicio = rangoDelMes(desde).inicio;
  const fin = rangoDelMes(hasta).fin;
  const [entradas, salidas] = await Promise.all([
    db
      .select({ mes: sql<string>`to_char(${pago.fecha}, 'YYYY-MM')`, total: sql<string>`sum(${pago.monto})` })
      .from(pago)
      .innerJoin(trabajo, eq(pago.trabajoId, trabajo.id))
      .where(and(eq(trabajo.sucursalId, s.id), eq(pago.anulado, false), gte(pago.fecha, inicio), lte(pago.fecha, fin)))
      .groupBy(sql`1`),
    db
      .select({ mes: sql<string>`to_char(${gasto.fecha}, 'YYYY-MM')`, total: sql<string>`sum(${gasto.monto})` })
      .from(gasto)
      .where(and(eq(gasto.sucursalId, s.id), eq(gasto.anulado, false), gte(gasto.fecha, inicio), lte(gasto.fecha, fin)))
      .groupBy(sql`1`),
  ]);
  const meses: MovimientoDelMes[] = [];
  for (let m = desde; m <= hasta; m = sumarMeses(m, 1)) {
    meses.push({
      mes: m,
      entro: Number(entradas.find((e) => e.mes === m)?.total ?? 0),
      salio: Number(salidas.find((e) => e.mes === m)?.total ?? 0),
    });
  }
  return meses;
}

export type ResumenDelMes = {
  /** De cuántos vehículos (trabajos) vino lo que entró. */
  vehiculosConPagos: number;
  cuantosGastos: number;
  /** Lo que se gastó por categoría, de mayor a menor. */
  porCategoria: { nombre: string; total: number }[];
};

export async function resumenDelMes(mes: string): Promise<ResumenDelMes> {
  const s = await sucursalPrincipal();
  const { inicio, fin } = rangoDelMes(mes);
  const [[vehiculos], [gastos], porCategoria] = await Promise.all([
    db
      .select({ n: countDistinct(pago.trabajoId) })
      .from(pago)
      .innerJoin(trabajo, eq(pago.trabajoId, trabajo.id))
      .where(and(eq(trabajo.sucursalId, s.id), eq(pago.anulado, false), gte(pago.fecha, inicio), lte(pago.fecha, fin))),
    db
      .select({ n: count() })
      .from(gasto)
      .where(and(eq(gasto.sucursalId, s.id), eq(gasto.anulado, false), gte(gasto.fecha, inicio), lte(gasto.fecha, fin))),
    db
      .select({ nombre: categoriaGasto.nombre, total: sql<string>`sum(${gasto.monto})` })
      .from(gasto)
      .innerJoin(categoriaGasto, eq(gasto.categoriaId, categoriaGasto.id))
      .where(and(eq(gasto.sucursalId, s.id), eq(gasto.anulado, false), gte(gasto.fecha, inicio), lte(gasto.fecha, fin)))
      .groupBy(categoriaGasto.id, categoriaGasto.nombre)
      .orderBy(desc(sql`sum(${gasto.monto})`)),
  ]);
  return {
    vehiculosConPagos: vehiculos?.n ?? 0,
    cuantosGastos: gastos?.n ?? 0,
    porCategoria: porCategoria.map((c) => ({ nombre: c.nombre, total: Number(c.total) })),
  };
}

export type ElTallerEnElMes = {
  /** Los servicios de los vehículos entregados, los más pedidos primero (hasta 5). */
  servicios: { nombre: string; veces: number }[];
  /** Las cotizaciones que se enviaron por primera vez en el mes, cuántas se aceptaron y reservaron, y por qué no las otras. */
  cotizaciones: { enviadas: number; aceptadas: number; reservadas: number; motivos: { motivo: MotivoPerdida; veces: number }[] };
  /** Los mantenimientos avisados en el mes y cuántos de ellos ya reservaron. */
  avisados: number;
  reservaron: number;
};

export async function elTallerEnElMes(mes: string): Promise<ElTallerEnElMes> {
  const s = await sucursalPrincipal();
  const { inicio, fin } = rangoDelMes(mes);
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

export type IngresosDelMes = {
  /** De cuántos vehículos (trabajos) vino lo que entró. */
  vehiculos: number;
  porMetodo: { metodo: MetodoPago; total: number }[];
  /** Lo que entró cada día del mes (1 al último), para la línea acumulada. */
  porDia: { dia: number; total: number }[];
};

/** Lo que entró en un mes, por forma de pago y por día (pagos sin anular, por su día). */
export async function ingresosDelMes(mes: string): Promise<IngresosDelMes> {
  const s = await sucursalPrincipal();
  const { inicio, fin } = rangoDelMes(mes);
  const donde = and(eq(trabajo.sucursalId, s.id), eq(pago.anulado, false), gte(pago.fecha, inicio), lte(pago.fecha, fin));
  const [[vehiculos], porMetodo, porDia] = await Promise.all([
    db.select({ n: countDistinct(pago.trabajoId) }).from(pago).innerJoin(trabajo, eq(pago.trabajoId, trabajo.id)).where(donde),
    db
      .select({ metodo: pago.metodo, total: sql<string>`sum(${pago.monto})` })
      .from(pago)
      .innerJoin(trabajo, eq(pago.trabajoId, trabajo.id))
      .where(donde)
      .groupBy(pago.metodo)
      .orderBy(desc(sql`sum(${pago.monto})`)),
    db
      .select({ dia: sql<number>`extract(day from ${pago.fecha})::int`, total: sql<string>`sum(${pago.monto})` })
      .from(pago)
      .innerJoin(trabajo, eq(pago.trabajoId, trabajo.id))
      .where(donde)
      .groupBy(sql`1`),
  ]);
  return {
    vehiculos: vehiculos?.n ?? 0,
    porMetodo: porMetodo.map((m) => ({ metodo: m.metodo, total: Number(m.total) })),
    porDia: porDia.map((d) => ({ dia: Number(d.dia), total: Number(d.total) })),
  };
}

/** Cada entrega: de qué cliente y qué día (en Bolivia). Base de los entregados y los clientes de cada mes. */
export type Entrega = { clienteId: number; dia: string };

/** Las entregas hasta el último día de un mes (las de antes cuentan para saber quién volvió). */
export async function entregasHasta(mes: string): Promise<Entrega[]> {
  const s = await sucursalPrincipal();
  const { fin } = rangoDelMes(mes);
  const filas = await db
    .select({ clienteId: trabajo.clienteId, dia: sql<string>`to_char(${enBolivia(trabajo.entregadoAt)}, 'YYYY-MM-DD')` })
    .from(trabajo)
    .where(and(eq(trabajo.sucursalId, s.id), eq(trabajo.estado, "entregado"), lte(enBolivia(trabajo.entregadoAt), fin)));
  return filas;
}

/** Lo que se gastó por categoría en cada mes de un rango (sin anulados). */
export async function gastosPorCategoriaYMes(desde: string, hasta: string): Promise<{ mes: string; categoria: string; total: number }[]> {
  const s = await sucursalPrincipal();
  const filas = await db
    .select({ mes: sql<string>`to_char(${gasto.fecha}, 'YYYY-MM')`, categoria: categoriaGasto.nombre, total: sql<string>`sum(${gasto.monto})` })
    .from(gasto)
    .innerJoin(categoriaGasto, eq(gasto.categoriaId, categoriaGasto.id))
    .where(and(eq(gasto.sucursalId, s.id), eq(gasto.anulado, false), gte(gasto.fecha, rangoDelMes(desde).inicio), lte(gasto.fecha, rangoDelMes(hasta).fin)))
    .groupBy(sql`1`, categoriaGasto.nombre);
  return filas.map((f) => ({ mes: f.mes, categoria: f.categoria, total: Number(f.total) }));
}
