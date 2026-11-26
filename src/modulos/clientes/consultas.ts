import "server-only";
import { and, asc, count, desc, eq, inArray, like, ne, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { ajustarPagina, POR_PAGINA } from "@/lib/paginacion";
import { cliente, consulta, marcaVehiculo, recordatorioMantenimiento, tamanoVehiculo, trabajo, vehiculo } from "@/db/esquema";
import type { EstadoTrabajo } from "@/db/esquema/trabajos";
import { cotizacionAbierta } from "@/modulos/cotizaciones/consultas/lista";
import { ESTADOS_RECORDATORIO_ABIERTO } from "@/modulos/mantenimientos/reglas";
import { ESTADOS_RESERVA_ACTIVA } from "@/modulos/ordenes/reglas";
import type { CatalogoVehiculos } from "./catalogo-vehiculos";
import { escaparLike, normalizarBusqueda, normalizarPlaca } from "./reglas";

// Lecturas de clientes (C1). Quien las llama ya pasó por exigirModulo("clientes"): el dueño o un encargado con el
// permiso.

export type FilaCliente = { id: number; nombre: string; telefono: string; placas: string[] };

const LIMITE_RESULTADOS = 30;

/** La búsqueda de clientes: nombre (sin importar tildes ni mayúsculas), parte del teléfono o placa (HU-22, RF-22). */
function coincideBusqueda(q: string) {
  const busqueda = normalizarBusqueda(q);
  if (!busqueda) return undefined;
  return or(
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
  );
}

/**
 * Clientes que coinciden con la búsqueda, para elegir uno (Nueva cotización). Sin búsqueda, los más recientes. Trae uno
 * más del límite para saber si hay más (`hayMas`).
 */
export async function buscarClientes(q: string, desactivados = false, excepto?: number, limite = LIMITE_RESULTADOS): Promise<{ clientes: FilaCliente[]; hayMas: boolean }> {
  const filas = await db
    .select({ id: cliente.id, nombre: cliente.nombre, telefono: cliente.telefono })
    .from(cliente)
    .where(and(eq(cliente.activo, !desactivados), coincideBusqueda(q), excepto ? ne(cliente.id, excepto) : undefined))
    .orderBy(desc(cliente.updatedAt), desc(cliente.id))
    .limit(limite + 1);
  return { clientes: await conPlacas(filas.slice(0, limite)), hayMas: filas.length > limite };
}

/**
 * La lista de Clientes, de a páginas (17/11): antes mostraba los 30 más recientes y pedía buscar para ver otros. Cuenta
 * el total y trae solo la página pedida (una después de la última es la última). Los más recientes primero.
 */
export async function listarClientes(datos: { q: string; desactivados: boolean; pagina: number }): Promise<{ clientes: FilaCliente[]; total: number; pagina: number; paginas: number }> {
  const filtro = and(eq(cliente.activo, !datos.desactivados), coincideBusqueda(datos.q));
  const [{ total }] = await db.select({ total: count() }).from(cliente).where(filtro);
  const { pagina, paginas } = ajustarPagina(datos.pagina, total);
  const filas = await db
    .select({ id: cliente.id, nombre: cliente.nombre, telefono: cliente.telefono })
    .from(cliente)
    .where(filtro)
    .orderBy(desc(cliente.updatedAt), desc(cliente.id))
    .limit(POR_PAGINA)
    .offset((pagina - 1) * POR_PAGINA);
  return { clientes: await conPlacas(filas), total, pagina, paginas };
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

export type FichaVehiculo = VehiculoCliente & {
  /** Su dueño de ahora. Lo de antes de un cambio de dueño (P37) sigue a nombre del anterior, en su historial. */
  dueno: { id: number; nombre: string; telefono: string; activo: boolean };
};

/**
 * Un vehículo con su dueño de ahora, para su ficha (pedido 51), o null si no existe. Su historial (reservas, cotizaciones y
 * mantenimientos) sale de las consultas de cada módulo, por `vehiculo_id`: así incluye lo hecho con un dueño anterior.
 */
export async function fichaVehiculo(id: number): Promise<FichaVehiculo | null> {
  const [v] = await db
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
      dueno: { id: cliente.id, nombre: cliente.nombre, telefono: cliente.telefono, activo: cliente.activo },
    })
    .from(vehiculo)
    .innerJoin(tamanoVehiculo, eq(vehiculo.tamanoId, tamanoVehiculo.id))
    .innerJoin(cliente, eq(vehiculo.clienteId, cliente.id))
    .where(eq(vehiculo.id, id));
  return v ?? null;
}

/**
 * Si una búsqueda de Clientes es la placa de un vehículo activo (pedido 51): su id y su dueño, para llevar directo a su
 * ficha. La placa es única entre los activos (RF-23); se compara normalizada, como se guarda.
 */
export async function vehiculoConPlacaExacta(q: string): Promise<{ id: number; placa: string; clienteId: number; cliente: string } | null> {
  const placa = normalizarPlaca(q);
  if (!placa || placa.length < 4) return null;
  const [v] = await db
    .select({ id: vehiculo.id, placa: vehiculo.placa, clienteId: vehiculo.clienteId, cliente: cliente.nombre })
    .from(vehiculo)
    .innerJoin(cliente, eq(vehiculo.clienteId, cliente.id))
    .where(and(eq(vehiculo.placa, placa), eq(vehiculo.activo, true)));
  return v ?? null;
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
  /** Agendada, en el taller o lista: frena el cambio. Con su id y estado, para el enlace que lleva a resolverla. */
  reservaActiva: { id: number; estado: EstadoTrabajo } | null;
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
  // Las dos a la vez: la del trabajo que lo frena solo necesita el vehículo
  const [[v], [reservaActiva]] = await Promise.all([
    db
      .select({
        placa: vehiculo.placa,
        marca: vehiculo.marca,
        modelo: vehiculo.modelo,
        anio: vehiculo.anio,
        color: vehiculo.color,
        tamano: tamanoVehiculo.nombre,
        activo: vehiculo.activo,
        dueno: cliente.nombre,
        cotizacionesAbiertas: sql<number>`(${db
          .select({ n: count() })
          .from(consulta)
          .where(and(eq(consulta.vehiculoId, vehiculo.id), eq(consulta.clienteId, vehiculo.clienteId), cotizacionAbierta))})`.mapWith(Number),
        mantenimientosAbiertos: sql<number>`(${db
          .select({ n: count() })
          .from(recordatorioMantenimiento)
          .where(and(eq(recordatorioMantenimiento.vehiculoId, vehiculo.id), inArray(recordatorioMantenimiento.estado, [...ESTADOS_RECORDATORIO_ABIERTO])))})`.mapWith(Number),
      })
      .from(vehiculo)
      .innerJoin(cliente, eq(vehiculo.clienteId, cliente.id))
      .innerJoin(tamanoVehiculo, eq(vehiculo.tamanoId, tamanoVehiculo.id))
      .where(and(eq(vehiculo.id, vehiculoId), eq(vehiculo.clienteId, clienteId))),
    // Si hay varios, primero el que está en el taller (es el que hay que entregar), después la reserva más cercana
    db
      .select({ id: trabajo.id, estado: trabajo.estado })
      .from(trabajo)
      .where(and(eq(trabajo.vehiculoId, vehiculoId), inArray(trabajo.estado, [...ESTADOS_RESERVA_ACTIVA])))
      .orderBy(sql`${trabajo.estado} = 'agendado'`, asc(trabajo.fechaInicio), asc(trabajo.id))
      .limit(1),
  ]);
  if (!v) return null;
  return { ...v, reservaActiva: reservaActiva ?? null };
}

/** Las marcas activas de la lista, en orden alfabético: de ellas se elige la marca de un vehículo (pedido 52). */
export async function catalogoVehiculos(): Promise<CatalogoVehiculos> {
  const marcas = await db.select({ nombre: marcaVehiculo.nombre }).from(marcaVehiculo).where(eq(marcaVehiculo.activo, true)).orderBy(sql`lower(${marcaVehiculo.nombre})`);
  return { marcas: marcas.map((m) => m.nombre) };
}
