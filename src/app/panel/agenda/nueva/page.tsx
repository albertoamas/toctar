import type { Metadata, Route } from "next";
import { Suspense } from "react";
import { Cargando } from "@/componentes/panel/cargando";
import { EncabezadoPagina } from "@/componentes/panel/encabezado-pagina";
import { PaginaPanel } from "@/componentes/panel/pagina-panel";
import { PasosFlujo } from "@/componentes/panel/pasos-flujo";
import { fechaEnBolivia, fechaExiste } from "@/lib/fechas";
import { puedeVerModulo } from "@/lib/permisos";
import { exigirModulo } from "@/lib/sesion";
import { PASO_CLIENTE, pasosNuevaReserva } from "@/modulos/agenda/pasos-reserva";
import { ElegirCliente } from "@/modulos/clientes/componentes/elegir-cliente";
import { leerDesde, PARAMETRO_VOLVER, volverDesde } from "@/lib/volver";
import { ReservaDesdeCotizacion } from "./desde-cotizacion";
import { ReservaDirecta } from "./directa";
import { Encabezado, type Contexto } from "./partes";

export const metadata: Metadata = { title: "Nueva reserva" };

// HU-30: nueva reserva. Desde la versión vigente de una cotización (`?cotizacion=`), o directa: se elige el cliente con
// el buscador de Clientes (`?cliente=`) y su vehículo (`?vehiculo=`). Dueño o encargado con "Agenda"; la directa lleva
// precios y la arma el dueño o quien tiene "Pagos". `?fecha=` y `?espacio=` llegan desde un día libre del tablero.
// HU-38: `?recordatorio=` llega desde "Reservar" en Mantenimientos, con el cliente y el vehículo: al agendar, el
// recordatorio queda "agendado". Pedido 21: la línea llega con su servicio de mantenimiento.
// Pulido 10.2: el cliente y su vehículo en un recuadro de lectura (como en Nueva cotización), con "Cambiar" en su
// cabecera; la hora y la nota plegadas, y "Reservar" fijo abajo en el celular (en FormularioReserva).
// Pedido 31 (P31-flujo-de-un-trabajo.md §5): la Agenda es donde se reserva, así que "Volver" lleva a ella desde cualquier
// entrada; desde una cotización, arriba van los pasos del trabajo. En la directa, elegido el vehículo, se ofrecen primero sus cotizaciones para reservar (pendientes o aceptadas
// sin fecha): así no se vuelven a escribir los precios. Quien no tiene Pagos (no arma directas) también elige al cliente
// y reserva una de sus cotizaciones.
// Pedido 41 (P41-reserva-en-pasos.md): cuatro pasos, uno por pantalla, como Nueva cotización: Cliente y Vehículo por la
// dirección, Servicios y Fecha y adelanto en el formulario (FormularioReserva). Con un solo vehículo se pasa directo a
// Servicios; desde una cotización o un mantenimiento con su precio, directo a la fecha. Lo ya elegido va arriba, con
// "Cambiar" para volver a su paso.
export default function PaginaNuevaReserva({ searchParams }: PageProps<"/panel/agenda/nueva">) {
  return (
    <PaginaPanel tipo="formulario">
      <Suspense
        fallback={
          <>
            <EncabezadoPagina titulo="Nueva reserva" volver={{ href: "/panel/agenda", texto: "Agenda" }} />
            <Cargando />
          </>
        }
      >
        <Contenido searchParams={searchParams} />
      </Suspense>
    </PaginaPanel>
  );
}

async function Contenido({ searchParams }: Pick<PageProps<"/panel/agenda/nueva">, "searchParams">) {
  const usuario = await exigirModulo("agenda");
  const conPagos = puedeVerModulo(usuario, "pagos");
  const parametros = await searchParams;
  const texto = (clave: string) => (typeof parametros[clave] === "string" ? (parametros[clave] as string) : "");
  const volver = volverDesde(parametros.volver, { href: "/panel/agenda", texto: "Agenda" }, usuario);
  // El origen va en cada paso y en el formulario: la reserva creada vuelve ahí (pedido 43)
  const origen = leerDesde(parametros.volver);
  const numero = (clave: string) => (/^\d+$/.test(texto(clave)) ? Number(texto(clave)) : null);
  const hoy = fechaEnBolivia();
  // El día pedido (desde el tablero) si no es pasado; si no, hoy (18/11: antes, mañana; el dueño reserva y recibe muchas
  // veces en el día, y quedaba con la fecha de mañana sin darse cuenta)
  // Vacía salvo desde un día libre de la Agenda (20/11): con hoy puesto, un "Reservar" apurado reservaba un día que no
  // se eligió
  const fechaInicial = fechaExiste(texto("fecha")) && texto("fecha") >= hoy ? texto("fecha") : "";
  const pasos = pasosNuevaReserva(conPagos);
  const indicador = (actual: number) => <PasosFlujo pasos={pasos} actual={actual} etiqueta="Pasos de la reserva" />;
  // Cada paso es una dirección: se conservan el día y el espacio que llegaron del tablero
  const direccion = (datos: Record<string, string | number>) => {
    const p = new URLSearchParams(Object.entries(datos).map(([k, v]) => [k, String(v)]));
    if (texto("fecha")) p.set("fecha", texto("fecha"));
    if (texto("espacio")) p.set("espacio", texto("espacio"));
    if (origen) p.set(PARAMETRO_VOLVER, origen);
    return `/panel/agenda/nueva${p.size ? `?${p.toString()}` : ""}` as Route;
  };
  const cotizacionId = numero("cotizacion");
  // Lo que se reserva (hallazgo 9 de la prueba en celulares, 15/11). La misma pantalla sirve a los tres caminos y solo
  // cambia la dirección: al salir y volver, PaginaPanel lo rearma (EmpiezaDeCero); esta clave lo rearma también sin salir,
  // cuando lo reservado cambia en la misma pantalla ("Usar la cotización" en una reserva directa)
  const clave = ["cotizacion", "cliente", "vehiculo", "recordatorio", "fecha", "espacio"].map(texto).join("|");

  const ctx: Contexto = { usuario, conPagos, volver, origen, hoy, fechaInicial, texto, numero, indicador, direccion, clave };

  if (cotizacionId) return <ReservaDesdeCotizacion ctx={ctx} cotizacionId={cotizacionId} />;

  // Paso 1: el cliente. Sin Pagos (no arma reservas sin cotización) también lo elige, para reservar una de sus
  // cotizaciones
  const clienteId = numero("cliente");
  if (!clienteId) {
    return (
      <>
        <Encabezado volver={volver} />
        {indicador(PASO_CLIENTE)}
        <ElegirCliente q={texto("q")} hrefCliente={(id) => direccion({ cliente: id })} />
      </>
    );
  }

  return <ReservaDirecta ctx={ctx} clienteId={clienteId} />;
}
