import "server-only";
import { and, asc, desc, eq, gte, inArray, isNull, lte, ne, notInArray, or } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db";
import {
  archivo,
  cliente,
  consulta,
  cotizacion,
  cotizacionLinea,
  espacioTaller,
  pago,
  servicio,
  tamanoVehiculo,
  trabajo,
  trabajoLinea,
  usuario,
  variante,
  vehiculo,
} from "@/db/esquema";
import { ESTADOS_TRABAJO, type EstadoTrabajo, type MetodoPago, type TipoPago } from "@/db/esquema/trabajos";
import { fechaEnBolivia } from "@/lib/fechas";
import { urlsFotoPrivada, type UrlsFoto } from "@/lib/fotos";
import { duracionEfectiva } from "@/modulos/catalogo/reglas";
import { sucursalPrincipal } from "@/modulos/configuracion/consultas";
import { opcionesDeServicio, type OpcionServicio } from "@/modulos/cotizaciones/consultas";
import { calcularSaldo, type Saldo } from "@/modulos/pagos/reglas";
import { ocupaEspacio } from "./reglas";

// Lecturas de la agenda (C3). Quien las llama ya pasó por exigirModulo("agenda"); los montos y pagos solo se piden
// para quien además ve "pagos" (o el dueño). Especificación: docs/08-desarrollo/etapas/C3-agenda-pagos.md.

/** Estados que no ocupan un espacio en la agenda (como la restricción `trabajo_sin_cruces`): una sola regla. */
const NO_OCUPAN = ESTADOS_TRABAJO.filter((e) => !ocupaEspacio(e));

export type EspacioDisponible = { id: number; nombre: string; libre: boolean };

/**
 * Los espacios activos de la sucursal y si están libres en esas fechas (RN-06). `excepto`: la reserva que se
 * reprograma, que no choca consigo misma.
 */
export async function espaciosEnFechas(fechaInicio: string, fechaFin: string, excepto?: number): Promise<EspacioDisponible[]> {
  const s = await sucursalPrincipal();
  const [espacios, ocupados] = await Promise.all([
    db
      .select({ id: espacioTaller.id, nombre: espacioTaller.nombre })
      .from(espacioTaller)
      .where(and(eq(espacioTaller.sucursalId, s.id), eq(espacioTaller.activo, true)))
      .orderBy(asc(espacioTaller.orden), asc(espacioTaller.id)),
    db
      .selectDistinct({ espacioId: trabajo.espacioId })
      .from(trabajo)
      .where(
        and(
          notInArray(trabajo.estado, NO_OCUPAN),
          lte(trabajo.fechaInicio, fechaFin),
          gte(trabajo.fechaFin, fechaInicio),
          excepto ? ne(trabajo.id, excepto) : undefined,
        ),
      ),
  ]);
  const ocupadoSet = new Set(ocupados.map((o) => o.espacioId));
  return espacios.map((e) => ({ ...e, libre: !ocupadoSet.has(e.id) }));
}

/** Técnicos activos, para asignar la reserva (opcional). */
export async function tecnicosActivos(): Promise<{ id: number; nombre: string }[]> {
  return db
    .select({ id: usuario.id, nombre: usuario.name })
    .from(usuario)
    .where(and(eq(usuario.role, "tecnico"), or(isNull(usuario.banned), eq(usuario.banned, false))))
    .orderBy(asc(usuario.name));
}

type LineaReserva = { varianteId: number; descripcion: string; precio: string; duracion: number };

export type DatosDeCotizacion = {
  cotizacionId: number;
  numero: string;
  version: number;
  consultaId: number;
  /** La consulta todavía está "cotizado" y la cotización "enviada": se puede agendar. */
  agendable: boolean;
  /** El cliente y el vehículo siguen activos. */
  activos: boolean;
  cliente: { id: number; nombre: string };
  vehiculo: { id: number; placa: string; tamano: string };
  lineas: LineaReserva[];
  descuento: string;
  saldo: Saldo;
};

/** Lo que hace falta para agendar desde una cotización, o null si no existe. */
export async function datosDeCotizacion(cotizacionId: number): Promise<DatosDeCotizacion | null> {
  const [c] = await db
    .select({
      cotizacionId: cotizacion.id,
      numero: cotizacion.numero,
      version: cotizacion.version,
      estado: cotizacion.estado,
      descuento: cotizacion.descuento,
      consultaId: consulta.id,
      estadoConsulta: consulta.estado,
      clienteId: cliente.id,
      cliente: cliente.nombre,
      clienteActivo: cliente.activo,
      vehiculoActivo: vehiculo.activo,
      vehiculoId: vehiculo.id,
      placa: vehiculo.placa,
      tamano: tamanoVehiculo.nombre,
    })
    .from(cotizacion)
    .innerJoin(consulta, eq(cotizacion.consultaId, consulta.id))
    .innerJoin(cliente, eq(consulta.clienteId, cliente.id))
    .innerJoin(vehiculo, eq(consulta.vehiculoId, vehiculo.id))
    .innerJoin(tamanoVehiculo, eq(vehiculo.tamanoId, tamanoVehiculo.id))
    .where(eq(cotizacion.id, cotizacionId));
  if (!c) return null;
  const lineas = await db
    .select({
      varianteId: cotizacionLinea.varianteId,
      descripcion: cotizacionLinea.descripcion,
      precio: cotizacionLinea.precio,
      duracionServicio: servicio.duracionDias,
      duracionVariante: variante.duracionDias,
    })
    .from(cotizacionLinea)
    .innerJoin(variante, eq(cotizacionLinea.varianteId, variante.id))
    .innerJoin(servicio, eq(variante.servicioId, servicio.id))
    .where(eq(cotizacionLinea.cotizacionId, cotizacionId))
    .orderBy(asc(cotizacionLinea.orden));
  return {
    cotizacionId: c.cotizacionId,
    numero: c.numero,
    version: c.version,
    consultaId: c.consultaId,
    agendable: c.estado === "enviada" && c.estadoConsulta === "cotizado",
    activos: c.clienteActivo && c.vehiculoActivo,
    cliente: { id: c.clienteId, nombre: c.cliente },
    vehiculo: { id: c.vehiculoId, placa: c.placa, tamano: c.tamano },
    lineas: lineas.map((l) => ({
      varianteId: l.varianteId,
      descripcion: l.descripcion,
      precio: l.precio,
      duracion: duracionEfectiva({ duracionDias: l.duracionServicio }, { duracionDias: l.duracionVariante }),
    })),
    descuento: c.descuento,
    saldo: calcularSaldo(
      lineas.map((l) => l.precio),
      c.descuento,
      [],
    ),
  };
}

export type DatosDirecta = {
  cliente: { id: number; nombre: string };
  vehiculos: { id: number; placa: string; tamanoId: number; tamano: string }[];
  /** El vehículo elegido y los servicios con el precio de su tamaño. */
  vehiculo: { id: number; placa: string; tamano: string } | null;
  opciones: OpcionServicio[];
};

/** Lo que hace falta para una reserva directa: el cliente activo, sus vehículos y, elegido uno, los servicios. */
export async function datosDirecta(clienteId: number, vehiculoId: number | null): Promise<DatosDirecta | null> {
  const [c] = await db.select({ id: cliente.id, nombre: cliente.nombre }).from(cliente).where(and(eq(cliente.id, clienteId), eq(cliente.activo, true)));
  if (!c) return null;
  const vehiculos = await db
    .select({ id: vehiculo.id, placa: vehiculo.placa, tamanoId: vehiculo.tamanoId, tamano: tamanoVehiculo.nombre })
    .from(vehiculo)
    .innerJoin(tamanoVehiculo, eq(vehiculo.tamanoId, tamanoVehiculo.id))
    .where(and(eq(vehiculo.clienteId, clienteId), eq(vehiculo.activo, true)))
    .orderBy(asc(vehiculo.id));
  // Con un solo vehículo, no hace falta elegirlo
  const elegido = vehiculos.find((v) => v.id === vehiculoId) ?? (vehiculos.length === 1 ? vehiculos[0] : undefined);
  return {
    cliente: c,
    vehiculos,
    vehiculo: elegido ? { id: elegido.id, placa: elegido.placa, tamano: elegido.tamano } : null,
    opciones: elegido ? await opcionesDeServicio(elegido.tamanoId) : [],
  };
}

type PagoReserva = {
  id: number;
  monto: string;
  metodo: MetodoPago;
  tipo: TipoPago;
  fecha: string;
  anulado: boolean;
  motivoAnulacion: string | null;
  registradoPor: string;
  /** La foto del comprobante (bucket privado), con enlaces firmados y temporales. */
  comprobante: UrlsFoto | null;
};

export type DetalleReserva = {
  id: number;
  estado: EstadoTrabajo;
  clienteId: number;
  cliente: string;
  telefono: string;
  placa: string;
  tamano: string;
  espacio: string;
  espacioId: number;
  fechaInicio: string;
  fechaFin: string;
  horaIngreso: string | null;
  tecnico: string | null;
  nota: string | null;
  motivoCancelacion: string | null;
  consultaId: number | null;
  cotizacion: { numero: string; version: number } | null;
  createdAt: Date;
  agendadaPor: string;
  /** Solo para quien ve pagos (RN-01 y RN-12: el técnico nunca). */
  montos: { lineas: { descripcion: string; precio: string }[]; descuento: string; saldo: Saldo; pagos: PagoReserva[] } | null;
};

const tecnico = alias(usuario, "tecnico");
const registrador = alias(usuario, "registrador");

/** Una reserva, con sus montos y pagos si quien la mira los puede ver; null si no existe. */
export async function obtenerReserva(id: number, conMontos: boolean): Promise<DetalleReserva | null> {
  const [r] = await db
    .select({
      id: trabajo.id,
      estado: trabajo.estado,
      clienteId: cliente.id,
      cliente: cliente.nombre,
      telefono: cliente.telefono,
      placa: vehiculo.placa,
      tamano: tamanoVehiculo.nombre,
      espacio: espacioTaller.nombre,
      espacioId: trabajo.espacioId,
      fechaInicio: trabajo.fechaInicio,
      fechaFin: trabajo.fechaFin,
      horaIngreso: trabajo.horaIngreso,
      tecnico: tecnico.name,
      nota: trabajo.nota,
      motivoCancelacion: trabajo.motivoCancelacion,
      consultaId: trabajo.consultaId,
      numero: cotizacion.numero,
      version: cotizacion.version,
      descuento: trabajo.descuento,
      createdAt: trabajo.createdAt,
      agendadaPor: registrador.name,
    })
    .from(trabajo)
    .innerJoin(cliente, eq(trabajo.clienteId, cliente.id))
    .innerJoin(vehiculo, eq(trabajo.vehiculoId, vehiculo.id))
    .innerJoin(tamanoVehiculo, eq(vehiculo.tamanoId, tamanoVehiculo.id))
    .innerJoin(espacioTaller, eq(trabajo.espacioId, espacioTaller.id))
    .innerJoin(registrador, eq(trabajo.createdBy, registrador.id))
    .leftJoin(tecnico, eq(trabajo.tecnicoId, tecnico.id))
    .leftJoin(cotizacion, eq(trabajo.cotizacionId, cotizacion.id))
    .where(eq(trabajo.id, id));
  if (!r) return null;
  const { numero, version, descuento, ...resto } = r;

  let montos: DetalleReserva["montos"] = null;
  if (conMontos) {
    const [lineas, filas] = await Promise.all([
      db
        .select({ descripcion: trabajoLinea.descripcion, precio: trabajoLinea.precio })
        .from(trabajoLinea)
        .where(eq(trabajoLinea.trabajoId, id))
        .orderBy(asc(trabajoLinea.orden)),
      db
        .select({
          id: pago.id,
          monto: pago.monto,
          metodo: pago.metodo,
          tipo: pago.tipo,
          fecha: pago.fecha,
          anulado: pago.anulado,
          motivoAnulacion: pago.motivoAnulacion,
          registradoPor: registrador.name,
          clave: archivo.clave,
          miniaturaClave: archivo.miniaturaClave,
          ancho: archivo.ancho,
          alto: archivo.alto,
        })
        .from(pago)
        .innerJoin(registrador, eq(pago.createdBy, registrador.id))
        .leftJoin(archivo, eq(pago.comprobanteArchivoId, archivo.id))
        .where(eq(pago.trabajoId, id))
        .orderBy(asc(pago.fecha), asc(pago.id)),
    ]);
    // Quien llega aquí ve pagos: recién ahora se firman los enlaces de los comprobantes
    const pagos = await Promise.all(
      filas.map(async ({ clave, miniaturaClave, ancho, alto, ...p }) => ({
        ...p,
        comprobante: clave ? await urlsFotoPrivada({ clave, miniaturaClave, ancho, alto }) : null,
      })),
    );
    montos = {
      lineas,
      descuento,
      saldo: calcularSaldo(
        lineas.map((l) => l.precio),
        descuento,
        pagos,
      ),
      pagos,
    };
  }
  return { ...resto, cotizacion: numero && version ? { numero, version } : null, montos };
}

export type ReservaCorta = { id: number; estado: EstadoTrabajo; fechaInicio: string; fechaFin: string; espacio: string; placa: string; cliente: string };

const columnasCortas = {
  id: trabajo.id,
  estado: trabajo.estado,
  fechaInicio: trabajo.fechaInicio,
  fechaFin: trabajo.fechaFin,
  espacio: espacioTaller.nombre,
  placa: vehiculo.placa,
  cliente: cliente.nombre,
};

/** Las reservas que salieron de una consulta (para mostrarlas en ella), la más nueva primero. */
export async function reservasDeConsulta(consultaId: number): Promise<ReservaCorta[]> {
  return db
    .select(columnasCortas)
    .from(trabajo)
    .innerJoin(espacioTaller, eq(trabajo.espacioId, espacioTaller.id))
    .innerJoin(vehiculo, eq(trabajo.vehiculoId, vehiculo.id))
    .innerJoin(cliente, eq(trabajo.clienteId, cliente.id))
    .where(eq(trabajo.consultaId, consultaId))
    .orderBy(desc(trabajo.createdAt));
}

export type ReservaDelCliente = ReservaCorta & { saldo: Saldo | null };

/**
 * Las reservas de un cliente para su ficha (HU-32): primero las que vienen (la más cercana arriba), después las pasadas
 * (la más reciente arriba). Con el saldo de cada una solo si quien mira ve pagos (RN-12); las cuentas, las mismas de la
 * reserva (`calcularSaldo`).
 */
export async function reservasDelCliente(clienteId: number, conMontos: boolean): Promise<ReservaDelCliente[]> {
  const hoy = fechaEnBolivia();
  const reservas = await db
    .select({ ...columnasCortas, descuento: trabajo.descuento })
    .from(trabajo)
    .innerJoin(espacioTaller, eq(trabajo.espacioId, espacioTaller.id))
    .innerJoin(vehiculo, eq(trabajo.vehiculoId, vehiculo.id))
    .innerJoin(cliente, eq(trabajo.clienteId, cliente.id))
    .where(eq(trabajo.clienteId, clienteId))
    .orderBy(asc(trabajo.fechaInicio), asc(trabajo.id));
  const proximas = reservas.filter((r) => r.fechaFin >= hoy);
  const pasadas = reservas.filter((r) => r.fechaFin < hoy).reverse();
  const ids = reservas.map((r) => r.id);
  const [lineas, pagos] =
    conMontos && ids.length > 0
      ? await Promise.all([
          db.select({ trabajoId: trabajoLinea.trabajoId, precio: trabajoLinea.precio }).from(trabajoLinea).where(inArray(trabajoLinea.trabajoId, ids)),
          db.select({ trabajoId: pago.trabajoId, monto: pago.monto, anulado: pago.anulado }).from(pago).where(inArray(pago.trabajoId, ids)),
        ])
      : [[], []];
  const precios = new Map<number, string[]>();
  for (const l of lineas) precios.set(l.trabajoId, [...(precios.get(l.trabajoId) ?? []), l.precio]);
  const pagosPor = new Map<number, { monto: string; anulado: boolean }[]>();
  for (const p of pagos) pagosPor.set(p.trabajoId, [...(pagosPor.get(p.trabajoId) ?? []), p]);
  return [...proximas, ...pasadas].map(({ descuento, ...r }) => ({
    ...r,
    saldo: conMontos ? calcularSaldo(precios.get(r.id) ?? [], descuento, pagosPor.get(r.id) ?? []) : null,
  }));
}

export type ReservaTablero = {
  id: number;
  espacioId: number;
  inicio: string;
  fin: string;
  estado: EstadoTrabajo;
  placa: string;
  cliente: string;
  tecnico: string | null;
  /** El primer servicio y cuántos más lleva ("Pulido y nano cerámico — 5 años", 1). */
  servicio: string | null;
  masServicios: number;
};

export type SemanaDeAgenda = {
  /** Los activos y, si tienen reservas esa semana, también los desactivados (`activo: false`): no se pierden de vista. */
  espacios: { id: number; nombre: string; activo: boolean }[];
  reservas: ReservaTablero[];
  /** Días de la semana (1 = lunes … 7 = domingo) que el taller no atiende, según el horario de Configuración. */
  diasCerrados: number[];
};

/** La semana del tablero (HU-29): los espacios y las reservas que ocupan alguno de esos días. */
export async function semanaDeAgenda(lunes: string, domingo: string): Promise<SemanaDeAgenda> {
  const s = await sucursalPrincipal();
  const enLaSemana = and(eq(trabajo.sucursalId, s.id), notInArray(trabajo.estado, NO_OCUPAN), lte(trabajo.fechaInicio, domingo), gte(trabajo.fechaFin, lunes));
  const [espacios, reservas, lineas] = await Promise.all([
    db
      .select({ id: espacioTaller.id, nombre: espacioTaller.nombre, activo: espacioTaller.activo })
      .from(espacioTaller)
      .where(eq(espacioTaller.sucursalId, s.id))
      .orderBy(asc(espacioTaller.orden), asc(espacioTaller.id)),
    db
      .select({
        id: trabajo.id,
        espacioId: trabajo.espacioId,
        inicio: trabajo.fechaInicio,
        fin: trabajo.fechaFin,
        estado: trabajo.estado,
        placa: vehiculo.placa,
        cliente: cliente.nombre,
        tecnico: tecnico.name,
      })
      .from(trabajo)
      .innerJoin(vehiculo, eq(trabajo.vehiculoId, vehiculo.id))
      .innerJoin(cliente, eq(trabajo.clienteId, cliente.id))
      .leftJoin(tecnico, eq(trabajo.tecnicoId, tecnico.id))
      .where(enLaSemana)
      .orderBy(asc(trabajo.fechaInicio)),
    db
      .select({ trabajoId: trabajoLinea.trabajoId, descripcion: trabajoLinea.descripcion })
      .from(trabajoLinea)
      .innerJoin(trabajo, eq(trabajoLinea.trabajoId, trabajo.id))
      .where(enLaSemana)
      .orderBy(asc(trabajoLinea.orden)),
  ]);
  const porTrabajo = new Map<number, string[]>();
  for (const l of lineas) porTrabajo.set(l.trabajoId, [...(porTrabajo.get(l.trabajoId) ?? []), l.descripcion]);
  const conReservas = new Set(reservas.map((r) => r.espacioId));
  return {
    espacios: espacios.filter((e) => e.activo || conReservas.has(e.id)),
    reservas: reservas.map((r) => {
      const suyas = porTrabajo.get(r.id) ?? [];
      return { ...r, servicio: suyas[0] ?? null, masServicios: Math.max(0, suyas.length - 1) };
    }),
    diasCerrados: s.horarios.filter((d) => d.turnos.length === 0).map((d) => d.dia),
  };
}
