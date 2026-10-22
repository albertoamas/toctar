import "server-only";
import { and, asc, eq, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db";
import { archivo, cliente, trabajo, trabajoFoto, trabajoLinea, usuario, vehiculo } from "@/db/esquema";
import type { EstadoTrabajo, EtapaFoto } from "@/db/esquema/trabajos";
import { urlsFotoPrivada, type UrlsFoto } from "@/lib/fotos";
import { obtenerReserva, type DetalleReserva } from "@/modulos/agenda/consultas";

// Lecturas de las órdenes (C4). Quien las llama ya pasó por exigirModulo("ordenes") y, si es técnico, por
// `puedeVerOrden`. Los montos solo para quien ve "Pagos" (RN-12). Especificación: docs/08-desarrollo/etapas/C4-taller-entrega.md.

type FotoOrden = UrlsFoto & { id: number; etapa: EtapaFoto; subidoPor: number };

/** Las fotos de un trabajo, por etapa y en el orden en que se subieron, con enlaces firmados (bucket privado). */
async function fotosDeTrabajo(trabajoId: number): Promise<FotoOrden[]> {
  const filas = await db
    .select({ id: trabajoFoto.id, etapa: trabajoFoto.etapa, subidoPor: trabajoFoto.subidoPor, clave: archivo.clave, miniaturaClave: archivo.miniaturaClave, ancho: archivo.ancho, alto: archivo.alto })
    .from(trabajoFoto)
    .innerJoin(archivo, eq(trabajoFoto.archivoId, archivo.id))
    .where(eq(trabajoFoto.trabajoId, trabajoId))
    .orderBy(asc(trabajoFoto.id));
  return Promise.all(filas.map(async ({ clave, miniaturaClave, ancho, alto, ...f }) => ({ ...f, ...(await urlsFotoPrivada({ clave, miniaturaClave, ancho, alto })) })));
}

const recibio = alias(usuario, "recibio");

export type DetalleOrden = DetalleReserva & {
  tecnicoId: number | null;
  observacionesIngreso: string | null;
  recibidoAt: Date | null;
  recibidoPor: string | null;
  /** Las descripciones de los servicios, para todos (el técnico las necesita para trabajar); los precios van en `montos`. */
  servicios: string[];
  fotos: FotoOrden[];
};

/** Una reserva u orden con lo que hace falta para recibirla o trabajarla; null si no existe. */
export async function obtenerOrden(id: number, conMontos: boolean): Promise<DetalleOrden | null> {
  const [reserva, [extra], servicios, fotos] = await Promise.all([
    obtenerReserva(id, conMontos),
    db
      .select({ tecnicoId: trabajo.tecnicoId, observacionesIngreso: trabajo.observacionesIngreso, recibidoAt: trabajo.recibidoAt, recibidoPor: recibio.name })
      .from(trabajo)
      .leftJoin(recibio, eq(trabajo.recibidoPor, recibio.id))
      .where(eq(trabajo.id, id)),
    db.select({ descripcion: trabajoLinea.descripcion }).from(trabajoLinea).where(eq(trabajoLinea.trabajoId, id)).orderBy(asc(trabajoLinea.orden)),
    fotosDeTrabajo(id),
  ]);
  if (!reserva || !extra) return null;
  return { ...reserva, ...extra, servicios: servicios.map((s) => s.descripcion), fotos };
}

export type OrdenEnLista = {
  id: number;
  estado: EstadoTrabajo;
  placa: string;
  cliente: string;
  tecnico: string | null;
  fechaFin: string;
  servicios: string[];
};

const tecnico = alias(usuario, "tecnico");

/** Las órdenes abiertas (recibidas, en proceso y listas); las de un técnico si se indica. La entrega más cercana primero. */
export async function ordenesAbiertas(tecnicoId?: number): Promise<OrdenEnLista[]> {
  const abiertas = inArray(trabajo.estado, ["recibido", "en_proceso", "listo"]);
  const ordenes = await db
    .select({ id: trabajo.id, estado: trabajo.estado, placa: vehiculo.placa, cliente: cliente.nombre, tecnico: tecnico.name, fechaFin: trabajo.fechaFin })
    .from(trabajo)
    .innerJoin(vehiculo, eq(trabajo.vehiculoId, vehiculo.id))
    .innerJoin(cliente, eq(trabajo.clienteId, cliente.id))
    .leftJoin(tecnico, eq(trabajo.tecnicoId, tecnico.id))
    .where(tecnicoId === undefined ? abiertas : and(abiertas, eq(trabajo.tecnicoId, tecnicoId)))
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
  return ordenes.map((o) => ({ ...o, servicios: porOrden.get(o.id) ?? [] }));
}
