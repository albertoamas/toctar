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
  entregados: number;
  /** Los servicios de los vehículos entregados, los más pedidos primero (hasta 5). */
  servicios: { nombre: string; veces: number }[];
  /** Las cotizaciones que se enviaron por primera vez en el mes, cuántas ya se aceptaron y por qué no las otras. */
  cotizaciones: { enviadas: number; aceptadas: number; motivos: { motivo: MotivoPerdida; veces: number }[] };
  /** De los clientes que se llevaron su vehículo en el mes: los que ya habían venido (antes o en el mismo mes) y los nuevos. */
  volvieron: number;
  nuevos: number;
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

  const [[entregados], servicios, cotizaciones, clientes, [avisos]] = await Promise.all([
    db.select({ n: count() }).from(trabajo).where(entregadoEnElMes),
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
      .select({ estado: consulta.estado, motivo: consulta.motivoPerdida, n: count() })
      .from(primeraVersion)
      .innerJoin(consulta, eq(primeraVersion.consultaId, consulta.id))
      .where(and(gte(enBolivia(primeraVersion.enviada), inicio), lte(enBolivia(primeraVersion.enviada), fin)))
      .groupBy(consulta.estado, consulta.motivoPerdida),
    db
      .select({
        clienteId: trabajo.clienteId,
        veces: count(),
        // Volvió: ya se había llevado otro vehículo antes de este mes. Nombres fijos de tabla: el alias de Drizzle no se
        // escribe calificado dentro de un sql
        volvio: sql<boolean>`exists (select 1 from trabajo anterior where anterior.cliente_id = "trabajo"."cliente_id" and anterior.estado = 'entregado' and (anterior.entregado_at at time zone 'America/La_Paz')::date < ${inicio}::date)`,
      })
      .from(trabajo)
      .where(entregadoEnElMes)
      .groupBy(trabajo.clienteId),
    db
      // Reservó: lo tiene agendado o ya se hizo (al hacerse, la reserva pasa a trabajo_hecho_id)
      .select({ avisados: count(), reservaron: count(sql`coalesce(${recordatorioMantenimiento.trabajoAgendadoId}, ${recordatorioMantenimiento.trabajoHechoId})`) })
      .from(recordatorioMantenimiento)
      .where(and(gte(enBolivia(recordatorioMantenimiento.avisadoAt), inicio), lte(enBolivia(recordatorioMantenimiento.avisadoAt), fin))),
  ]);

  const motivos = new Map<MotivoPerdida, number>();
  for (const c of cotizaciones) if (c.motivo) motivos.set(c.motivo, (motivos.get(c.motivo) ?? 0) + c.n);
  return {
    entregados: entregados?.n ?? 0,
    servicios: servicios.map((x) => ({ nombre: x.nombre, veces: x.veces })),
    cotizaciones: {
      enviadas: cotizaciones.reduce((suma, c) => suma + c.n, 0),
      aceptadas: cotizaciones.filter((c) => c.estado === "confirmado").reduce((suma, c) => suma + c.n, 0),
      motivos: [...motivos.entries()].map(([motivo, veces]) => ({ motivo, veces })).sort((a, b) => b.veces - a.veces),
    },
    // Volvió: ya se había llevado un vehículo antes del mes, o se llevó más de uno en el mes
    volvieron: clientes.filter((c) => c.volvio || c.veces > 1).length,
    nuevos: clientes.filter((c) => !c.volvio && c.veces === 1).length,
    avisados: avisos?.avisados ?? 0,
    reservaron: avisos?.reservaron ?? 0,
  };
}
