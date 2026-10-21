import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { EnlaceVolver } from "@/componentes/enlace-volver";
import { Cargando } from "@/componentes/panel/cargando";
import { EstadoVacio } from "@/componentes/panel/estado-vacio";
import { fechaEnBolivia, sumarDias } from "@/lib/fechas";
import { puedeVerModulo } from "@/lib/permisos";
import { exigirModulo } from "@/lib/sesion";
import { mostrarMonto } from "@/modulos/catalogo/reglas";
import { FormularioReserva } from "@/modulos/agenda/componentes/formulario-reserva";
import { datosDeCotizacion, datosDirecta, espaciosEnFechas, tecnicosActivos } from "@/modulos/agenda/consultas";
import { fechaEntregaSugerida } from "@/modulos/agenda/reglas";
import { ElegirCliente } from "@/modulos/clientes/componentes/elegir-cliente";
import { obtenerParametros } from "@/modulos/configuracion/consultas";

export const metadata: Metadata = { title: "Nueva reserva" };

// HU-30: nueva reserva. Desde la cotización vigente de una consulta (`?cotizacion=`), o directa: se elige el cliente con
// el buscador de Clientes (`?cliente=`) y su vehículo (`?vehiculo=`). Dueño o encargado con "Agenda"; la directa lleva
// precios y la arma el dueño o quien tiene "Pagos". `?fecha=` y `?espacio=` llegan desde un día libre del tablero.
export default function PaginaNuevaReserva({ searchParams }: PageProps<"/panel/agenda/nueva">) {
  return (
    <section className="flex flex-col gap-6">
      <EnlaceVolver href="/panel/agenda">Agenda</EnlaceVolver>
      <h1 className="font-heading text-4xl font-extrabold italic">Nueva reserva</h1>
      <Suspense fallback={<Cargando />}>
        <Contenido searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

const enlace = "font-semibold underline";

async function Contenido({ searchParams }: Pick<PageProps<"/panel/agenda/nueva">, "searchParams">) {
  const usuario = await exigirModulo("agenda");
  const conPagos = puedeVerModulo(usuario, "pagos");
  const parametros = await searchParams;
  const texto = (clave: string) => (typeof parametros[clave] === "string" ? (parametros[clave] as string) : "");
  const numero = (clave: string) => (/^\d+$/.test(texto(clave)) ? Number(texto(clave)) : null);
  const hoy = fechaEnBolivia();
  // El día pedido (desde el tablero) si no es pasado; si no, mañana
  const fechaInicial = /^\d{4}-\d{2}-\d{2}$/.test(texto("fecha")) && texto("fecha") >= hoy ? texto("fecha") : sumarDias(hoy, 1);
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
        <div className="flex flex-col gap-2 rounded-sm border border-border p-4">
          <p className="flex flex-wrap gap-x-3">
            <span className="font-semibold">{c.cliente.nombre}</span>
            <span>{c.vehiculo.placa}</span>
            <span className="text-tinta-suave">{c.vehiculo.tamano}</span>
          </p>
          <p className="text-sm text-tinta-suave">Cotización {c.numero}{c.version > 1 ? `, versión ${c.version}` : ""}: al agendar queda aceptada.</p>
          <ul className="flex flex-col gap-1 text-sm">
            {c.lineas.map((l, i) => (
              <li key={i} className="flex justify-between gap-4">
                <span>{l.descripcion}</span>
                {conPagos && <span className="tabular-nums">{mostrarMonto(l.precio)} Bs</span>}
              </li>
            ))}
          </ul>
          {conPagos && <p className="font-semibold">Total: {mostrarMonto(c.saldo.total)} Bs</p>}
        </div>
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

  const d = await datosDirecta(clienteId, numero("vehiculo"));
  if (!d) return <EstadoVacio>Ese cliente ya no está activo. <Link href="/panel/agenda/nueva" className={enlace}>Elegir otro</Link></EstadoVacio>;
  const cambiar = (
    <Link href="/panel/agenda/nueva" className="inline-flex min-h-11 items-center text-sm font-semibold underline">
      Cambiar
    </Link>
  );
  if (d.vehiculos.length === 0) {
    return (
      <EstadoVacio>
        {d.cliente.nombre} no tiene vehículos activos. <Link href={`/panel/clientes/${d.cliente.id}`} className={enlace}>Agregar uno en su ficha</Link>
      </EstadoVacio>
    );
  }
  return (
    <>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-sm border border-tinta p-3">
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="font-semibold">{d.cliente.nombre}</span>
          {d.vehiculo && <span className="text-sm text-tinta-suave">{d.vehiculo.placa}, {d.vehiculo.tamano}</span>}
        </span>
        {cambiar}
      </div>
      {!d.vehiculo ? (
        <div className="flex flex-col gap-3">
          <h2 className="font-heading text-2xl font-bold italic">Vehículo</h2>
          <ul aria-label="Elegir vehículo" className="flex flex-col gap-2">
            {d.vehiculos.map((v) => (
              <li key={v.id}>
                <Link href={`${conservar(d.cliente.id)}&vehiculo=${v.id}`} className="flex flex-col gap-0.5 rounded-sm border border-border p-4 hover:bg-superficie">
                  <span className="font-semibold">{v.placa}</span>
                  <span className="text-sm text-tinta-suave">{v.tamano}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <Formulario
          origen={{ tipo: "directa", clienteId: d.cliente.id, vehiculoId: d.vehiculo.id, opciones: d.opciones }}
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
