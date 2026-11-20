import "server-only";

import { and, asc, desc, eq, not, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { cliente, consulta, cotizacion, cotizacionLinea, servicio, tamanoVehiculo, variante, vehiculo } from "@/db/esquema";
import { duracionEfectiva } from "@/modulos/catalogo/reglas";
import { detalleVehiculo } from "@/modulos/clientes/reglas";
import { conReservaActiva } from "@/modulos/cotizaciones/consultas/comun";
import { opcionesDeServicio, type OpcionServicio } from "@/modulos/cotizaciones/consultas/servicios";
import { sePuedeReservar } from "@/modulos/cotizaciones/reglas";
import { calcularSaldo, type Saldo } from "@/modulos/pagos/reglas";

// Lecturas de la agenda (C3). Quien las llama ya pasó por exigirModulo("agenda"); los montos y pagos solo se piden
// para quien además ve "pagos" (o el dueño). Especificación: docs/08-desarrollo/etapas/C3-agenda-pagos.md.
// Aquí: lo que necesita una reserva nueva, desde una cotización o directa (sin cotización).

type LineaReserva = { varianteId: number; descripcion: string; precio: string; duracion: number };

export type DatosDeCotizacion = {
  cotizacionId: number;
  numero: string;
  version: number;
  consultaId: number;
  /** Pendiente, o aceptada sin fecha (pedido 31): se puede reservar (`sePuedeReservar`). */
  agendable: boolean;
  /** Ya aceptada (sin fecha, si es agendable): los pasos del trabajo la muestran en "Aceptada" y no en "Cotizada". */
  aceptada: boolean;
  /** El cliente y el vehículo siguen activos. */
  activos: boolean;
  cliente: { id: number; nombre: string };
  vehiculo: VehiculoReserva;
  lineas: LineaReserva[];
  descuento: string;
  saldo: Saldo;
};

/** El vehículo de una reserva, como lo muestra el panel (DatosVehiculo): la placa, lo que se sepa y el tamaño. */
export type VehiculoReserva = { id: number; placa: string; tamano: string; detalle: (string | number)[] };

const columnasVehiculo = { marca: vehiculo.marca, modelo: vehiculo.modelo, anio: vehiculo.anio, color: vehiculo.color };

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
      conReserva: conReservaActiva,
      clienteId: cliente.id,
      cliente: cliente.nombre,
      clienteActivo: cliente.activo,
      vehiculoCliente: vehiculo.clienteId,
      vehiculoActivo: vehiculo.activo,
      vehiculoId: vehiculo.id,
      placa: vehiculo.placa,
      tamano: tamanoVehiculo.nombre,
      ...columnasVehiculo,
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
    // El vehículo tiene que seguir siendo de ese cliente: si cambió de dueño (pedido 37), su cotización ya no se reserva
    agendable: sePuedeReservar({ version: c.estado, encabezado: c.estadoConsulta, conReserva: c.conReserva }) && c.vehiculoCliente === c.clienteId,
    aceptada: c.estadoConsulta === "confirmado",
    activos: c.clienteActivo && c.vehiculoActivo,
    cliente: { id: c.clienteId, nombre: c.cliente },
    vehiculo: { id: c.vehiculoId, placa: c.placa, tamano: c.tamano, detalle: detalleVehiculo(c) },
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
  vehiculos: (VehiculoReserva & { tamanoId: number })[];
  /** El vehículo elegido y los servicios con el precio de su tamaño. */
  vehiculo: VehiculoReserva | null;
  opciones: OpcionServicio[];
};

/** Una cotización que se puede reservar, para ofrecerla en Nueva reserva (pedido 31). */
export type CotizacionParaReservar = {
  /** La versión que vale (la que se reserva). */
  cotizacionId: number;
  numero: string;
  version: number;
  /** Los servicios, en su orden: "Instalación de PPF, Pulido de vidrios". */
  servicios: string;
  total: string;
  /** Aceptada sin fecha; si no, pendiente. */
  aceptada: boolean;
};

/**
 * Las cotizaciones de un cliente y su vehículo que se pueden reservar (`sePuedeReservar`): la pendiente o la aceptada
 * sin fecha. Así Nueva reserva no vuelve a pedir los servicios y los precios que ya se cotizaron (RN-02). La más nueva
 * primero. El total lo muestra solo quien ve montos (RN-12): lo decide la pantalla. La condición es la de
 * `sePuedeReservar`, escrita en SQL para filtrar en la base: si una cambia, cambia la otra.
 */
export async function cotizacionesParaReservar(clienteId: number, vehiculoId: number): Promise<CotizacionParaReservar[]> {
  const filas = await db
    .select({
      cotizacionId: cotizacion.id,
      numero: cotizacion.numero,
      version: cotizacion.version,
      total: cotizacion.total,
      estado: consulta.estado,
      servicios: sql<string>`coalesce((select string_agg(${cotizacionLinea.descripcion}, ', ' order by ${cotizacionLinea.orden}) from ${cotizacionLinea} where ${cotizacionLinea.cotizacionId} = ${cotizacion.id}), '')`,
    })
    .from(cotizacion)
    .innerJoin(consulta, eq(cotizacion.consultaId, consulta.id))
    .where(
      and(
        eq(consulta.clienteId, clienteId),
        eq(consulta.vehiculoId, vehiculoId),
        or(
          and(eq(consulta.estado, "cotizado"), eq(cotizacion.estado, "enviada")),
          and(eq(consulta.estado, "confirmado"), eq(cotizacion.estado, "aceptada"), not(conReservaActiva)),
        ),
      ),
    )
    .orderBy(desc(consulta.createdAt), desc(consulta.id));
  return filas.map(({ estado, ...f }) => ({ ...f, aceptada: estado === "confirmado" }));
}

/** Lo que hace falta para una reserva directa: el cliente activo, sus vehículos y, elegido uno, los servicios. */
export async function datosDirecta(clienteId: number, vehiculoId: number | null): Promise<DatosDirecta | null> {
  const [c] = await db.select({ id: cliente.id, nombre: cliente.nombre }).from(cliente).where(and(eq(cliente.id, clienteId), eq(cliente.activo, true)));
  if (!c) return null;
  const vehiculos = (
    await db
      .select({ id: vehiculo.id, placa: vehiculo.placa, tamanoId: vehiculo.tamanoId, tamano: tamanoVehiculo.nombre, ...columnasVehiculo })
      .from(vehiculo)
      .innerJoin(tamanoVehiculo, eq(vehiculo.tamanoId, tamanoVehiculo.id))
      .where(and(eq(vehiculo.clienteId, clienteId), eq(vehiculo.activo, true)))
      .orderBy(asc(vehiculo.id))
  ).map((v) => ({ id: v.id, placa: v.placa, tamanoId: v.tamanoId, tamano: v.tamano, detalle: detalleVehiculo(v) }));
  // El vehículo, siempre elegido (20/11): con uno solo también se ve el paso, para saber con qué auto se reserva
  const elegido = vehiculos.find((v) => v.id === vehiculoId);
  return {
    cliente: c,
    vehiculos,
    vehiculo: elegido ?? null,
    opciones: elegido ? await opcionesDeServicio(elegido.tamanoId) : [],
  };
}
