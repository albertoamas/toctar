import type { Metadata, Route } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { cn } from "cn";
import { ArrowLeftRightIcon } from "lucide-react";
import { EnlaceVolver } from "@/componentes/enlace-volver";
import { Cargando } from "@/componentes/panel/cargando";
import { EncabezadoPagina } from "@/componentes/panel/encabezado-pagina";
import { EstadoVacio } from "@/componentes/panel/estado-vacio";
import { ListaFilas } from "@/componentes/panel/fila-lista";
import { CabeceraSeccion } from "@/componentes/panel/seccion-con-editar";
import { buttonVariants } from "@/componentes/ui/button";
import { fechaCorta, fechaEnBolivia, fechaExiste, sumarDias } from "@/lib/fechas";
import { puedeVerModulo } from "@/lib/permisos";
import { exigirModulo } from "@/lib/sesion";
import { mostrarMonto } from "@/modulos/catalogo/reglas";
import { FormularioReserva } from "@/modulos/agenda/componentes/formulario-reserva";
import { datosDeCotizacion, datosDirecta, espaciosEnFechas, tecnicosActivos, type VehiculoReserva } from "@/modulos/agenda/consultas";
import { fechaEntregaSugerida } from "@/modulos/agenda/reglas";
import { DatosVehiculo } from "@/modulos/clientes/componentes/datos-vehiculo";
import { ElegirCliente } from "@/modulos/clientes/componentes/elegir-cliente";
import { obtenerParametros } from "@/modulos/configuracion/consultas";
import { recordatorioParaAgendar } from "@/modulos/mantenimientos/consultas";

export const metadata: Metadata = { title: "Nueva reserva" };

// HU-30: nueva reserva. Desde la cotización vigente de una consulta (`?cotizacion=`), o directa: se elige el cliente con
// el buscador de Clientes (`?cliente=`) y su vehículo (`?vehiculo=`). Dueño o encargado con "Agenda"; la directa lleva
// precios y la arma el dueño o quien tiene "Pagos". `?fecha=` y `?espacio=` llegan desde un día libre del tablero.
// HU-38: `?recordatorio=` llega desde "Agendar" en Mantenimientos, con el cliente y el vehículo: al agendar, el
// recordatorio queda "agendado".
// Pulido 10.2: el cliente y su vehículo en un recuadro de lectura (como en Nueva consulta), con "Cambiar" en su
// cabecera; la hora y la nota plegadas, y "Agendar" fijo abajo en el celular (en FormularioReserva).
export default function PaginaNuevaReserva({ searchParams }: PageProps<"/panel/agenda/nueva">) {
  return (
    <section className="flex flex-col gap-6">
      <EnlaceVolver href="/panel/agenda">Agenda</EnlaceVolver>
      <EncabezadoPagina titulo="Nueva reserva" />
      <Suspense fallback={<Cargando />}>
        <Contenido searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

const enlace = "font-semibold underline";

/**
 * El cliente y su vehículo, en lectura. "Cambiar" (sin borde, como "Editar") vuelve a elegir en la directa, con el día y
 * el espacio que llegaron del tablero (`cambiar`: a dónde lleva).
 */
function ClienteYVehiculo({ nombre, vehiculo, cambiar }: { nombre: string; vehiculo: VehiculoReserva | null; cambiar?: Route }) {
  return (
    <section aria-labelledby="cliente-titulo" className="flex flex-col gap-3">
      <CabeceraSeccion id="cliente" titulo="Cliente">
        {cambiar && (
          <Link href={cambiar} className={cn(buttonVariants({ variant: "ghost" }))}>
            <ArrowLeftRightIcon />
            Cambiar
          </Link>
        )}
      </CabeceraSeccion>
      <div className="flex flex-col gap-0.5 rounded-sm border border-border p-4">
        <span className="font-semibold">{nombre}</span>
        {vehiculo && <DatosVehiculo placa={vehiculo.placa} detalle={vehiculo.detalle} tamano={vehiculo.tamano} />}
      </div>
    </section>
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
  const cotizacionId = numero("cotizacion");

  if (cotizacionId) {
    const c = await datosDeCotizacion(cotizacionId);
    if (!c) return <EstadoVacio>Esa cotización ya no existe.</EstadoVacio>;
    if (!c.agendable) {
      return (
        <EstadoVacio>
          Esa cotización ya fue agendada o se corrigió.{" "}
          <Link href={`/panel/consultas/${c.consultaId}`} className={enlace}>Volver a la consulta</Link>
        </EstadoVacio>
      );
    }
    const duraciones = c.lineas.map((l) => l.duracion);
    return (
      <>
        <ClienteYVehiculo nombre={c.cliente.nombre} vehiculo={c.vehiculo} />
        {/* Los servicios de la cotización, en lectura: para cambiar precios se corrige la cotización */}
        <section aria-labelledby="cotizacion-titulo" className="flex flex-col gap-3">
          <CabeceraSeccion id="cotizacion" titulo={`Cotización ${c.numero}${c.version > 1 ? `, versión ${c.version}` : ""}`} />
          <div className="flex flex-col gap-2 rounded-sm border border-border p-4">
            <ul className="flex flex-col gap-1">
              {c.lineas.map((l, i) => (
                <li key={i} className="flex justify-between gap-4">
                  <span>{l.descripcion}</span>
                  {conPagos && <span className="shrink-0 tabular-nums">{mostrarMonto(l.precio)} Bs</span>}
                </li>
              ))}
            </ul>
            {conPagos && (
              <p className="flex justify-between gap-4 border-t border-border pt-2 font-semibold">
                <span>Total</span>
                <span className="tabular-nums">{mostrarMonto(c.saldo.total)} Bs</span>
              </p>
            )}
            <p className="text-sm text-tinta-suave">Al agendar, la cotización queda aceptada.</p>
          </div>
        </section>
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

  // Directa: lleva precios, así que la arma el dueño o quien registra pagos
  if (!conPagos) {
    return <EstadoVacio>La reserva directa lleva precios: la arma el dueño o quien registra pagos. Agenda desde la cotización de una consulta.</EstadoVacio>;
  }
  const clienteId = numero("cliente");
  const conservar = (id: number) => {
    const p = new URLSearchParams({ cliente: String(id) });
    if (texto("fecha")) p.set("fecha", texto("fecha"));
    if (texto("espacio")) p.set("espacio", texto("espacio"));
    return `/panel/agenda/nueva?${p.toString()}` as const;
  };
  if (!clienteId) return <ElegirCliente q={texto("q")} hrefCliente={conservar} />;

  // El mantenimiento que se agenda: abierto y de este cliente y vehículo (la acción lo vuelve a mirar al guardar)
  const recordatorioId = numero("recordatorio");
  if (recordatorioId && !puedeVerModulo(usuario, "mantenimientos")) {
    return <EstadoVacio>Los mantenimientos los agenda el dueño o quien tiene «Mantenimientos».</EstadoVacio>;
  }
  const recordatorio = recordatorioId ? await recordatorioParaAgendar(recordatorioId) : null;
  if (recordatorioId && (!recordatorio || recordatorio.clienteId !== clienteId || recordatorio.vehiculoId !== numero("vehiculo"))) {
    return (
      <EstadoVacio>
        Ese mantenimiento ya se agendó o se cerró. <Link href="/panel/mantenimientos" className={enlace}>Volver a Mantenimientos</Link>
      </EstadoVacio>
    );
  }

  const d = await datosDirecta(clienteId, numero("vehiculo"));
  // Volver a elegir el cliente, sin perder el día y el espacio que llegaron del tablero
  const elegirDeNuevo = new URLSearchParams();
  if (texto("fecha")) elegirDeNuevo.set("fecha", texto("fecha"));
  if (texto("espacio")) elegirDeNuevo.set("espacio", texto("espacio"));
  const volverAElegir = `/panel/agenda/nueva${elegirDeNuevo.size ? `?${elegirDeNuevo.toString()}` : ""}` as Route;
  if (!d) return <EstadoVacio>Ese cliente ya no está activo. <Link href="/panel/agenda/nueva" className={enlace}>Elegir otro</Link></EstadoVacio>;
  if (d.vehiculos.length === 0) {
    return (
      <EstadoVacio>
        {d.cliente.nombre} no tiene vehículos activos. <Link href={`/panel/clientes/${d.cliente.id}`} className={enlace}>Agregar uno en su ficha</Link>
      </EstadoVacio>
    );
  }
  return (
    <>
      {/* Desde un mantenimiento no se cambia el cliente: el recordatorio es de ese cliente y ese vehículo */}
      <ClienteYVehiculo nombre={d.cliente.nombre} vehiculo={d.vehiculo} cambiar={recordatorio ? undefined : volverAElegir} />
      {/* El mantenimiento que se agenda: vencido, en una insignia de aviso */}
      {recordatorio && (
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span>Mantenimiento de {recordatorio.servicio}</span>
          <span className={cn("tt-insignia", recordatorio.fechaProgramada < hoy && "tt-insignia--aviso")}>
            {recordatorio.fechaProgramada < hoy ? "Venció" : "Vence"} el {fechaCorta(recordatorio.fechaProgramada, hoy)}
          </span>
        </p>
      )}
      {!d.vehiculo ? (
        <section aria-labelledby="vehiculo-titulo" className="flex flex-col gap-3">
          <CabeceraSeccion id="vehiculo" titulo="Vehículo" />
          {/* La fila de un toque, con la placa grande y el tamaño con su etiqueta, como en el resto del panel */}
          <ListaFilas
            etiqueta="Elegir vehículo"
            filas={d.vehiculos.map((v) => ({
              href: `${conservar(d.cliente.id)}&vehiculo=${v.id}`,
              titulo: v.placa,
              tituloGrande: true,
              detalles: [...(v.detalle.length > 0 ? [v.detalle.join(" ")] : []), `Tamaño: ${v.tamano}`],
            }))}
          />
        </section>
      ) : (
        <Formulario
          origen={{ tipo: "directa", clienteId: d.cliente.id, vehiculoId: d.vehiculo.id, opciones: d.opciones, recordatorioId: recordatorio?.id ?? null }}
          conPagos={conPagos}
          hoy={hoy}
          fechaInicial={fechaInicial}
          fechaFin={fechaInicial}
          espacio={numero("espacio")}
        />
      )}
    </>
  );
}

async function Formulario(props: {
  origen: React.ComponentProps<typeof FormularioReserva>["origen"];
  conPagos: boolean;
  hoy: string;
  fechaInicial: string;
  fechaFin: string;
  espacio: number | null;
}) {
  const [tecnicos, parametros, espacios] = await Promise.all([tecnicosActivos(), obtenerParametros(), espaciosEnFechas(props.fechaInicial, props.fechaFin)]);
  return (
    <FormularioReserva
      origen={props.origen}
      tecnicos={tecnicos}
      conPagos={props.conPagos}
      adelantoSugerido={parametros.adelanto_sugerido.toFixed(2)}
      hoy={props.hoy}
      fechaInicial={props.fechaInicial}
      espacioInicial={props.espacio}
      espaciosIniciales={espacios}
    />
  );
}
