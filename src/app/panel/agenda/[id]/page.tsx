import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { cn } from "cn";
import { ClipboardCheckIcon } from "lucide-react";
import { EnlaceVolver } from "@/componentes/enlace-volver";
import { AvisoEnPagina } from "@/componentes/panel/aviso-en-pagina";
import { Cargando } from "@/componentes/panel/cargando";
import { IconoWhatsApp } from "@/componentes/sitio/iconos-marca";
import { buttonVariants } from "@/componentes/ui/button";
import { fechaEnBolivia, formatearFecha, formatearFechaHora } from "@/lib/fechas";
import { puedeVerModulo } from "@/lib/permisos";
import { exigirModulo } from "@/lib/sesion";
import { enlaceWhatsApp, formatearWhatsApp } from "@/lib/whatsapp";
import { AccionesReserva } from "@/modulos/agenda/componentes/acciones-reserva";
import { obtenerReserva } from "@/modulos/agenda/consultas";
import { NOMBRE_ESTADO_TRABAJO } from "@/modulos/agenda/reglas";
import { esOrden, puedeRecibirse } from "@/modulos/ordenes/reglas";
import { MontosTrabajo } from "@/modulos/pagos/componentes/montos-trabajo";

export const metadata: Metadata = { title: "Reserva" };

// HU-30: una reserva. Con "Pagos" (o el dueño), sus servicios, el total, lo pagado y el saldo. HU-31: reprogramarla o
// cancelarla mientras está agendada. HU-32: registrar y anular pagos, con el comprobante; una cancelada, sin acciones.
// HU-33: desde su día de ingreso, "Recibir vehículo" (con "Órdenes"); recibida, es una orden y lleva a ella.
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
  const verConsulta = puedeVerModulo(usuario, "consultas");
  const unDia = r.fechaInicio === r.fechaFin;
  const hoy = fechaEnBolivia();
  const cancelada = r.estado === "cancelado";
  const verOrdenes = puedeVerModulo(usuario, "ordenes");
  const orden = esOrden(r.estado);

  return (
    <>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-4">
        <h1 className="font-heading text-4xl font-extrabold italic">{r.placa}</h1>
        <span className={cn("tt-insignia", r.estado === "cancelado" && "tt-insignia--aviso")}>{NOMBRE_ESTADO_TRABAJO[r.estado]}</span>
        <a href={enlaceWhatsApp(r.telefono)} target="_blank" rel="noreferrer" className={cn(buttonVariants({ variant: "outline" }), "sm:ml-auto")}>
          <IconoWhatsApp />
          Escribir por WhatsApp
        </a>
      </div>
      {/* Solo mientras siga agendada: tras cancelarla (o en un enlace viejo) ya no corresponde */}
      {agendada && r.estado === "agendado" && (
        <AvisoEnPagina>
          Reserva agendada para el {formatearFecha(r.fechaInicio).slice(0, 5)} en {r.espacio}.
        </AvisoEnPagina>
      )}
      {orden && (
        <AvisoEnPagina>
          Esta reserva ya es una orden.{" "}
          {verOrdenes && (
            <Link href={`/panel/ordenes/${r.id}`} className="font-semibold underline">
              Ver la orden
            </Link>
          )}
        </AvisoEnPagina>
      )}
      {r.estado === "cancelado" && r.motivoCancelacion && (
        <p className="rounded-sm border border-aviso p-3">
          <span className="font-semibold">Cancelada: </span>
          {r.motivoCancelacion}
        </p>
      )}

      <div className="grid max-w-5xl gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:items-start">
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-3 rounded-sm border border-border p-4 text-sm lg:col-start-2 lg:row-start-1">
          <dt className="text-tinta-suave">Ingresa</dt>
          <dd className="flex flex-col">
            <span className="font-semibold">{formatearFecha(r.fechaInicio)}</span>
            {r.horaIngreso && <span className="text-tinta-suave">{r.horaIngreso}</span>}
          </dd>
          <dt className="text-tinta-suave">Entrega</dt>
          <dd>{unDia ? "El mismo día" : `${formatearFecha(r.fechaFin)}, aproximada`}</dd>
          <dt className="text-tinta-suave">Espacio</dt>
          <dd className="font-semibold">{r.espacio}</dd>
          <dt className="text-tinta-suave">Técnico</dt>
          <dd>{r.tecnico ?? <span className="text-tinta-suave">Sin asignar</span>}</dd>
          <dt className="text-tinta-suave">Cliente</dt>
          <dd className="flex flex-col">
            {verFicha ? (
              <Link href={`/panel/clientes/${r.clienteId}`} className="font-semibold underline">{r.cliente}</Link>
            ) : (
              <span className="font-semibold">{r.cliente}</span>
            )}
            <span className="text-tinta-suave">{formatearWhatsApp(r.telefono)}</span>
          </dd>
          <dt className="text-tinta-suave">Vehículo</dt>
          <dd className="flex flex-col">
            <span className="font-semibold">{r.placa}</span>
            <span className="text-tinta-suave">{r.tamano}</span>
          </dd>
          {r.consultaId && verConsulta && (
            <>
              <dt className="text-tinta-suave">Consulta</dt>
              <dd>
                <Link href={`/panel/consultas/${r.consultaId}`} className="underline">
                  {r.cotizacion ? `Cotización ${r.cotizacion.numero}${r.cotizacion.version > 1 ? `, versión ${r.cotizacion.version}` : ""}` : "Ver la consulta"}
                </Link>
              </dd>
            </>
          )}
          <dt className="text-tinta-suave">Agendada</dt>
          <dd className="flex flex-col">
            <span>{formatearFechaHora(r.createdAt)}</span>
            <span className="text-tinta-suave">por {r.agendadaPor}</span>
          </dd>
        </dl>

        <div className="flex flex-col gap-10 lg:col-start-1 lg:row-start-1">
          {verOrdenes && puedeRecibirse(r, hoy) && (
            <div>
              {/* Enlace con forma de botón: lleva a la recepción, con las fotos de ingreso */}
              <Link href={`/panel/ordenes/${r.id}/recibir`} className={cn(buttonVariants())}>
                <ClipboardCheckIcon />
                Recibir vehículo
              </Link>
            </div>
          )}
          {r.estado === "agendado" && (
            <AccionesReserva id={r.id} fechaInicio={r.fechaInicio} fechaFin={r.fechaFin} espacioId={r.espacioId} hoy={hoy} pagado={r.montos?.saldo.pagado ?? null} />
          )}
          {r.nota && (
            <section aria-labelledby="nota-titulo" className="flex flex-col gap-2">
              <h2 id="nota-titulo" className="font-heading text-2xl font-bold italic">Nota</h2>
              <p className="whitespace-pre-line">{r.nota}</p>
            </section>
          )}
          {r.montos && <MontosTrabajo trabajoId={r.id} montos={r.montos} cerrado={cancelada || r.estado === "entregado"} hoy={hoy} />}
        </div>
      </div>
    </>
  );
}
