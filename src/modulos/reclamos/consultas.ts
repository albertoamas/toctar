import "server-only";
import { asc, count, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { ajustarPagina, POR_PAGINA } from "@/lib/paginacion";
import { archivo, reclamo, reclamoArchivo, servicio, usuario, type EstadoReclamo } from "@/db/esquema";
import { urlsFoto, urlsFotoPrivada, type UrlsFoto } from "@/lib/fotos";

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

/**
 * Los pendientes primero; dentro de cada grupo, los más nuevos arriba. De a páginas (17/11: antes, todos de una vez): cuenta
 * los de la pestaña y los pendientes (el número de su pestaña) y trae solo la página pedida.
 */
export async function listarReclamos(datos: { soloPendientes: boolean; pagina: number }): Promise<{ reclamos: FilaReclamo[]; total: number; pendientes: number; pagina: number; paginas: number }> {
  const filtro = datos.soloPendientes ? eq(reclamo.estado, "pendiente") : undefined;
  const [cuenta] = await db
    .select({ todos: count(), pendientes: sql<number>`(count(*) filter (where ${reclamo.estado} = 'pendiente'))::int` })
    .from(reclamo);
  const total = datos.soloPendientes ? cuenta.pendientes : cuenta.todos;
  const { pagina, paginas } = ajustarPagina(datos.pagina, total);
  const reclamos = await db
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
    .where(filtro)
    .orderBy(sql`case when ${reclamo.estado} = 'pendiente' then 0 else 1 end`, desc(reclamo.createdAt), desc(reclamo.id))
    .limit(POR_PAGINA)
    .offset((pagina - 1) * POR_PAGINA);
  return { reclamos, total, pendientes: cuenta.pendientes, pagina, paginas };
}

/**
 * Para el inicio (pedido 26): cuántos reclamos esperan respuesta y los `limite` más antiguos (los que más urgen), sin
 * contar fotos: el inicio no las muestra y se abre muchas veces al día.
 */
export async function reclamosPorAtender(limite: number): Promise<{ total: number; primeros: Pick<FilaReclamo, "id" | "nombre" | "placa" | "servicio" | "createdAt">[] }> {
  const pendiente = eq(reclamo.estado, "pendiente");
  const [[{ total }], primeros] = await Promise.all([
    db.select({ total: count() }).from(reclamo).where(pendiente),
    db
      .select({ id: reclamo.id, nombre: reclamo.nombre, placa: reclamo.placa, servicio: servicio.nombre, createdAt: reclamo.createdAt })
      .from(reclamo)
      .leftJoin(servicio, eq(reclamo.servicioId, servicio.id))
      .where(pendiente)
      .orderBy(asc(reclamo.createdAt), asc(reclamo.id))
      .limit(limite),
  ]);
  return { total, primeros };
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
    .select({ clave: archivo.clave, miniaturaClave: archivo.miniaturaClave, ancho: archivo.ancho, alto: archivo.alto, privado: archivo.privado })
    .from(reclamoArchivo)
    .innerJoin(archivo, eq(reclamoArchivo.archivoId, archivo.id))
    .where(eq(reclamoArchivo.reclamoId, id))
    .orderBy(asc(reclamoArchivo.orden));
  // Las fotos de reclamos son privadas: enlaces firmados que vencen (quien llama ya verificó el permiso).
  // Las subidas antes de existir el bucket privado siguen en el público.
  return { ...fila, fotos: await Promise.all(fotos.map((f) => (f.privado ? urlsFotoPrivada(f) : urlsFoto(f)))) };
}
