import "server-only";

import { asc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db";
import { archivo, cliente, cotizacion, pago, tamanoVehiculo, trabajo, trabajoLinea, usuario, variante, vehiculo } from "@/db/esquema";
import { type EstadoTrabajo, type MetodoPago, type TipoPago } from "@/db/esquema/trabajos";
import { urlsFotoPrivada, type UrlsFoto } from "@/lib/fotos";
import { partirDescripcion } from "@/modulos/cotizaciones/reglas";
import { calcularSaldo, type Saldo } from "@/modulos/pagos/reglas";

// Lecturas de la agenda (C3). Quien las llama ya pasó por exigirModulo("agenda"); los montos y pagos solo se piden
// para quien además ve "pagos" (o el dueño). Especificación: docs/08-desarrollo/etapas/C3-agenda-pagos.md.
// Aquí: la ficha de una reserva, con su historia y sus pagos.

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
  fechaInicio: string;
  fechaFin: string;
  nota: string | null;
  motivoCancelacion: string | null;
  consultaId: number | null;
  cotizacion: { numero: string; version: number } | null;
  createdAt: Date;
  agendadaPor: string;
  marca: string | null;
  modelo: string | null;
  anio: number | null;
  color: string | null;
  /** La orden (C4): cómo se recibió y el último aviso de "listo" (HU-35). */
  observacionesIngreso: string | null;
  recibidoAt: Date | null;
  recibidoPor: string | null;
  avisadoListoAt: Date | null;
  avisadoListoPor: string | null;
  /** La entrega (HU-36): quién, cuándo y, si fue con saldo, quién lo autorizó y cuánto quedaba. */
  entregadoAt: Date | null;
  entregadoPor: string | null;
  autorizoSaldo: string | null;
  saldoAlEntregar: string | null;
  tamanoId: number;
  /** El vehículo: sus planes de mantenimiento al entregar (pedido 21). */
  vehiculoId: number;
  /** Solo para quien ve pagos (RN-01 y RN-12). */
  /** Cada línea con su servicio y, aparte, su opción (para mostrarla en gris debajo, pulido 13.49). */
  montos: { lineas: { descripcion: string; servicio: string; opcion: string | null; precio: string; esAdicional: boolean }[]; descuento: string; saldo: Saldo; pagos: PagoReserva[] } | null;
};

const registrador = alias(usuario, "registrador");

const recibio = alias(usuario, "recibio");

const aviso = alias(usuario, "aviso");

const entrego = alias(usuario, "entrego");

const autorizo = alias(usuario, "autorizo");

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
      fechaInicio: trabajo.fechaInicio,
      fechaFin: trabajo.fechaFin,
      nota: trabajo.nota,
      motivoCancelacion: trabajo.motivoCancelacion,
      consultaId: trabajo.consultaId,
      numero: cotizacion.numero,
      version: cotizacion.version,
      descuento: trabajo.descuento,
      createdAt: trabajo.createdAt,
      agendadaPor: registrador.name,
      observacionesIngreso: trabajo.observacionesIngreso,
      recibidoAt: trabajo.recibidoAt,
      recibidoPor: recibio.name,
      avisadoListoAt: trabajo.avisadoListoAt,
      avisadoListoPor: aviso.name,
      marca: vehiculo.marca,
      modelo: vehiculo.modelo,
      anio: vehiculo.anio,
      color: vehiculo.color,
      tamanoId: vehiculo.tamanoId,
      vehiculoId: vehiculo.id,
      entregadoAt: trabajo.entregadoAt,
      entregadoPor: entrego.name,
      autorizoSaldo: autorizo.name,
      saldoAlEntregar: trabajo.saldoAlEntregar,
    })
    .from(trabajo)
    .innerJoin(cliente, eq(trabajo.clienteId, cliente.id))
    .innerJoin(vehiculo, eq(trabajo.vehiculoId, vehiculo.id))
    .innerJoin(tamanoVehiculo, eq(vehiculo.tamanoId, tamanoVehiculo.id))
    .innerJoin(registrador, eq(trabajo.createdBy, registrador.id))
    .leftJoin(recibio, eq(trabajo.recibidoPor, recibio.id))
    .leftJoin(aviso, eq(trabajo.avisadoListoPor, aviso.id))
    .leftJoin(entrego, eq(trabajo.entregadoPor, entrego.id))
    .leftJoin(autorizo, eq(trabajo.entregaConSaldoAutorizadaPor, autorizo.id))
    .leftJoin(cotizacion, eq(trabajo.cotizacionId, cotizacion.id))
    .where(eq(trabajo.id, id));
  if (!r) return null;
  const { numero, version, descuento, ...resto } = r;

  let montos: DetalleReserva["montos"] = null;
  if (conMontos) {
    const [lineas, filas] = await Promise.all([
      db
        .select({ descripcion: trabajoLinea.descripcion, variante: variante.nombre, precio: trabajoLinea.precio, esAdicional: trabajoLinea.esAdicional })
        .from(trabajoLinea)
        .leftJoin(variante, eq(variante.id, trabajoLinea.varianteId))
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
      lineas: lineas.map(({ variante: opcionDeLaLinea, ...l }) => ({ ...l, ...partirDescripcion(l.descripcion, opcionDeLaLinea ?? "") })),
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
