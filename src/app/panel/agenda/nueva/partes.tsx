import type { Route } from "next";
import { EncabezadoPagina } from "@/componentes/panel/encabezado-pagina";
import type { DestinoPaso } from "@/componentes/panel/pasos-flujo";
import { ParaQuien as LineaParaQuien } from "@/componentes/panel/para-quien";
import { ListaFilas } from "@/componentes/panel/fila-lista";
import { Seccion } from "@/componentes/panel/cabecera-seccion";
import { exigirModulo } from "@/lib/sesion";
import { bs } from "@/modulos/cotizaciones/reglas";
import { FormularioReserva } from "@/modulos/agenda/componentes/formulario-reserva";
import { type CotizacionParaReservar, type VehiculoReserva } from "@/modulos/agenda/consultas/reservar";
import { obtenerParametros } from "@/modulos/configuracion/consultas";
import { type Volver } from "@/lib/volver";

// La reserva nueva: lo que comparten sus caminos (page.tsx, desde-cotizacion.tsx y directa.tsx).

/**
 * Lo que comparten los caminos de una reserva nueva, sacado una vez de la dirección (17/11, al partir la página): quién
 * entra, el día y a dónde volver, y cómo armar la dirección de cada paso (con el día del tablero).
 */
export type Contexto = {
  usuario: Awaited<ReturnType<typeof exigirModulo>>;
  conPagos: boolean;
  volver: Volver;
  /** La pantalla de origen: va en cada paso y en el formulario; la reserva creada vuelve ahí (pedido 43). */
  origen: string | null;
  hoy: string;
  fechaInicial: string;
  texto: (clave: string) => string;
  numero: (clave: string) => number | null;
  /** El indicador de pasos; `destinos`: a dónde lleva tocar cada paso hecho (20/11). */
  indicador: (actual: number, destinos?: (DestinoPaso | undefined)[]) => React.ReactNode;
  direccion: (datos: Record<string, string | number>) => Route;
  /** Lo que se reserva: rearma el formulario cuando cambia en la misma pantalla (hallazgo 9). */
  clave: string;
};

/**
 * El encabezado. "Volver" lleva a la pantalla de la que se vino (pedido 43: la ficha del cliente, la cotización, Inicio,
 * Mantenimientos); sin ella, a la Agenda, donde vive la reserva (pedido 31).
 */
export function Encabezado({ volver }: { volver: Volver }) {
  return <EncabezadoPagina titulo="Nueva reserva" volver={volver} />;
}

export const enlace = "font-semibold underline";

/**
 * Para quién es la reserva, en una línea bajo el indicador de pasos (recorrido visual del 20/11): "Para Carla Rodríguez ·
 * 1234ABC, Compactos". Antes, una tarjeta con "Cambiar" en cada paso; ahora se vuelve a un paso tocándolo en el
 * indicador, y la pantalla muestra solo el paso que se hace. `extra`: el mantenimiento que se agenda.
 */
export function ParaQuien(props: { nombre: string; vehiculo: VehiculoReserva | null; extra?: React.ReactNode }) {
  return <LineaParaQuien etiqueta="Reserva para" nombre={props.nombre} placa={props.vehiculo?.placa} tamano={props.vehiculo?.tamano} extra={props.extra} />;
}

/**
 * Las cotizaciones del vehículo que se pueden reservar (pedido 31): cada una lleva al último paso de la reserva, con
 * sus servicios y precios ya puestos (`enlace`). El total, solo a quien ve montos (RN-12: Pagos o Cotizaciones).
 */
export function CotizacionesDelCliente({ cotizaciones, conMontos, enlace }: { cotizaciones: CotizacionParaReservar[]; conMontos: boolean; enlace: (cotizacionId: number) => Route }) {
  return (
    <Seccion id="sus-cotizaciones" titulo="Sus cotizaciones" sinRelleno>
      <ListaFilas
        etiqueta="Sus cotizaciones"
        filas={cotizaciones.map((c) => ({
          href: enlace(c.cotizacionId),
          titulo: `Cotización ${c.numero}${c.version > 1 ? `, versión ${c.version}` : ""}`,
          detalles: [c.servicios, ...(conMontos ? [bs(c.total)] : [])].filter(Boolean),
          estado: c.aceptada ? "Aceptada" : "Pendiente",
          tonoEstado: c.aceptada ? "exito" : undefined,
          aviso: c.aceptada ? "Sin fecha" : null,
        }))}
      />
    </Seccion>
  );
}

export async function Formulario(props: {
  /** La pantalla de origen: la reserva creada vuelve ahí (pedido 43). */
  volver: string | null;
  origen: React.ComponentProps<typeof FormularioReserva>["origen"];
  conPagos: boolean;
  hoy: string;
  fechaInicial: string;
  fechaFin: string;
  arriba?: React.ReactNode;
  cotizaciones?: React.ReactNode;
  atras?: Route;
  /** A dónde lleva tocar el cliente y el vehículo en el indicador (los pasos que se eligen por la dirección). */
  pasosHechos?: (DestinoPaso | undefined)[];
}) {
  const parametros = await obtenerParametros();
  return (
    <FormularioReserva
      volver={props.volver}
      origen={props.origen}
      conPagos={props.conPagos}
      adelantoSugerido={parametros.adelanto_sugerido.toFixed(2)}
      hoy={props.hoy}
      fechaInicial={props.fechaInicial}
      arriba={props.arriba}
      cotizaciones={props.cotizaciones}
      atras={props.atras}
      pasosHechos={props.pasosHechos}
    />
  );
}
