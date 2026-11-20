import type { Route } from "next";
import { EncabezadoPagina } from "@/componentes/panel/encabezado-pagina";
import { ListaFilas } from "@/componentes/panel/fila-lista";
import { Seccion } from "@/componentes/panel/cabecera-seccion";
import { exigirModulo } from "@/lib/sesion";
import { bs } from "@/modulos/cotizaciones/reglas";
import { FormularioReserva } from "@/modulos/agenda/componentes/formulario-reserva";
import { espaciosEnFechas } from "@/modulos/agenda/consultas/espacios";
import { type CotizacionParaReservar, type VehiculoReserva } from "@/modulos/agenda/consultas/reservar";
import { ResumenClienteVehiculo } from "@/modulos/clientes/componentes/resumen-cliente-vehiculo";
import { obtenerParametros } from "@/modulos/configuracion/consultas";
import { type Volver } from "@/lib/volver";

// La reserva nueva: lo que comparten sus caminos (page.tsx, desde-cotizacion.tsx y directa.tsx).

/**
 * Lo que comparten los caminos de una reserva nueva, sacado una vez de la dirección (17/11, al partir la página): quién
 * entra, el día y a dónde volver, y cómo armar la dirección de cada paso (con el día y el espacio del tablero).
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
  indicador: (actual: number) => React.ReactNode;
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
 * El cliente y su vehículo, en lectura y en una sola tarjeta ("Reserva para", pulido final del 09/11), cada uno con
 * "Cambiar" si se puede volver a elegir (`cambiarCliente`, `cambiarVehiculo`: a dónde lleva, con el día y el espacio que
 * llegaron del tablero).
 */
export function ClienteYVehiculo(props: { nombre: string; vehiculo: VehiculoReserva | null; cambiarCliente?: Route; cambiarVehiculo?: Route; extra?: React.ReactNode }) {
  return (
    <ResumenClienteVehiculo
      cliente={{ nombre: props.nombre, href: props.cambiarCliente }}
      vehiculo={props.vehiculo && { ...props.vehiculo, href: props.cambiarVehiculo }}
      extra={props.extra}
    />
  );
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
  espacio: number | null;
  arriba?: React.ReactNode;
  cotizaciones?: React.ReactNode;
  atras?: Route;
}) {
  const [parametros, espacios] = await Promise.all([obtenerParametros(), props.fechaInicial ? espaciosEnFechas(props.fechaInicial, props.fechaFin) : []]);
  return (
    <FormularioReserva
      volver={props.volver}
      origen={props.origen}
      conPagos={props.conPagos}
      adelantoSugerido={parametros.adelanto_sugerido.toFixed(2)}
      hoy={props.hoy}
      fechaInicial={props.fechaInicial}
      espacioInicial={props.espacio}
      espaciosIniciales={espacios}
      arriba={props.arriba}
      cotizaciones={props.cotizaciones}
      atras={props.atras}
    />
  );
}
