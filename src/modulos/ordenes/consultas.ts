import "server-only";
import { and, asc, count, desc, eq, inArray, like, min, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { archivo, cliente, galeriaItem, parteRevision, servicio, trabajo, trabajoAvance, trabajoFoto, trabajoLinea, trabajoRevision, usuario, variante, vehiculo } from "@/db/esquema";
import type { EstadoRevision, EstadoTrabajo, EtapaFoto, TipoDetalle } from "@/db/esquema/trabajos";
import { urlsFotoPrivada, type UrlsFoto } from "@/lib/fotos";
import { obtenerReserva, type DetalleReserva } from "@/modulos/agenda/consultas";
import { escaparLike, nombreVehiculo, normalizarBusqueda } from "@/modulos/clientes/reglas";
import { ENTREGADAS_POR_PAGINA, ESTADOS_ORDEN_ABIERTA, fechaBuscada } from "./reglas";

// Lecturas de las órdenes (C4). Quien las llama ya pasó por exigirModulo("ordenes") y, si es técnico, por
// `puedeVerOrden` (src/lib/permisos.ts). Los montos solo para quien ve "Pagos" (RN-12). Especificación: docs/08-desarrollo/etapas/C4-taller-entrega.md.

export type FotoOrden = UrlsFoto & { id: number; etapa: EtapaFoto; subidoPor: number };

/**
 * Las fotos de un trabajo (o solo las de esas etapas), por etapa y en el orden en que se subieron, con enlaces firmados
 * (bucket privado). Firmarlos es dar acceso: llamarla después de verificar que quien mira puede ver la orden.
 */
export async function fotosDeTrabajo(trabajoId: number, etapas?: readonly EtapaFoto[]): Promise<FotoOrden[]> {
  const filas = await db
    .select({ id: trabajoFoto.id, etapa: trabajoFoto.etapa, subidoPor: trabajoFoto.subidoPor, clave: archivo.clave, miniaturaClave: archivo.miniaturaClave, ancho: archivo.ancho, alto: archivo.alto })
    .from(trabajoFoto)
    .innerJoin(archivo, eq(trabajoFoto.archivoId, archivo.id))
    .where(and(eq(trabajoFoto.trabajoId, trabajoId), etapas ? inArray(trabajoFoto.etapa, [...etapas]) : undefined))
    .orderBy(asc(trabajoFoto.id));
  return Promise.all(filas.map(async ({ clave, miniaturaClave, ancho, alto, ...f }) => ({ ...f, ...(await urlsFotoPrivada({ clave, miniaturaClave, ancho, alto })) })));
}

export type DetalleOrden = DetalleReserva & {
  /** Las descripciones de los servicios, para todos (el técnico las necesita para trabajar); los precios van en `montos`. */
  servicios: string[];
};

/** Una reserva u orden con lo que hace falta para recibirla o trabajarla (sin las fotos); null si no existe. */
export async function obtenerOrden(id: number, conMontos: boolean): Promise<DetalleOrden | null> {
  const reserva = await obtenerReserva(id, conMontos);
  if (!reserva) return null;
  // Con montos, las líneas ya vinieron; sin ellos (el técnico), solo sus nombres
  const servicios = reserva.montos
    ? reserva.montos.lineas.map((l) => l.descripcion)
    : (await db.select({ descripcion: trabajoLinea.descripcion }).from(trabajoLinea).where(eq(trabajoLinea.trabajoId, id)).orderBy(asc(trabajoLinea.orden))).map((s) => s.descripcion);
  return { ...reserva, servicios };
}

type Base = Pick<typeof db, "select">;

/**
 * Los servicios de la orden, uno por servicio aunque tenga varias líneas, en el orden de sus líneas (el principal
 * primero). Con `soloActivos`, los que siguen en el catálogo (los que la galería deja elegir); con `base`, dentro de
 * una transacción. Los del mantenimiento se leen en `mantenimientos/planes.ts` (pedido 21).
 */
export async function serviciosDeOrden(
  trabajoId: number,
  opciones: { soloActivos?: boolean; base?: Base } = {},
): Promise<{ id: number; nombre: string }[]> {
  return (opciones.base ?? db)
    .select({ id: servicio.id, nombre: servicio.nombre })
    .from(trabajoLinea)
    .innerJoin(variante, eq(trabajoLinea.varianteId, variante.id))
    .innerJoin(servicio, eq(variante.servicioId, servicio.id))
    .where(
      and(
        eq(trabajoLinea.trabajoId, trabajoId),
        opciones.soloActivos ? eq(servicio.activo, true) : undefined,
      ),
    )
    .groupBy(servicio.id, servicio.nombre)
    .orderBy(min(trabajoLinea.orden));
}

/** Si la orden ya se publicó en la galería (HU-41; una sola vez): cuántas fotos y si se ve; null si no se publicó. */
export async function publicadaDeOrden(trabajoId: number): Promise<{ fotos: number; visible: boolean } | null> {
  const [fila] = await db
    .select({ antes: galeriaItem.fotoAntesId, visible: galeriaItem.visible })
    .from(galeriaItem)
    .where(eq(galeriaItem.trabajoId, trabajoId));
  return fila ? { fotos: fila.antes ? 2 : 1, visible: fila.visible } : null;
}

export type Avance = { id: number; nota: string; autor: string; createdAt: Date };

/** La historia de la orden, la más nueva arriba (RF-42). */
export async function avancesDeTrabajo(trabajoId: number): Promise<Avance[]> {
  return db
    .select({ id: trabajoAvance.id, nota: trabajoAvance.nota, autor: usuario.name, createdAt: trabajoAvance.createdAt })
    .from(trabajoAvance)
    .innerJoin(usuario, eq(trabajoAvance.usuarioId, usuario.id))
    .where(eq(trabajoAvance.trabajoId, trabajoId))
    .orderBy(desc(trabajoAvance.createdAt), desc(trabajoAvance.id));
}

export type OrdenEnLista = {
  id: number;
  estado: EstadoTrabajo;
  placa: string;
  /** Marca y modelo ("Toyota Hilux"); vacío si no se cargaron. */
  vehiculo: string;
  cliente: string;
  fechaFin: string;
  /** Lista y todavía sin avisar al cliente (HU-35). */
  sinAvisar: boolean;
  servicios: string[];
};

/**
 * Las órdenes abiertas. Primero las que se trabajan, la entrega más cercana arriba (así las atrasadas y las de hoy quedan
 * primero); al final, las listas que esperan al cliente.
 */
export async function ordenesAbiertas(): Promise<OrdenEnLista[]> {
  const abiertas = inArray(trabajo.estado, [...ESTADOS_ORDEN_ABIERTA]);
  const ordenes = await db
    .select({
      id: trabajo.id,
      estado: trabajo.estado,
      placa: vehiculo.placa,
      marca: vehiculo.marca,
      modelo: vehiculo.modelo,
      cliente: cliente.nombre,
      fechaFin: trabajo.fechaFin,
      avisadoListoAt: trabajo.avisadoListoAt,
    })
    .from(trabajo)
    .innerJoin(vehiculo, eq(trabajo.vehiculoId, vehiculo.id))
    .innerJoin(cliente, eq(trabajo.clienteId, cliente.id))
    .where(abiertas)
    .orderBy(asc(trabajo.fechaFin), asc(trabajo.id));
  if (ordenes.length === 0) return [];
  const lineas = await db
    .select({ trabajoId: trabajoLinea.trabajoId, descripcion: trabajoLinea.descripcion })
    .from(trabajoLinea)
    .where(
      inArray(
        trabajoLinea.trabajoId,
        ordenes.map((o) => o.id),
      ),
    )
    .orderBy(asc(trabajoLinea.orden));
  const porOrden = new Map<number, string[]>();
  for (const l of lineas) porOrden.set(l.trabajoId, [...(porOrden.get(l.trabajoId) ?? []), l.descripcion]);
  return ordenes
    .map(({ avisadoListoAt, marca, modelo, ...o }) => ({
      ...o,
      vehiculo: nombreVehiculo({ marca, modelo }),
      sinAvisar: o.estado === "listo" && avisadoListoAt === null,
      servicios: porOrden.get(o.id) ?? [],
    }))
    .sort((a, b) => Number(a.estado === "listo") - Number(b.estado === "listo"));
}

export type OrdenEntregada = { id: number; placa: string; vehiculo: string; cliente: string; entregadoAt: Date; servicios: string[] };

/**
 * El historial (pedido 28): las órdenes entregadas, la más reciente primero, de a ENTREGADAS_POR_PAGINA. `q` busca por placa, cliente o fecha de entrega ("5/10" o "5/10/2026", en hora de Bolivia).
 */
export async function ordenesEntregadas(datos: { q: string; pagina: number }): Promise<{ ordenes: OrdenEntregada[]; total: number }> {
  const busqueda = normalizarBusqueda(datos.q);
  const fecha = fechaBuscada(datos.q);
  const enBolivia = sql`(${trabajo.entregadoAt} at time zone 'America/La_Paz')`;
  const coincide = fecha
    ? and(
        sql`extract(day from ${enBolivia}) = ${fecha.dia}`,
        sql`extract(month from ${enBolivia}) = ${fecha.mes}`,
        fecha.anio ? sql`extract(year from ${enBolivia}) = ${fecha.anio}` : undefined,
      )
    : busqueda
      ? or(
          sql`unaccent(lower(${cliente.nombre})) like unaccent(lower(${`%${escaparLike(busqueda.texto)}%`}))`,
          busqueda.placa ? like(vehiculo.placa, `%${escaparLike(busqueda.placa)}%`) : undefined,
        )
      : undefined;
  const donde = and(eq(trabajo.estado, "entregado"), coincide);
  const [[{ total }], ordenes] = await Promise.all([
    db
      .select({ total: count() })
      .from(trabajo)
      .innerJoin(vehiculo, eq(trabajo.vehiculoId, vehiculo.id))
      .innerJoin(cliente, eq(trabajo.clienteId, cliente.id))
      .where(donde),
    db
      .select({ id: trabajo.id, placa: vehiculo.placa, marca: vehiculo.marca, modelo: vehiculo.modelo, cliente: cliente.nombre, entregadoAt: trabajo.entregadoAt })
      .from(trabajo)
      .innerJoin(vehiculo, eq(trabajo.vehiculoId, vehiculo.id))
      .innerJoin(cliente, eq(trabajo.clienteId, cliente.id))
      .where(donde)
      .orderBy(desc(trabajo.entregadoAt), desc(trabajo.id))
      .limit(ENTREGADAS_POR_PAGINA)
      .offset((datos.pagina - 1) * ENTREGADAS_POR_PAGINA),
  ]);
  if (ordenes.length === 0) return { ordenes: [], total };
  const lineas = await db
    .select({ trabajoId: trabajoLinea.trabajoId, descripcion: trabajoLinea.descripcion })
    .from(trabajoLinea)
    .where(inArray(trabajoLinea.trabajoId, ordenes.map((o) => o.id)))
    .orderBy(asc(trabajoLinea.orden));
  const porOrden = new Map<number, string[]>();
  for (const l of lineas) porOrden.set(l.trabajoId, [...(porOrden.get(l.trabajoId) ?? []), l.descripcion]);
  // Entregadas: la fecha de entrega siempre está (CHECK trabajo_entregado_con_fecha)
  return {
    ordenes: ordenes.map(({ marca, modelo, ...o }) => ({ ...o, vehiculo: nombreVehiculo({ marca, modelo }), entregadoAt: o.entregadoAt!, servicios: porOrden.get(o.id) ?? [] })),
    total,
  };
}

/** Una parte revisada al recibir: bien, o con un detalle (su tipo, nota y foto). */
export type DetalleRevision = {
  parteId: number;
  parte: string;
  estado: EstadoRevision;
  /** Solo con detalle. */
  tipo: TipoDetalle | null;
  nota: string | null;
  foto: UrlsFoto | null;
};

/** Las partes revisadas al recibir (pedido 12), en el orden de la lista de partes; las fotos, con enlace firmado. */
export async function revisionDeTrabajo(trabajoId: number): Promise<DetalleRevision[]> {
  const filas = await db
    .select({
      parteId: trabajoRevision.parteId,
      parte: trabajoRevision.parte,
      estado: trabajoRevision.estado,
      tipo: trabajoRevision.tipo,
      nota: trabajoRevision.nota,
      clave: archivo.clave,
      miniaturaClave: archivo.miniaturaClave,
      ancho: archivo.ancho,
      alto: archivo.alto,
    })
    .from(trabajoRevision)
    .innerJoin(parteRevision, eq(trabajoRevision.parteId, parteRevision.id))
    .leftJoin(archivo, eq(trabajoRevision.archivoId, archivo.id))
    .where(eq(trabajoRevision.trabajoId, trabajoId))
    .orderBy(asc(parteRevision.orden), asc(parteRevision.id));
  return Promise.all(
    filas.map(async ({ clave, miniaturaClave, ancho, alto, ...d }) => ({ ...d, foto: clave ? await urlsFotoPrivada({ clave, miniaturaClave, ancho, alto }) : null })),
  );
}

/** Las partes activas del checklist, en su orden: las filas de la recepción. */
export async function partesDelChecklist(): Promise<{ id: number; nombre: string }[]> {
  return db
    .select({ id: parteRevision.id, nombre: parteRevision.nombre })
    .from(parteRevision)
    .where(eq(parteRevision.activo, true))
    .orderBy(asc(parteRevision.orden), asc(parteRevision.id));
}

export type FirmaEntrega = { nombre: string | null; motivo: string | null; imagen: UrlsFoto | null };

/** La firma del cliente al entregar (pedido 13), con enlace firmado; null si no se entregó o si es de antes de la firma. */
export async function firmaDeTrabajo(trabajoId: number): Promise<FirmaEntrega | null> {
  const [f] = await db
    .select({
      nombre: trabajo.firmaNombre,
      motivo: trabajo.sinFirmaMotivo,
      clave: archivo.clave,
      miniaturaClave: archivo.miniaturaClave,
      ancho: archivo.ancho,
      alto: archivo.alto,
    })
    .from(trabajo)
    .leftJoin(archivo, eq(trabajo.firmaArchivoId, archivo.id))
    .where(eq(trabajo.id, trabajoId));
  if (!f || (!f.clave && !f.motivo)) return null;
  const { clave, miniaturaClave, ancho, alto, ...datos } = f;
  return { ...datos, imagen: clave ? await urlsFotoPrivada({ clave, miniaturaClave, ancho, alto }) : null };
}
