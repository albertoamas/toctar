import type { Metadata, Route } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { cn } from "cn";
import { EnlaceVolver } from "@/componentes/enlace-volver";
import { Cargando } from "@/componentes/panel/cargando";
import { EncabezadoPagina } from "@/componentes/panel/encabezado-pagina";
import { EstadoVacio } from "@/componentes/panel/estado-vacio";
import { ListaFilas } from "@/componentes/panel/fila-lista";
import { PasosFlujo } from "@/componentes/panel/pasos-flujo";
import { PasosTrabajo } from "@/componentes/panel/pasos-trabajo";
import { ResumenPaso } from "@/componentes/panel/resumen-paso";
import { CabeceraSeccion } from "@/componentes/panel/seccion-con-editar";
import { fechaCorta, fechaEnBolivia, fechaExiste, sumarDias } from "@/lib/fechas";
import { puedeVerModulo } from "@/lib/permisos";
import { exigirModulo } from "@/lib/sesion";
import { mostrarMonto } from "@/modulos/catalogo/reglas";
import { bs } from "@/modulos/cotizaciones/reglas";
import { FormularioReserva } from "@/modulos/agenda/componentes/formulario-reserva";
import { cotizacionesParaReservar, datosDeCotizacion, datosDirecta, espaciosEnFechas, type CotizacionParaReservar, type VehiculoReserva } from "@/modulos/agenda/consultas";
import { PASO_CLIENTE, PASO_FECHA, PASO_SERVICIOS, PASO_VEHICULO, pasoInicialReserva, pasosNuevaReserva } from "@/modulos/agenda/pasos-reserva";
import { fechaEntregaSugerida } from "@/modulos/agenda/reglas";
import { DatosVehiculo } from "@/modulos/clientes/componentes/datos-vehiculo";
import { ElegirCliente } from "@/modulos/clientes/componentes/elegir-cliente";
import { obtenerParametros } from "@/modulos/configuracion/consultas";
import { recordatorioParaAgendar } from "@/modulos/mantenimientos/consultas";
import { lineaDelMantenimiento } from "@/modulos/mantenimientos/reglas";

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
    <section className="flex max-w-3xl flex-col gap-6">
      <Suspense
        fallback={
          <>
            <EncabezadoPagina titulo="Nueva reserva" />
            <Cargando />
          </>
        }
      >
        <Contenido searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

/** El encabezado: la reserva vive en la Agenda, así que "Volver" lleva allí desde cualquier entrada (pedido 31). */
function Encabezado() {
  return (
    <>
      <EnlaceVolver href="/panel/agenda">Agenda</EnlaceVolver>
      <EncabezadoPagina titulo="Nueva reserva" />
    </>
  );
}

const enlace = "font-semibold underline";

/**
 * El cliente y su vehículo, en lectura, cada uno con "Cambiar" si se puede volver a elegir (`cambiarCliente`,
 * `cambiarVehiculo`: a dónde lleva, con el día y el espacio que llegaron del tablero).
 */
function ClienteYVehiculo(props: { nombre: string; vehiculo: VehiculoReserva | null; cambiarCliente?: Route; cambiarVehiculo?: Route }) {
  return (
    <>
      <ResumenPaso id="resumen-cliente" titulo="Cliente" cambiar={props.cambiarCliente}>
        <span className="font-semibold">{props.nombre}</span>
      </ResumenPaso>
      {props.vehiculo && (
        <ResumenPaso id="resumen-vehiculo" titulo="Vehículo" cambiar={props.cambiarVehiculo}>
          <DatosVehiculo placa={props.vehiculo.placa} detalle={props.vehiculo.detalle} tamano={props.vehiculo.tamano} />
        </ResumenPaso>
      )}
    </>
  );
}

async function Contenido({ searchParams }: Pick<PageProps<"/panel/agenda/nueva">, "searchParams">) {
  const usuario = await exigirModulo("agenda");
  const conPagos = puedeVerModulo(usuario, "pagos");
  const parametros = await searchParams;
  const texto = (clave: string) => (typeof parametros[clave] === "string" ? (parametros[clave] as string) : "");
  const numero = (clave: string) => (/^\d+$/.test(texto(clave)) ? Number(texto(clave)) : null);
  const hoy = fechaEnBolivia();
  // El día pedido (desde el tablero) si no es pasado; si no, mañana
  const fechaInicial = fechaExiste(texto("fecha")) && texto("fecha") >= hoy ? texto("fecha") : sumarDias(hoy, 1);
  const pasos = pasosNuevaReserva(conPagos);
  const indicador = (actual: number) => <PasosFlujo pasos={pasos} actual={actual} etiqueta="Pasos de la reserva" />;
  // Cada paso es una dirección: se conservan el día y el espacio que llegaron del tablero
  const direccion = (datos: Record<string, string | number>) => {
    const p = new URLSearchParams(Object.entries(datos).map(([k, v]) => [k, String(v)]));
    if (texto("fecha")) p.set("fecha", texto("fecha"));
    if (texto("espacio")) p.set("espacio", texto("espacio"));
    return `/panel/agenda/nueva${p.size ? `?${p.toString()}` : ""}` as Route;
  };
  const cotizacionId = numero("cotizacion");

  if (cotizacionId) {
    const c = await datosDeCotizacion(cotizacionId);
    if (!c) {
      return (
        <>
          <Encabezado />
          <EstadoVacio>Esa cotización ya no existe.</EstadoVacio>
        </>
      );
    }
    if (!c.agendable) {
      return (
        <>
          <Encabezado />
          <EstadoVacio>Esa cotización ya tiene una reserva o una versión nueva.</EstadoVacio>
        </>
      );
    }
    // Se dice antes de llenar el formulario, y no recién al guardar
    if (!c.activos) {
      return (
        <>
          <Encabezado />
          <EstadoVacio>El cliente o el vehículo de esa cotización ya no está activo. Reactívalo en su ficha para reservarla.</EstadoVacio>
        </>
      );
    }
    const duraciones = c.lineas.map((l) => l.duracion);
    // Los precios de la cotización, con Pagos o con Cotizaciones (RN-12), como en "Por reservar"
    const verMontos = conPagos || puedeVerModulo(usuario, "cotizaciones");
    // Elegida en el paso Servicios de la reserva (llega con su cliente y vehículo): es el último paso y se puede volver.
    // Desde "Por reservar" o la cotización, arriba van los pasos del trabajo
    const enLosPasos = numero("cliente") === c.cliente.id && numero("vehiculo") === c.vehiculo.id;
    return (
      <>
        <Encabezado />
        {enLosPasos ? indicador(PASO_FECHA) : <PasosTrabajo paso={c.aceptada ? 1 : 0} />}
        <ClienteYVehiculo nombre={c.cliente.nombre} vehiculo={c.vehiculo} cambiarCliente={enLosPasos ? direccion({}) : undefined} />
        {/* Los servicios de la cotización, en lectura: para cambiar precios se hace una versión nueva */}
        <ResumenPaso
          id="cotizacion"
          titulo={`Cotización ${c.numero}${c.version > 1 ? `, versión ${c.version}` : ""}`}
          cambiar={enLosPasos ? direccion({ cliente: c.cliente.id, vehiculo: c.vehiculo.id }) : undefined}
          etiquetaCambiar="Cambiar servicios"
          claseContenido="gap-2"
        >
          <ul className="flex flex-col gap-1">
            {c.lineas.map((l, i) => (
              <li key={i} className="flex justify-between gap-4">
                <span>{l.descripcion}</span>
                {verMontos && <span className="shrink-0 tabular-nums">{mostrarMonto(l.precio)} Bs</span>}
              </li>
            ))}
          </ul>
          {verMontos && (
            <p className="flex justify-between gap-4 border-t border-border pt-2 font-semibold">
              <span>Total</span>
              <span className="tabular-nums">{mostrarMonto(c.saldo.total)} Bs</span>
            </p>
          )}
          {!c.aceptada && <p className="text-sm text-tinta-suave">Al reservar, la cotización queda aceptada.</p>}
        </ResumenPaso>
        <Formulario
          origen={{ tipo: "cotizacion", cotizacionId: c.cotizacionId, duraciones }}
          conPagos={conPagos}
          hoy={hoy}
          fechaInicial={fechaInicial}
          fechaFin={fechaEntregaSugerida(fechaInicial, duraciones)}
          espacio={numero("espacio")}
        />
      </>
    );
  }

  // Paso 1: el cliente. Sin Pagos (no arma reservas sin cotización) también lo elige, para reservar una de sus
  // cotizaciones
  const clienteId = numero("cliente");
  if (!clienteId) {
    return (
      <>
        <Encabezado />
        {indicador(PASO_CLIENTE)}
        <ElegirCliente q={texto("q")} hrefCliente={(id) => direccion({ cliente: id })} />
      </>
    );
  }

  // El mantenimiento que se agenda: abierto y de este cliente y vehículo (la acción lo vuelve a mirar al guardar)
  const recordatorioId = numero("recordatorio");
  if (recordatorioId && (!puedeVerModulo(usuario, "mantenimientos") || !conPagos)) {
    return (
      <>
        <Encabezado />
        <EstadoVacio>
          {!puedeVerModulo(usuario, "mantenimientos")
            ? "Los mantenimientos los reserva el dueño o quien tiene «Mantenimientos»."
            : "La reserva del mantenimiento lleva precios: la arma el dueño o quien registra pagos."}
        </EstadoVacio>
      </>
    );
  }
  const recordatorio = recordatorioId ? await recordatorioParaAgendar(recordatorioId) : null;
  if (recordatorioId && (!recordatorio || recordatorio.clienteId !== clienteId || recordatorio.vehiculoId !== numero("vehiculo"))) {
    return (
      <>
        <Encabezado />
        <EstadoVacio>
          Ese mantenimiento ya se reservó o se cerró. <Link href="/panel/mantenimientos" className={enlace}>Volver a Mantenimientos</Link>
        </EstadoVacio>
      </>
    );
  }

  // Con un solo vehículo, ya va elegido (datosDirecta)
  const d = await datosDirecta(clienteId, numero("vehiculo"));
  if (!d) {
    return (
      <>
        <Encabezado />
        <EstadoVacio>Ese cliente ya no está activo. <Link href="/panel/agenda/nueva" className={enlace}>Elegir otro</Link></EstadoVacio>
      </>
    );
  }
  if (d.vehiculos.length === 0) {
    return (
      <>
        <Encabezado />
        <EstadoVacio>
          {d.cliente.nombre} no tiene vehículos activos. <Link href={`/panel/clientes/${d.cliente.id}`} className={enlace}>Agregar uno en su ficha</Link>
        </EstadoVacio>
      </>
    );
  }
  // Desde un mantenimiento no se cambia el cliente ni el vehículo: el recordatorio es de ellos
  const cambiarCliente = recordatorio ? undefined : direccion({});
  const cambiarVehiculo = recordatorio || d.vehiculos.length < 2 ? undefined : direccion({ cliente: d.cliente.id });

  // Paso 2: el vehículo, si tiene varios
  if (!d.vehiculo) {
    return (
      <>
        <Encabezado />
        {indicador(PASO_VEHICULO)}
        <ClienteYVehiculo nombre={d.cliente.nombre} vehiculo={null} cambiarCliente={cambiarCliente} />
        <section aria-labelledby="vehiculo-titulo" className="flex flex-col gap-3">
          <CabeceraSeccion id="vehiculo" titulo="Vehículo" />
          {/* La fila de un toque, con la placa grande y el tamaño con su etiqueta, como en el resto del panel */}
          <ListaFilas
            etiqueta="Elegir vehículo"
            filas={d.vehiculos.map((v) => ({
              href: direccion({ cliente: d.cliente.id, vehiculo: v.id }),
              titulo: v.placa,
              tituloGrande: true,
              detalles: [...(v.detalle.length > 0 ? [v.detalle.join(" ")] : []), `Tamaño: ${v.tamano}`],
            }))}
          />
        </section>
      </>
    );
  }

  const vehiculo = d.vehiculo;
  const arriba = (
    <>
      <ClienteYVehiculo nombre={d.cliente.nombre} vehiculo={vehiculo} cambiarCliente={cambiarCliente} cambiarVehiculo={cambiarVehiculo} />
      {/* El mantenimiento que se agenda: vencido, en una insignia de aviso */}
      {recordatorio && (
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span>Mantenimiento de {recordatorio.servicio}</span>
          <span className={cn("tt-estado", recordatorio.fechaProgramada < hoy && "tt-estado--aviso")}>
            {recordatorio.fechaProgramada < hoy ? "Venció" : "Vence"} el {fechaCorta(recordatorio.fechaProgramada, hoy)}
          </span>
        </p>
      )}
      {/* Su servicio de mantenimiento ya no se ofrece (inactivo o sin precio para ese tamaño): se dice por qué falta la línea */}
      {recordatorio && !lineaDelMantenimiento(d.opciones, recordatorio.servicioMantenimientoId) && (
        <p role="status" className="rounded-sm border border-aviso p-3 text-sm">
          Su servicio de mantenimiento ya no se ofrece en el catálogo: elige el servicio que se hará.
        </p>
      )}
    </>
  );
  // Paso 3: los servicios. Primero sus cotizaciones para reservar; un mantenimiento no las ofrece (se agenda su servicio)
  const cotizaciones = recordatorio ? [] : await cotizacionesParaReservar(d.cliente.id, vehiculo.id);
  const conMontos = conPagos || puedeVerModulo(usuario, "cotizaciones");
  const deCotizacion = (cotizacion: number) => direccion({ cotizacion, cliente: d.cliente.id, vehiculo: vehiculo.id });
  const suyas = cotizaciones.length > 0 ? <CotizacionesDelCliente cotizaciones={cotizaciones} conMontos={conMontos} enlace={deCotizacion} /> : null;
  if (!conPagos) {
    return (
      <>
        <Encabezado />
        {indicador(PASO_SERVICIOS)}
        {arriba}
        {suyas ?? <EstadoVacio>Este vehículo no tiene cotizaciones para reservar. La reserva sin cotización lleva precios: la arma el dueño o quien registra pagos.</EstadoVacio>}
      </>
    );
  }
  // Un mantenimiento llega con su servicio de mantenimiento ya elegido (pedido 21): con su precio, directo a la fecha
  const lineasIniciales = recordatorio ? [lineaDelMantenimiento(d.opciones, recordatorio.servicioMantenimientoId)].filter((l) => l !== null) : [];
  return (
    <>
      <Encabezado />
      <Formulario
        origen={{
          tipo: "directa",
          clienteId: d.cliente.id,
          vehiculoId: vehiculo.id,
          opciones: d.opciones,
          recordatorioId: recordatorio?.id ?? null,
          lineasIniciales,
          pasoInicial: pasoInicialReserva(lineasIniciales),
        }}
        conPagos={conPagos}
        hoy={hoy}
        fechaInicial={fechaInicial}
        fechaFin={fechaInicial}
        espacio={numero("espacio")}
        arriba={arriba}
        cotizaciones={suyas}
      />
    </>
  );
}

/**
 * Las cotizaciones del vehículo que se pueden reservar (pedido 31): cada una lleva al último paso de la reserva, con
 * sus servicios y precios ya puestos (`enlace`). El total, solo a quien ve montos (RN-12: Pagos o Cotizaciones).
 */
function CotizacionesDelCliente({ cotizaciones, conMontos, enlace }: { cotizaciones: CotizacionParaReservar[]; conMontos: boolean; enlace: (cotizacionId: number) => Route }) {
  return (
    <section aria-labelledby="sus-cotizaciones-titulo" className="flex flex-col gap-3">
      <CabeceraSeccion id="sus-cotizaciones" titulo="Sus cotizaciones" />
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
    </section>
  );
}

async function Formulario(props: {
  origen: React.ComponentProps<typeof FormularioReserva>["origen"];
  conPagos: boolean;
  hoy: string;
  fechaInicial: string;
  fechaFin: string;
  espacio: number | null;
  arriba?: React.ReactNode;
  cotizaciones?: React.ReactNode;
}) {
  const [parametros, espacios] = await Promise.all([obtenerParametros(), espaciosEnFechas(props.fechaInicial, props.fechaFin)]);
  return (
    <FormularioReserva
      origen={props.origen}
      conPagos={props.conPagos}
      adelantoSugerido={parametros.adelanto_sugerido.toFixed(2)}
      hoy={props.hoy}
      fechaInicial={props.fechaInicial}
      espacioInicial={props.espacio}
      espaciosIniciales={espacios}
      arriba={props.arriba}
      cotizaciones={props.cotizaciones}
    />
  );
}
