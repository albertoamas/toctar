import "server-only";
import { asc, count, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { archivo, reclamo, reclamoArchivo, servicio, usuario, type EstadoReclamo } from "@/db/esquema";
import { urlsFoto, type UrlsFoto } from "@/lib/fotos";

// Lecturas del módulo de reclamos (HU-17). Quien las llama ya pasó por exigirModulo("reclamos").

export type FilaReclamo = {
  id: number;
  nombre: string;
  placa: string;
  servicio: string | null;
  estado: EstadoReclamo;
  fotos: number;
  createdAt: Date;
};

const fotosDelReclamo = sql<number>`(select count(*)::int from ${reclamoArchivo} where ${reclamoArchivo.reclamoId} = ${reclamo.id})`;

/** Los pendientes primero; dentro de cada grupo, los más nuevos arriba. */
export async function listarReclamos(soloPendientes: boolean): Promise<FilaReclamo[]> {
  return db
    .select({
      id: reclamo.id,
      nombre: reclamo.nombre,
      placa: reclamo.placa,
      servicio: servicio.nombre,
      estado: reclamo.estado,
      fotos: fotosDelReclamo,
      createdAt: reclamo.createdAt,
    })
    .from(reclamo)
    .leftJoin(servicio, eq(reclamo.servicioId, servicio.id))
    .where(soloPendientes ? eq(reclamo.estado, "pendiente") : undefined)
    .orderBy(sql`case when ${reclamo.estado} = 'pendiente' then 0 else 1 end`, desc(reclamo.createdAt));
}

export async function contarPendientes(): Promise<number> {
  const [{ total }] = await db.select({ total: count() }).from(reclamo).where(eq(reclamo.estado, "pendiente"));
  return total;
}

export type DetalleReclamo = {
  id: number;
  nombre: string;
  telefono: string;
  placa: string;
  servicio: string | null;
  fechaAproximada: string | null;
  descripcion: string;
  estado: EstadoReclamo;
  notaAtencion: string | null;
  atendidoPor: string | null;
  atendidoAt: Date | null;
  createdAt: Date;
  fotos: UrlsFoto[];
};

export async function obtenerReclamo(id: number): Promise<DetalleReclamo | null> {
  const [fila] = await db
    .select({
      id: reclamo.id,
      nombre: reclamo.nombre,
      telefono: reclamo.telefono,
      placa: reclamo.placa,
      servicio: servicio.nombre,
      fechaAproximada: reclamo.fechaAproximada,
      descripcion: reclamo.descripcion,
      estado: reclamo.estado,
      notaAtencion: reclamo.notaAtencion,
      atendidoPor: usuario.name,
      atendidoAt: reclamo.atendidoAt,
      createdAt: reclamo.createdAt,
    })
    .from(reclamo)
    .leftJoin(servicio, eq(reclamo.servicioId, servicio.id))
    .leftJoin(usuario, eq(reclamo.atendidoPor, usuario.id))
    .where(eq(reclamo.id, id));
  if (!fila) return null;

  const fotos = await db
    .select({ clave: archivo.clave, miniaturaClave: archivo.miniaturaClave, ancho: archivo.ancho, alto: archivo.alto })
    .from(reclamoArchivo)
    .innerJoin(archivo, eq(reclamoArchivo.archivoId, archivo.id))
    .where(eq(reclamoArchivo.reclamoId, id))
    .orderBy(asc(reclamoArchivo.orden));
  return { ...fila, fotos: fotos.map(urlsFoto) };
}
