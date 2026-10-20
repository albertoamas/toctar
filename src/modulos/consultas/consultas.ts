import "server-only";
import { asc, count, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { archivo, cliente, consulta, consultaArchivo, servicio, tamanoVehiculo, usuario, vehiculo } from "@/db/esquema";
import type { Canal, EstadoConsulta, MotivoPerdida } from "@/db/esquema/consultas";
import { urlArchivoPrivado } from "@/lib/almacenamiento";
import { urlsFotoPrivada, type UrlsFoto } from "@/lib/fotos";
import { VISTAS, type Vista } from "./reglas";

// Lecturas de las consultas (HU-24). Quien las llama ya pasó por exigirModulo("consultas"): el dueño o un encargado
// con el permiso; el técnico nunca (RN-12).

export type FilaConsulta = {
  id: number;
  clienteId: number;
  cliente: string;
  placa: string;
  servicio: string | null;
  estado: EstadoConsulta;
  ultimoMovimientoAt: Date;
};

const columnasFila = {
  id: consulta.id,
  clienteId: consulta.clienteId,
  cliente: cliente.nombre,
  placa: vehiculo.placa,
  servicio: servicio.nombre,
  estado: consulta.estado,
  ultimoMovimientoAt: consulta.ultimoMovimientoAt,
};

/** Consultas en esos estados, las que llevan más tiempo sin movimiento primero (RF-35). */
export async function listarConsultas(estados: readonly EstadoConsulta[]): Promise<FilaConsulta[]> {
  return db
    .select(columnasFila)
    .from(consulta)
    .innerJoin(cliente, eq(consulta.clienteId, cliente.id))
    .innerJoin(vehiculo, eq(consulta.vehiculoId, vehiculo.id))
    .leftJoin(servicio, eq(consulta.servicioId, servicio.id))
    .where(inArray(consulta.estado, estados))
    .orderBy(asc(consulta.ultimoMovimientoAt), asc(consulta.id));
}

/** Cuántas consultas hay en cada pestaña de la lista (HU-28). */
export async function contarPorVista(): Promise<Record<Vista, number>> {
  const filas = await db.select({ estado: consulta.estado, total: count() }).from(consulta).groupBy(consulta.estado);
  const de = (estados: readonly EstadoConsulta[]) => filas.filter((f) => estados.includes(f.estado)).reduce((s, f) => s + f.total, 0);
  return { abiertas: de(VISTAS.abiertas), confirmadas: de(VISTAS.confirmadas), perdidas: de(VISTAS.perdidas) };
}

/** Las consultas de un cliente, de la más nueva a la más vieja (su ficha). */
export async function consultasDelCliente(clienteId: number): Promise<FilaConsulta[]> {
  return db
    .select(columnasFila)
    .from(consulta)
    .innerJoin(cliente, eq(consulta.clienteId, cliente.id))
    .innerJoin(vehiculo, eq(consulta.vehiculoId, vehiculo.id))
    .leftJoin(servicio, eq(consulta.servicioId, servicio.id))
    .where(eq(consulta.clienteId, clienteId))
    .orderBy(desc(consulta.createdAt), desc(consulta.id));
}

export type ArchivoConsulta =
  | ({ id: number; tipo: "foto" } & UrlsFoto)
  | { id: number; tipo: "video"; url: string; duracion: number | null };

export type DetalleConsulta = {
  id: number;
  clienteId: number;
  cliente: string;
  telefono: string;
  placa: string;
  tamano: string;
  marca: string | null;
  modelo: string | null;
  servicio: string | null;
  canal: Canal;
  estado: EstadoConsulta;
  motivoPerdida: MotivoPerdida | null;
  detallePerdida: string | null;
  nota: string | null;
  createdAt: Date;
  registradaPor: string;
  archivos: ArchivoConsulta[];
};

/** Una consulta con sus fotos y videos (enlaces firmados: son datos de clientes), o null si no existe. */
export async function obtenerConsulta(id: number): Promise<DetalleConsulta | null> {
  const [fila] = await db
    .select({
      id: consulta.id,
      clienteId: consulta.clienteId,
      cliente: cliente.nombre,
      telefono: cliente.telefono,
      placa: vehiculo.placa,
      tamano: tamanoVehiculo.nombre,
      marca: vehiculo.marca,
      modelo: vehiculo.modelo,
      servicio: servicio.nombre,
      canal: consulta.canal,
      estado: consulta.estado,
      motivoPerdida: consulta.motivoPerdida,
      detallePerdida: consulta.detallePerdida,
      nota: consulta.nota,
      createdAt: consulta.createdAt,
      registradaPor: usuario.name,
    })
    .from(consulta)
    .innerJoin(cliente, eq(consulta.clienteId, cliente.id))
    .innerJoin(vehiculo, eq(consulta.vehiculoId, vehiculo.id))
    .innerJoin(tamanoVehiculo, eq(vehiculo.tamanoId, tamanoVehiculo.id))
    .innerJoin(usuario, eq(consulta.createdBy, usuario.id))
    .leftJoin(servicio, eq(consulta.servicioId, servicio.id))
    .where(eq(consulta.id, id));
  if (!fila) return null;

  const archivos = await db
    .select({
      id: archivo.id,
      clave: archivo.clave,
      tipoMime: archivo.tipoMime,
      miniaturaClave: archivo.miniaturaClave,
      ancho: archivo.ancho,
      alto: archivo.alto,
      duracion: archivo.duracionSegundos,
    })
    .from(consultaArchivo)
    .innerJoin(archivo, eq(consultaArchivo.archivoId, archivo.id))
    .where(eq(consultaArchivo.consultaId, id))
    .orderBy(asc(consultaArchivo.orden));
  return {
    ...fila,
    archivos: await Promise.all(
      archivos.map(
        async (a): Promise<ArchivoConsulta> =>
          a.tipoMime.startsWith("video/")
            ? { id: a.id, tipo: "video", url: await urlArchivoPrivado(a.clave), duracion: a.duracion }
            : { id: a.id, tipo: "foto", ...(await urlsFotoPrivada(a)) },
      ),
    ),
  };
}
