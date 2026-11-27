import type { EstadoTrabajo } from "@/db/esquema/trabajos";
import type { EstadoRecordatorio } from "@/db/esquema/mantenimientos";
import type { EstadoConsulta } from "@/db/esquema/consultas";
import type { TipoAlerta } from "@/componentes/panel/alerta";
import { fechaConMes } from "@/lib/fechas";
import { NOMBRE_ESTADO_TRABAJO } from "@/modulos/agenda/reglas";
import { diasDesde, sinRespuesta } from "@/modulos/cotizaciones/reglas";
import { ESTADOS_RECORDATORIO_ABIERTO } from "@/modulos/mantenimientos/reglas";
import { esOrden } from "@/modulos/ordenes/reglas";

// Lo que dice cada vehículo en la ficha del cliente (26/11, recorrido visual): la ficha del cliente es la persona y sus
// autos, y la historia y los mantenimientos viven en la ficha de cada vehículo. Para no tener que abrirla para lo de
// todos los días, cada vehículo dice su último trabajo, su próximo mantenimiento y lo que pide atención. Regla pura:
// la prueba tests/unit/resumen-vehiculos.test.ts.

export type ResumenVehiculo = { lineas: string[]; aviso: { texto: string; tipo: TipoAlerta } | null };

type Entrada = {
  /** Sus reservas y órdenes (null: quien mira no ve la Agenda). */
  reservas: { placa: string; estado: EstadoTrabajo; fechaInicio: string }[] | null;
  /** Sus mantenimientos (null: quien mira no ve Mantenimientos). */
  mantenimientos: { placa: string; estado: EstadoRecordatorio; fechaProgramada: string }[] | null;
  /** Sus cotizaciones (null: quien mira no ve Cotizaciones). */
  cotizaciones: { placa: string | null; estado: EstadoConsulta; sinFecha: boolean; ultimoMovimientoAt: Date }[] | null;
  /** Días sin respuesta para avisar (Configuración → Parámetros). */
  umbral: number;
  /** Hoy en Bolivia, YYYY-MM-DD. */
  hoy: string;
  ahora?: Date;
};

export function resumenDeVehiculo(placa: string, e: Entrada): ResumenVehiculo {
  const lineas: string[] = [];
  // El último trabajo: el más reciente que no se canceló. Una reserva todavía es "para el …"
  const ultimo = (e.reservas ?? [])
    .filter((r) => r.placa === placa && r.estado !== "cancelado")
    .reduce<{ estado: EstadoTrabajo; fechaInicio: string } | null>((max, r) => (!max || r.fechaInicio > max.fechaInicio ? r : max), null);
  if (ultimo) {
    const dia = fechaConMes(ultimo.fechaInicio, e.hoy);
    lineas.push(esOrden(ultimo.estado) ? `Último trabajo: ${dia}, ${NOMBRE_ESTADO_TRABAJO[ultimo.estado].toLowerCase()}` : `Reservado para el ${dia}`);
  }
  // El próximo mantenimiento abierto (pendiente o avisado), el más cercano
  const proximo = (e.mantenimientos ?? [])
    .filter((m) => m.placa === placa && (ESTADOS_RECORDATORIO_ABIERTO as readonly string[]).includes(m.estado))
    .reduce<string | null>((min, m) => (!min || m.fechaProgramada < min ? m.fechaProgramada : min), null);
  if (proximo) lineas.push(`${proximo < e.hoy ? "Mantenimiento vencido el" : "Próximo mantenimiento:"} ${fechaConMes(proximo, e.hoy)}`);
  // Lo que pide atención, uno: una cotización aceptada sin fecha (hay que reservarla) antes que una sin respuesta
  const suyas = (e.cotizaciones ?? []).filter((c) => c.placa === placa);
  const aviso = suyas.some((c) => c.sinFecha)
    ? { texto: "Cotización sin fecha", tipo: "fecha" as const }
    : suyas.some((c) => sinRespuesta(c.estado, diasDesde(c.ultimoMovimientoAt, e.ahora), e.umbral))
      ? { texto: "Cotización sin respuesta", tipo: "tiempo" as const }
      : null;
  return { lineas, aviso };
}
