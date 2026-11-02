import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { cn } from "cn";
import { ClipboardCheckIcon, WrenchIcon } from "lucide-react";
import { EnlaceVolver } from "@/componentes/enlace-volver";
import { AvisoEnPagina } from "@/componentes/panel/aviso-en-pagina";
import { Cargando } from "@/componentes/panel/cargando";
import { EncabezadoPagina } from "@/componentes/panel/encabezado-pagina";
import { Insignia } from "@/componentes/panel/insignia";
import { ENLACE_TEXTO } from "@/componentes/panel/enlace-texto";
import { IconoWhatsApp } from "@/componentes/sitio/iconos-marca";
import { buttonVariants } from "@/componentes/ui/button";
import { fechaEnBolivia, formatearFecha, formatearFechaHora } from "@/lib/fechas";
import { puede, puedeVerModulo } from "@/lib/permisos";
import { exigirModulo } from "@/lib/sesion";
import { enlaceWhatsApp, formatearWhatsApp } from "@/lib/whatsapp";
import { MasReserva } from "@/modulos/agenda/componentes/acciones-reserva";
import { obtenerReserva } from "@/modulos/agenda/consultas";
import { NOMBRE_ESTADO_TRABAJO, TONO_ESTADO_TRABAJO } from "@/modulos/agenda/reglas";
import { detalleVehiculo } from "@/modulos/clientes/reglas";
import { esOrden, puedeRecibirse } from "@/modulos/ordenes/reglas";
import { MontosTrabajo } from "@/modulos/pagos/componentes/montos-trabajo";

export const metadata: Metadata = { title: "Reserva" };

// HU-30: una reserva. Con "Pagos" (o el dueño), sus servicios, el total, lo pagado y el saldo. HU-31: reprogramarla o
// cancelarla mientras está agendada. HU-32: registrar y anular pagos, con el comprobante; una cancelada, sin acciones.
// HU-33: desde su día de ingreso, "Recibir vehículo" (con "Órdenes"); recibida, es una orden y lleva a ella.
// Pulido 10.3 (skill pantallas-panel): el paso siguiente en el encabezado (recibir o ver la orden), reprogramar y
// cancelar en "Más" con sus modales, y "Registrar pago" sin fondo en la cabecera de Pagos.
export default function PaginaReserva({ params, searchParams }: PageProps<"/panel/agenda/[id]">) {
  return (
    <section className="flex flex-col gap-6">
      <EnlaceVolver href="/panel/agenda">Agenda</EnlaceVolver>
      <Suspense fallback={<Cargando />}>
        <Detalle params={params} searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

async function Detalle({ params, searchParams }: Pick<PageProps<"/panel/agenda/[id]">, "params" | "searchParams">) {
  const usuario = await exigirModulo("agenda");
  const [{ id }, { agendada }] = await Promise.all([params, searchParams]);
  if (!/^\d+$/.test(id)) notFound();
  const conPagos = puedeVerModulo(usuario, "pagos");
  const r = await obtenerReserva(Number(id), conPagos);
  if (!r) notFound();
  const verFicha = puedeVerModulo(usuario, "clientes");
  const verCotizacion = puedeVerModulo(usuario, "cotizaciones");
  const unDia = r.fechaInicio === r.fechaFin;
  const hoy = fechaEnBolivia();
  const cancelada = r.estado === "cancelado";
  const verOrdenes = puedeVerModulo(usuario, "ordenes");
  const orden = esOrden(r.estado);

  const detalle = detalleVehiculo(r);
  // El paso siguiente, uno solo, en el encabezado: recibir el vehículo desde su día de ingreso, o ir a la orden si ya se
  // recibió. Reprogramar y cancelar, en "Más", mientras siga agendada
  const principal =
    puede(usuario, "recibir_vehiculo") && puedeRecibirse(r, hoy) ? (
      // Enlace con forma de botón: lleva a la recepción, con el checklist
      <Link href={`/panel/ordenes/${r.id}/recibir`} className={cn(buttonVariants())}>
        <ClipboardCheckIcon />
        Recibir vehículo
      </Link>
    ) : orden && verOrdenes ? (
      <Link href={`/panel/ordenes/${r.id}`} className={cn(buttonVariants())}>
        <WrenchIcon />
        Ver la orden
      </Link>
    ) : null;

  return (
    <div className="flex max-w-5xl flex-col gap-8">
      <EncabezadoPagina
        titulo={r.placa}
        estado={<Insignia tono={TONO_ESTADO_TRABAJO[r.estado]}>{NOMBRE_ESTADO_TRABAJO[r.estado]}</Insignia>}
        accion={
          <div className="flex flex-wrap gap-2">
            {principal}
            <a href={enlaceWhatsApp(r.telefono)} target="_blank" rel="noreferrer" className={cn(buttonVariants({ variant: "outline" }))}>
              <IconoWhatsApp />
              Escribir por WhatsApp
            </a>
            {r.estado === "agendado" && (
              <MasReserva id={r.id} fechaInicio={r.fechaInicio} fechaFin={r.fechaFin} espacioId={r.espacioId} hoy={hoy} pagado={r.montos?.saldo.pagado ?? null} />
            )}
          </div>
        }
      >
        {cancelada && r.motivoCancelacion ? `Cancelada: ${r.motivoCancelacion}` : orden && !verOrdenes ? "Ya se recibió: es una orden del taller." : null}
      </EncabezadoPagina>
      {/* Solo mientras siga agendada: tras cancelarla (o en un enlace viejo) ya no corresponde */}
      {agendada && r.estado === "agendado" && (
        <AvisoEnPagina>
          Reserva agendada para el {formatearFecha(r.fechaInicio).slice(0, 5)} en {r.espacio}.
        </AvisoEnPagina>
      )}

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:items-start">
        {/* La placa ya está en el título: el vehículo dice su modelo y su tamaño, con la etiqueta */}
        <div className="flex flex-col gap-2 tt-tarjeta-panel p-4 lg:col-start-2 lg:row-start-1">
          <dl aria-label="Datos de la reserva" className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-3">
            <dt className="text-tinta-suave">Ingresa</dt>
            <dd className="flex flex-col">
              <span className="font-semibold">{formatearFecha(r.fechaInicio)}</span>
              {r.horaIngreso && <span className="text-sm text-tinta-suave">{r.horaIngreso}</span>}
            </dd>
            <dt className="text-tinta-suave">Entrega</dt>
            <dd>{unDia ? "El mismo día" : `${formatearFecha(r.fechaFin)}, aproximada`}</dd>
            <dt className="text-tinta-suave">Espacio</dt>
            <dd className="font-semibold">{r.espacio}</dd>
            <dt className="text-tinta-suave">Técnico</dt>
            <dd>{r.tecnico ?? <span className="text-tinta-suave">Sin asignar</span>}</dd>
            <dt className="text-tinta-suave">Cliente</dt>
            <dd className="flex flex-col">
              <span className="font-semibold">{r.cliente}</span>
              <span className="text-sm text-tinta-suave">{formatearWhatsApp(r.telefono)}</span>
            </dd>
            <dt className="text-tinta-suave">Vehículo</dt>
            <dd className="flex flex-col">
              {detalle.length > 0 && <span>{detalle.join(" ")}</span>}
              <span className="text-sm text-tinta-suave">Tamaño: {r.tamano}</span>
            </dd>
            <dt className="text-tinta-suave">Agendada</dt>
            <dd className="flex flex-col">
              <span>{formatearFechaHora(r.createdAt)}</span>
              <span className="text-sm text-tinta-suave">por {r.agendadaPor}</span>
            </dd>
          </dl>
          {/* Los enlaces, de 44 px y fuera de la lista: la ficha del cliente (con Clientes) y su cotización (con Cotizaciones) */}
          {verFicha && (
            <Link href={`/panel/clientes/${r.clienteId}`} className={ENLACE_TEXTO}>
              Ver ficha del cliente
            </Link>
          )}
          {r.consultaId && r.cotizacion && verCotizacion && (
            <Link href={`/panel/cotizaciones/${r.consultaId}`} className={ENLACE_TEXTO}>
              Ver la cotización {r.cotizacion.numero}
              {r.cotizacion.version > 1 && `, versión ${r.cotizacion.version}`}
            </Link>
          )}
        </div>

        <div className="flex flex-col gap-10 lg:col-start-1 lg:row-start-1">
          {/* Solo una cancelada queda sin acciones: una entregada con saldo se sigue cobrando (RN-13) */}
          {r.montos && <MontosTrabajo trabajoId={r.id} montos={r.montos} cerrado={cancelada} hoy={hoy} />}
          {r.nota && (
            <section aria-labelledby="nota-titulo" className="flex flex-col gap-2">
              <h2 id="nota-titulo" className="tt-titulo-seccion">Nota</h2>
              <p className="whitespace-pre-line">{r.nota}</p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
