import "server-only";
import { and, asc, count, desc, eq, exists, inArray, like, ne, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { cliente, consulta, cotizacion, cotizacionLinea, negocio, servicio, sucursal, tamanoVehiculo, trabajo, usuario, variante, vehiculo } from "@/db/esquema";
import type { EstadoConsulta, MotivoPerdida } from "@/db/esquema/consultas";
import type { DatosDocumento, EstadoCotizacion } from "@/db/esquema/cotizaciones";
import { preciosVigentes } from "@/modulos/catalogo/consultas";
import { duracionEfectiva, type Monto } from "@/modulos/catalogo/reglas";
import { detalleVehiculo, escaparLike, nombreVehiculo, normalizarBusqueda } from "@/modulos/clientes/reglas";
import { obtenerParametros } from "@/modulos/configuracion/consultas";
import { descripcionLinea, fechaValidez, partirDescripcion, precioSugerido, VISTAS, type Sugerencia, type Vista } from "./reglas";

// Lecturas de las cotizaciones (pedido 23, P23-cotizacion-directa.md §5). Quien las llama ya pasó por
// exigirModulo("cotizaciones"): el dueño o el encargado con ese permiso, que también cotiza (pedido 24, RN-12).
// Cada cotización es un encabezado (la tabla `consulta`, D-12) con sus versiones (`cotizacion`).

export type OpcionServicio = {
  varianteId: number;
  servicioId: number;
  servicio: string;
  variante: string;
  descripcion: string;
  sugerencia: Sugerencia;
  /** Días estimados (la de la variante o la del servicio, RF-27): sugieren la entrega en la agenda (C3). */
  duracion: number;
};

/** Las variantes activas, en el orden del catálogo, con sus precios vigentes por tamaño. */
async function variantesConPrecios(soloVariante?: number) {
  const variantes = await db
    .select({
      varianteId: variante.id,
      servicioId: servicio.id,
      servicio: servicio.nombre,
      variante: variante.nombre,
      duracionServicio: servicio.duracionDias,
      duracionVariante: variante.duracionDias,
    })
    .from(variante)
    .innerJoin(servicio, eq(variante.servicioId, servicio.id))
    .where(and(eq(variante.activo, true), eq(servicio.activo, true), soloVariante === undefined ? undefined : eq(variante.id, soloVariante)))
    .orderBy(asc(servicio.orden), asc(servicio.id), asc(variante.orden), asc(variante.id));
  const vigentes = await preciosVigentes(variantes.map((v) => v.varianteId));
  const porVariante = new Map<number, Map<number, Monto>>();
  for (const p of vigentes) {
    if (!porVariante.has(p.varianteId)) porVariante.set(p.varianteId, new Map());
    porVariante.get(p.varianteId)!.set(p.tamanoId, p.monto);
  }
  return (tamanoId: number): OpcionServicio[] =>
    variantes.map(({ duracionServicio, duracionVariante, ...v }) => ({
      ...v,
      descripcion: descripcionLinea(v.servicio, v.variante),
      sugerencia: precioSugerido(porVariante.get(v.varianteId) ?? new Map(), tamanoId),
      duracion: duracionEfectiva({ duracionDias: duracionServicio }, { duracionDias: duracionVariante }),
    }));
}

/**
 * Los servicios activos, por variante, con el precio vigente para ese tamaño de vehículo (RF-31). Los usan la
 * cotización, la reserva directa (C3) y los adicionales de la orden (C4, con `soloVariante`: una sola).
 */
export async function opcionesDeServicio(tamanoId: number, soloVariante?: number): Promise<OpcionServicio[]> {
  return (await variantesConPrecios(soloVariante))(tamanoId);
}

/**
 * Las mismas opciones para cada tamaño, en una sola lectura: en la nueva cotización el tamaño se elige en el mismo
 * formulario (un vehículo nuevo) y el precio sugerido cambia con él.
 */
export async function opcionesPorTamano(tamanoIds: readonly number[]): Promise<Record<number, OpcionServicio[]>> {
  const para = await variantesConPrecios();
  return Object.fromEntries([...new Set(tamanoIds)].map((t) => [t, para(t)]));
}

/** Con qué arranca una cotización nueva: la validez y el adelanto de Configuración. */
export async function inicioCotizacion(): Promise<{ validaHasta: string; adelanto: string }> {
  const parametros = await obtenerParametros();
  return { validaHasta: fechaValidez(new Date(), parametros.validez_cotizacion_dias), adelanto: parametros.adelanto_sugerido.toFixed(2) };
}

type BaseVersion = {
  numero: string;
  version: number;
  /** El total guardado: el que dice su PDF. */
  total: string;
  lineas: { varianteId: number; precio: string }[];
  descuento: string;
  adelanto: string;
  esEstimado: boolean;
};

export type DatosNuevaVersion = {
  consultaId: number;
  estado: EstadoConsulta;
  cliente: string;
  telefono: string;
  placa: string;
  /** Marca y modelo, año, color: lo que se sepa. */
  detalle: (string | number)[];
  tamano: string;
  opciones: OpcionServicio[];
  /** Los servicios de la versión que se reemplaza que ya no se ofrecen (no vuelven): por qué el total arranca distinto. */
  quitados: number;
  /** Valores con los que arranca el formulario: los de la versión que se reemplaza, con la validez de hoy. */
  inicial: { validaHasta: string; adelanto: string; esEstimado: boolean; descuento: string; lineas: { varianteId: number; precio: string }[] };
  /** La versión que se reemplaza (la vigente), si `desde` lo es. */
  desde: (BaseVersion & { id: number }) | null;
  /** `desde` es una versión de esta cotización ya reemplazada: se avisa que ya hay otra. */
  desdeReemplazado: boolean;
  /** La versión vigente, para llevar a ella si `desde` no lo es. */
  vigenteId: number | null;
};

/** Todo lo que hace falta para la versión nueva de una cotización, o null si no existe o no tiene versiones. */
export async function datosNuevaVersion(consultaId: number, desdeId: number | null): Promise<DatosNuevaVersion | null> {
  const [c] = await db
    .select({
      consultaId: consulta.id,
      estado: consulta.estado,
      cliente: cliente.nombre,
      telefono: cliente.telefono,
      placa: vehiculo.placa,
      marca: vehiculo.marca,
      modelo: vehiculo.modelo,
      anio: vehiculo.anio,
      color: vehiculo.color,
      tamanoId: vehiculo.tamanoId,
      tamano: tamanoVehiculo.nombre,
    })
    .from(consulta)
    .innerJoin(cliente, eq(consulta.clienteId, cliente.id))
    .innerJoin(vehiculo, eq(consulta.vehiculoId, vehiculo.id))
    .innerJoin(tamanoVehiculo, eq(vehiculo.tamanoId, tamanoVehiculo.id))
    .where(and(eq(consulta.id, consultaId), tieneVersiones));
  if (!c) return null;

  const [opciones, inicio, [vigente], desde, [pedida]] = await Promise.all([
    opcionesDeServicio(c.tamanoId),
    inicioCotizacion(),
    db
      .select({ id: cotizacion.id })
      .from(cotizacion)
      .where(and(eq(cotizacion.consultaId, consultaId), eq(cotizacion.estado, "enviada"))),
    desdeId ? baseDeVersion(consultaId, desdeId) : null,
    desdeId
      ? db
          .select({ estado: cotizacion.estado })
          .from(cotizacion)
          .where(and(eq(cotizacion.id, desdeId), eq(cotizacion.consultaId, consultaId)))
      : [],
  ]);

  return {
    consultaId: c.consultaId,
    estado: c.estado,
    cliente: c.cliente,
    telefono: c.telefono,
    placa: c.placa,
    detalle: detalleVehiculo(c),
    tamano: c.tamano,
    opciones,
    quitados: desde ? desde.lineas.filter((l) => !opciones.some((o) => o.varianteId === l.varianteId)).length : 0,
    inicial: desde
      ? {
          validaHasta: inicio.validaHasta,
          adelanto: desde.adelanto,
          esEstimado: desde.esEstimado,
          descuento: desde.descuento,
          // Una variante que ya no se ofrece no vuelve: se cotiza de nuevo
          lineas: desde.lineas.filter((l) => opciones.some((o) => o.varianteId === l.varianteId)),
        }
      : { ...inicio, esEstimado: false, descuento: "0.00", lineas: [] },
    desde: desde && desdeId ? { ...desde, id: desdeId } : null,
    desdeReemplazado: pedida?.estado === "reemplazada",
    vigenteId: vigente?.id ?? null,
  };
}

/** Una versión vigente de esa cotización, para reemplazarla; null si no existe o ya fue reemplazada. */
async function baseDeVersion(consultaId: number, id: number): Promise<BaseVersion | null> {
  const [c] = await db
    .select({
      numero: cotizacion.numero,
      version: cotizacion.version,
      total: cotizacion.total,
      descuento: cotizacion.descuento,
      adelanto: cotizacion.adelantoSugerido,
      esEstimado: cotizacion.esEstimado,
    })
    .from(cotizacion)
    .where(and(eq(cotizacion.id, id), eq(cotizacion.consultaId, consultaId), eq(cotizacion.estado, "enviada")));
  if (!c) return null;
  const lineas = await db
    .select({ varianteId: cotizacionLinea.varianteId, precio: cotizacionLinea.precio })
    .from(cotizacionLinea)
    .where(eq(cotizacionLinea.cotizacionId, id))
    .orderBy(asc(cotizacionLinea.orden));
  return { ...c, lineas };
}

export type FilaVersion = {
  id: number;
  numero: string;
  version: number;
  estado: EstadoCotizacion;
  createdAt: Date;
  total: string;
  /** El descuento de la versión; "0.00" si no hubo. */
  descuento: string;
  validaHasta: string;
  esEstimado: boolean;
  tienePdf: boolean;
  /** Quién la cotizó (pulido 13.50: lo dice cada versión, en vez de "Registrada por" en Datos). */
  autor: string;
  /** El código del enlace para el cliente (pedido 47): `/c/<enlace>`. */
  enlace: string;
  /**
   * Lo cotizado, en su orden (pedido 26: se ve en la ficha, como en el PDF), con el servicio y su opción por separado
   * para mostrarla en gris debajo (como en la orden). Vacío en una reemplazada.
   */
  lineas: { servicio: string; opcion: string | null; precio: string }[];
};

/** Las versiones de una cotización, de la más nueva a la más vieja, con sus líneas. */
async function versionesDeCotizacion(consultaId: number): Promise<FilaVersion[]> {
  const filas = await db
    .select({
      id: cotizacion.id,
      numero: cotizacion.numero,
      version: cotizacion.version,
      estado: cotizacion.estado,
      createdAt: cotizacion.createdAt,
      total: cotizacion.total,
      descuento: cotizacion.descuento,
      validaHasta: cotizacion.validaHasta,
      esEstimado: cotizacion.esEstimado,
      pdf: cotizacion.pdfArchivoId,
      autor: usuario.name,
      enlace: cotizacion.enlace,
    })
    .from(cotizacion)
    .innerJoin(usuario, eq(cotizacion.createdBy, usuario.id))
    .where(eq(cotizacion.consultaId, consultaId))
    .orderBy(desc(cotizacion.version), desc(cotizacion.id));
  // Las líneas, en una sola consulta y solo de las que las muestran: una reemplazada ya no vale y se ve solo su total
  const conLineas = filas.filter((f) => f.estado !== "reemplazada").map((f) => f.id);
  const porVersion = new Map<number, FilaVersion["lineas"]>();
  if (conLineas.length > 0) {
    const lineas = await db
      .select({ cotizacionId: cotizacionLinea.cotizacionId, descripcion: cotizacionLinea.descripcion, opcion: variante.nombre, precio: cotizacionLinea.precio })
      .from(cotizacionLinea)
      .leftJoin(variante, eq(variante.id, cotizacionLinea.varianteId))
      .where(inArray(cotizacionLinea.cotizacionId, conLineas))
      .orderBy(asc(cotizacionLinea.orden), asc(cotizacionLinea.id));
    for (const { cotizacionId, descripcion, opcion, precio } of lineas) {
      porVersion.set(cotizacionId, [...(porVersion.get(cotizacionId) ?? []), { ...partirDescripcion(descripcion, opcion ?? ""), precio }]);
    }
  }
  return filas.map(({ pdf, ...f }) => ({ ...f, tienePdf: pdf !== null, lineas: porVersion.get(f.id) ?? [] }));
}

/**
 * Cliente, vehículo y negocio como están al cotizar: se copian en la cotización (D-4) y de ahí sale su PDF, aunque se
 * genere después o los datos cambien (RN-02). `base`: la transacción que acaba de crear al cliente o al vehículo. Las
 * lecturas van una tras otra: una transacción es una sola conexión, y pg no admite dos consultas a la vez en ella.
 */
export async function datosDocumento(consultaId: number, base: Pick<typeof db, "select"> = db): Promise<DatosDocumento> {
  const [c] = await base
    .select({
      nombre: cliente.nombre,
      telefono: cliente.telefono,
      placa: vehiculo.placa,
      marca: vehiculo.marca,
      modelo: vehiculo.modelo,
      color: vehiculo.color,
      tamano: tamanoVehiculo.nombre,
    })
    .from(consulta)
    .innerJoin(cliente, eq(consulta.clienteId, cliente.id))
    .innerJoin(vehiculo, eq(consulta.vehiculoId, vehiculo.id))
    .innerJoin(tamanoVehiculo, eq(vehiculo.tamanoId, tamanoVehiculo.id))
    .where(eq(consulta.id, consultaId));
  const [n] = await base.select({ nombre: negocio.nombre, razonSocial: negocio.razonSocial, nit: negocio.nit }).from(negocio).where(eq(negocio.id, 1));
  const [s] = await base
    .select({ whatsapp: sucursal.telefonoWhatsapp, direccion: sucursal.direccion })
    .from(sucursal)
    .where(eq(sucursal.activo, true))
    .orderBy(asc(sucursal.id))
    .limit(1);
  if (!c) throw new Error(`No existe la cotización ${consultaId}.`);
  if (!n) throw new Error("Faltan los datos del negocio: falta aplicar la migración 0003_datos_negocio.");
  return {
    cliente: { nombre: c.nombre, telefono: c.telefono },
    vehiculo: {
      placa: c.placa,
      descripcion: [nombreVehiculo(c), c.color].filter(Boolean).join(", ") || null,
      tamano: c.tamano,
    },
    negocio: { ...n, whatsapp: s?.whatsapp ?? null, direccion: s?.direccion ?? null },
  };
}

export type FilaCotizacion = {
  id: number;
  /** La versión que vale: la que se reserva. */
  cotizacionId: number;
  clienteId: number;
  cliente: string;
  placa: string;
  /** Marca y modelo ("Toyota Hilux"); vacío si no se cargaron. */
  vehiculo: string;
  /** Los servicios de la versión que vale, en su orden: "Instalación de PPF, Pulido de vidrios". */
  servicios: string;
  numero: string;
  total: string;
  estado: EstadoConsulta;
  /** Aceptada sin una reserva activa (pedido 31): se reserva después. */
  sinFecha: boolean;
  ultimoMovimientoAt: Date;
};

/** Es una cotización (D-12): un encabezado con alguna versión. Las consultas de antes sin cotizar no lo son. */
export const tieneVersiones = exists(db.select({ id: cotizacion.id }).from(cotizacion).where(eq(cotizacion.consultaId, consulta.id)));

/** Tiene una reserva que no se canceló (agendada, en el taller o entregada). */
export const conReservaActiva = sql<boolean>`${exists(
  db.select({ id: trabajo.id }).from(trabajo).where(and(eq(trabajo.consultaId, consulta.id), ne(trabajo.estado, "cancelado"))),
)}`;

/** Si la cotización tiene una reserva activa; con `base`, dentro de la transacción que bloqueó su consulta. */
export async function tieneReservaActiva(consultaId: number, base: Pick<typeof db, "select"> = db): Promise<boolean> {
  const [fila] = await base.select({ activa: conReservaActiva }).from(consulta).where(eq(consulta.id, consultaId));
  return !!fila?.activa;
}

/**
 * "Por reservar" (pedido 31): las aceptadas sin reserva que se pueden reservar ya, con el cliente y el vehículo activos y
 * el vehículo todavía de ese cliente; las que esperan hace más tiempo, primero. Para la Agenda y para Inicio. Los montos
 * los muestra solo quien los ve (RN-12): lo decide la pantalla.
 */
export async function cotizacionesPorReservar(): Promise<FilaCotizacion[]> {
  const donde = and(sinFecha, eq(cliente.activo, true), eq(vehiculo.activo, true), eq(vehiculo.clienteId, consulta.clienteId));
  return (await filas(donde).orderBy(asc(consulta.ultimoMovimientoAt), asc(consulta.id))).map(aFila);
}

/**
 * Abierta: una cotización (con versiones) pendiente, o aceptada sin reserva activa. Las que cierra un cambio de dueño
 * (pedido 37): una aceptada con su trabajo, aunque ya se haya entregado, es historia y no se toca.
 */
export const cotizacionAbierta = sql`(${tieneVersiones} and (${consulta.estado} = 'cotizado' or (${consulta.estado} = 'confirmado' and not ${conReservaActiva})))`;

/** Aceptada sin reserva activa (pedido 31, P31-flujo-de-un-trabajo.md §4). */
const sinFecha = sql<boolean>`(${consulta.estado} = 'confirmado' and not ${conReservaActiva})`;

/** La versión que vale de cada cotización: la vigente, o la aceptada. Las reemplazadas quedan solo en su ficha. */
const versionActual = and(eq(cotizacion.consultaId, consulta.id), ne(cotizacion.estado, "reemplazada"));

const columnasFila = {
  id: consulta.id,
  cotizacionId: cotizacion.id,
  clienteId: consulta.clienteId,
  cliente: cliente.nombre,
  placa: vehiculo.placa,
  marca: vehiculo.marca,
  modelo: vehiculo.modelo,
  servicios: sql<string>`coalesce((select string_agg(${cotizacionLinea.descripcion}, ', ' order by ${cotizacionLinea.orden}) from ${cotizacionLinea} where ${cotizacionLinea.cotizacionId} = ${cotizacion.id}), '')`,
  numero: cotizacion.numero,
  total: cotizacion.total,
  estado: consulta.estado,
  sinFecha,
  ultimoMovimientoAt: consulta.ultimoMovimientoAt,
};

/** La fila de la consulta, con el vehículo nombrado como en el resto del panel. */
const aFila = ({ marca, modelo, ...f }: { marca: string | null; modelo: string | null } & Omit<FilaCotizacion, "vehiculo">): FilaCotizacion => ({
  ...f,
  vehiculo: nombreVehiculo({ marca, modelo }),
});

function filas(donde: SQL | undefined) {
  return db
    .select(columnasFila)
    .from(consulta)
    .innerJoin(cotizacion, versionActual)
    .innerJoin(cliente, eq(consulta.clienteId, cliente.id))
    .innerJoin(vehiculo, eq(consulta.vehiculoId, vehiculo.id))
    .where(donde);
}

/** Cuántas filas muestran Aceptadas y Rechazadas sin buscar: son historia, y crecen. */
export const LIMITE_HISTORIA = 50;

/** Lo buscado: por cliente, teléfono, placa o número (de la versión que vale). */
function coincide(q: string): SQL | undefined {
  const busqueda = normalizarBusqueda(q);
  if (!busqueda) return undefined;
  return or(
    sql`unaccent(lower(${cliente.nombre})) like unaccent(lower(${`%${escaparLike(busqueda.texto)}%`}))`,
    busqueda.digitos ? like(cliente.telefono, `%${escaparLike(busqueda.digitos)}%`) : undefined,
    busqueda.placa ? like(vehiculo.placa, `%${escaparLike(busqueda.placa)}%`) : undefined,
    like(cotizacion.numero, `%${escaparLike(busqueda.texto)}%`),
  );
}

/**
 * Las cotizaciones de una pestaña. Las pendientes, las que llevan más tiempo sin respuesta primero (RF-35); las
 * aceptadas y rechazadas, las más nuevas primero y hasta LIMITE_HISTORIA (buscando, se encuentran todas).
 */
export async function listarCotizaciones(vista: Vista, q: string): Promise<{ cotizaciones: FilaCotizacion[]; hayMas: boolean }> {
  const donde = and(eq(consulta.estado, VISTAS[vista]), coincide(q));
  if (vista === "pendientes") return { cotizaciones: (await filas(donde).orderBy(asc(consulta.ultimoMovimientoAt), asc(consulta.id))).map(aFila), hayMas: false };
  const encontradas = (
    await filas(donde)
      // En Aceptadas, primero las que esperan fecha (pedido 31): no quedan detrás de la historia
      .orderBy(...(vista === "aceptadas" ? [desc(sinFecha)] : []), desc(consulta.ultimoMovimientoAt), desc(consulta.id))
      .limit(LIMITE_HISTORIA + 1)
  ).map(aFila);
  return { cotizaciones: encontradas.slice(0, LIMITE_HISTORIA), hayMas: encontradas.length > LIMITE_HISTORIA };
}

/**
 * Cuántas hay en cada pestaña, con la misma búsqueda: así se ve en qué pestaña está lo buscado. Solo las que tienen
 * versiones (la unión con la versión que vale): las consultas de antes sin cotizar no cuentan.
 */
export async function contarPorVista(q: string): Promise<Record<Vista, number>> {
  const porEstado = await db
    .select({ estado: consulta.estado, total: count() })
    .from(consulta)
    .innerJoin(cotizacion, versionActual)
    .innerJoin(cliente, eq(consulta.clienteId, cliente.id))
    .innerJoin(vehiculo, eq(consulta.vehiculoId, vehiculo.id))
    .where(coincide(q))
    .groupBy(consulta.estado);
  const de = (estado: EstadoConsulta) => porEstado.find((f) => f.estado === estado)?.total ?? 0;
  return { pendientes: de(VISTAS.pendientes), aceptadas: de(VISTAS.aceptadas), rechazadas: de(VISTAS.rechazadas) };
}

/** Las cotizaciones de un cliente, de la más nueva a la más vieja (su ficha). */
export async function cotizacionesDelCliente(clienteId: number): Promise<FilaCotizacion[]> {
  return (await filas(eq(consulta.clienteId, clienteId)).orderBy(desc(consulta.createdAt), desc(consulta.id))).map(aFila);
}

export type DetalleCotizacion = {
  id: number;
  numero: string;
  clienteId: number;
  cliente: string;
  telefono: string;
  placa: string;
  /** Marca y modelo, año y color: lo que se sepa (DatosVehiculo). */
  detalle: (string | number)[];
  tamano: string;
  estado: EstadoConsulta;
  /** Aceptada sin una reserva activa (pedido 31). */
  sinFecha: boolean;
  motivoPerdida: MotivoPerdida | null;
  detallePerdida: string | null;
  /** Para nombrar el vehículo en el mensaje de WhatsApp (pedido 47). */
  marca: string | null;
  modelo: string | null;
  versiones: FilaVersion[];
};

/** Una cotización con sus versiones, o null si no existe o no tiene ninguna (una consulta de antes sin cotizar). */
export async function obtenerCotizacion(id: number): Promise<DetalleCotizacion | null> {
  const [[c], versiones] = await Promise.all([
    db
      .select({
        id: consulta.id,
        clienteId: consulta.clienteId,
        cliente: cliente.nombre,
        telefono: cliente.telefono,
        placa: vehiculo.placa,
        marca: vehiculo.marca,
        modelo: vehiculo.modelo,
        anio: vehiculo.anio,
        color: vehiculo.color,
        tamano: tamanoVehiculo.nombre,
        estado: consulta.estado,
        sinFecha,
        motivoPerdida: consulta.motivoPerdida,
        detallePerdida: consulta.detallePerdida,
      })
      .from(consulta)
      .innerJoin(cliente, eq(consulta.clienteId, cliente.id))
      .innerJoin(vehiculo, eq(consulta.vehiculoId, vehiculo.id))
      .innerJoin(tamanoVehiculo, eq(vehiculo.tamanoId, tamanoVehiculo.id))
      .where(eq(consulta.id, id)),
    versionesDeCotizacion(id),
  ]);
  if (!c || versiones.length === 0) return null;
  const { marca, modelo, anio, color, ...datos } = c;
  return {
    ...datos,
    marca,
    modelo,
    numero: versiones[0].numero,
    detalle: detalleVehiculo({ marca, modelo, anio, color }),
    versiones,
  };
}
