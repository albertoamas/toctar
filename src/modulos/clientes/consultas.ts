import "server-only";
import { and, asc, desc, eq, inArray, like, ne, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { cliente, tamanoVehiculo, vehiculo } from "@/db/esquema";
import { escaparLike, normalizarBusqueda } from "./reglas";

// Lecturas de clientes (C1). Quien las llama ya pasó por exigirModulo("clientes"): el dueño o un encargado con el
// permiso.

export type FilaCliente = { id: number; nombre: string; telefono: string; placas: string[] };

const LIMITE_RESULTADOS = 30;

/**
 * Clientes por nombre (sin importar tildes ni mayúsculas), parte del teléfono o placa (HU-22, RF-22). Sin búsqueda,
 * los más recientes. Trae uno más del límite para saber si hay más (`hayMas`).
 */
export async function buscarClientes(q: string, desactivados = false): Promise<{ clientes: FilaCliente[]; hayMas: boolean }> {
  const busqueda = normalizarBusqueda(q);
  const coincide = busqueda
    ? or(
        sql`unaccent(lower(${cliente.nombre})) like unaccent(lower(${`%${escaparLike(busqueda.texto)}%`}))`,
        busqueda.digitos ? like(cliente.telefono, `%${escaparLike(busqueda.digitos)}%`) : undefined,
        busqueda.placa
          ? inArray(
              cliente.id,
              db
                .select({ id: vehiculo.clienteId })
                .from(vehiculo)
                .where(and(eq(vehiculo.activo, true), like(vehiculo.placa, `%${escaparLike(busqueda.placa)}%`))),
            )
          : undefined,
      )
    : undefined;
  const filas = await db
    .select({ id: cliente.id, nombre: cliente.nombre, telefono: cliente.telefono })
    .from(cliente)
    .where(and(eq(cliente.activo, !desactivados), coincide))
    .orderBy(desc(cliente.updatedAt), desc(cliente.id))
    .limit(LIMITE_RESULTADOS + 1);
  return { clientes: await conPlacas(filas.slice(0, LIMITE_RESULTADOS)), hayMas: filas.length > LIMITE_RESULTADOS };
}

async function conPlacas<T extends { id: number }>(clientes: T[]): Promise<(T & { placas: string[] })[]> {
  if (clientes.length === 0) return [];
  const vehiculos = await db
    .select({ clienteId: vehiculo.clienteId, placa: vehiculo.placa })
    .from(vehiculo)
    .where(and(eq(vehiculo.activo, true), inArray(vehiculo.clienteId, clientes.map((c) => c.id))))
    .orderBy(asc(vehiculo.id));
  return clientes.map((c) => ({ ...c, placas: vehiculos.filter((v) => v.clienteId === c.id).map((v) => v.placa) }));
}

export type VehiculoCliente = {
  id: number;
  placa: string;
  tamanoId: number;
  tamano: string;
  marca: string | null;
  modelo: string | null;
  anio: number | null;
  color: string | null;
  activo: boolean;
};

export type DetalleCliente = {
  id: number;
  nombre: string;
  telefono: string;
  correo: string | null;
  nit: string | null;
  razonSocial: string | null;
  notas: string | null;
  activo: boolean;
  vehiculos: VehiculoCliente[];
};

/** Un cliente con sus vehículos (los activos primero), o null si no existe. */
export async function obtenerCliente(id: number): Promise<DetalleCliente | null> {
  const [c] = await db
    .select({
      id: cliente.id,
      nombre: cliente.nombre,
      telefono: cliente.telefono,
      correo: cliente.correo,
      nit: cliente.nit,
      razonSocial: cliente.razonSocial,
      notas: cliente.notas,
      activo: cliente.activo,
    })
    .from(cliente)
    .where(eq(cliente.id, id));
  if (!c) return null;
  const vehiculos = await db
    .select({
      id: vehiculo.id,
      placa: vehiculo.placa,
      tamanoId: vehiculo.tamanoId,
      tamano: tamanoVehiculo.nombre,
      marca: vehiculo.marca,
      modelo: vehiculo.modelo,
      anio: vehiculo.anio,
      color: vehiculo.color,
      activo: vehiculo.activo,
    })
    .from(vehiculo)
    .innerJoin(tamanoVehiculo, eq(vehiculo.tamanoId, tamanoVehiculo.id))
    .where(eq(vehiculo.clienteId, id))
    .orderBy(desc(vehiculo.activo), asc(vehiculo.id));
  return { ...c, vehiculos };
}

/** Quién tiene ya ese teléfono, para avisar el duplicado (RF-23). `excepto`: el cliente que se está editando. */
export async function clienteConTelefono(telefono: string, excepto?: number): Promise<{ id: number; nombre: string } | null> {
  const [c] = await db
    .select({ id: cliente.id, nombre: cliente.nombre })
    .from(cliente)
    .where(and(eq(cliente.telefono, telefono), excepto ? ne(cliente.id, excepto) : undefined));
  return c ?? null;
}

/**
 * De quién es esa placa entre los vehículos activos, para avisar el duplicado (RF-23). `excepto`: el vehículo que se
 * está editando o reactivando, que no choca consigo mismo.
 */
export async function clienteConPlaca(placa: string, excepto?: number): Promise<{ id: number; nombre: string; vehiculoId: number } | null> {
  const [c] = await db
    .select({ id: cliente.id, nombre: cliente.nombre, vehiculoId: vehiculo.id })
    .from(vehiculo)
    .innerJoin(cliente, eq(vehiculo.clienteId, cliente.id))
    .where(and(eq(vehiculo.placa, placa), eq(vehiculo.activo, true), excepto ? ne(vehiculo.id, excepto) : undefined));
  return c ?? null;
}

export type DatosCambioDueno = {
  placa: string;
  marca: string | null;
  modelo: string | null;
  anio: number | null;
  color: string | null;
  tamano: string;
  activo: boolean;
  dueno: string;
  /** Agendada, en el taller o lista: frena el cambio. */
  reservaActiva: boolean;
  /** Cotizaciones del dueño actual para este vehículo que siguen abiertas (pendientes o aceptadas sin fecha). */
  cotizacionesAbiertas: number;
  /** Mantenimientos pendientes o avisados: pasan al nuevo dueño. */
  mantenimientosAbiertos: number;
};

/**
 * Lo que muestra la pantalla de cambio de dueño (pedido 37): el vehículo de ese cliente y qué va a pasar. Null si el
 * vehículo no existe o no es de ese cliente.
 */
export async function datosCambioDueno(vehiculoId: number, clienteId: number): Promise<DatosCambioDueno | null> {
  const [v] = await db
    .select({
      placa: vehiculo.placa,
      marca: vehiculo.marca,
      modelo: vehiculo.modelo,
      anio: vehiculo.anio,
      color: vehiculo.color,
      tamano: tamanoVehiculo.nombre,
      activo: vehiculo.activo,
      dueno: cliente.nombre,
      reservaActiva: sql<boolean>`exists (select 1 from trabajo t where t.vehiculo_id = ${vehiculo.id} and t.estado in ('agendado', 'recibido', 'en_proceso', 'listo'))`,
      cotizacionesAbiertas: sql<number>`(select count(*)::int from consulta q where q.vehiculo_id = ${vehiculo.id} and q.cliente_id = ${vehiculo.clienteId} and q.estado in ('cotizado', 'confirmado') and exists (select 1 from cotizacion c where c.consulta_id = q.id))`,
      mantenimientosAbiertos: sql<number>`(select count(*)::int from recordatorio_mantenimiento r where r.vehiculo_id = ${vehiculo.id} and r.estado in ('pendiente', 'avisado'))`,
    })
    .from(vehiculo)
    .innerJoin(cliente, eq(vehiculo.clienteId, cliente.id))
    .innerJoin(tamanoVehiculo, eq(vehiculo.tamanoId, tamanoVehiculo.id))
    .where(and(eq(vehiculo.id, vehiculoId), eq(vehiculo.clienteId, clienteId)));
  return v ?? null;
}
