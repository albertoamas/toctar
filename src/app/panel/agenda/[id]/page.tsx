import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { cn } from "cn";
import { EnlaceVolver } from "@/componentes/enlace-volver";
import { AvisoEnPagina } from "@/componentes/panel/aviso-en-pagina";
import { Cargando } from "@/componentes/panel/cargando";
import { IconoWhatsApp } from "@/componentes/sitio/iconos-marca";
import { buttonVariants } from "@/componentes/ui/button";
import { fechaEnBolivia, formatearFecha, formatearFechaHora } from "@/lib/fechas";
import { puedeVerModulo } from "@/lib/permisos";
import { exigirModulo } from "@/lib/sesion";
import { enlaceWhatsApp, formatearWhatsApp } from "@/lib/whatsapp";
import { mostrarMonto } from "@/modulos/catalogo/reglas";
import { AccionesReserva } from "@/modulos/agenda/componentes/acciones-reserva";
import { obtenerReserva } from "@/modulos/agenda/consultas";
import { NOMBRE_ESTADO_TRABAJO } from "@/modulos/agenda/reglas";
import { METODO_EN_FRASE, NOMBRE_TIPO_PAGO } from "@/modulos/pagos/reglas";

export const metadata: Metadata = { title: "Reserva" };

// HU-30: una reserva. Con "Pagos" (o el dueño), sus servicios, el total, lo pagado y el saldo. HU-31: reprogramarla o
// cancelarla mientras está agendada. Registrar y anular pagos llegan con HU-32.
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

const bs = (monto: string) => `${mostrarMonto(monto)} Bs`;

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
          {r.estado === "agendado" && (
            <AccionesReserva id={r.id} fechaInicio={r.fechaInicio} fechaFin={r.fechaFin} espacioId={r.espacioId} hoy={fechaEnBolivia()} pagado={r.montos?.saldo.pagado ?? null} />
          )}
          {r.nota && (
            <section aria-labelledby="nota-titulo" className="flex flex-col gap-2">
              <h2 id="nota-titulo" className="font-heading text-2xl font-bold italic">Nota</h2>
              <p className="whitespace-pre-line">{r.nota}</p>
            </section>
          )}
          {r.montos && (
            <>
              <section aria-labelledby="servicios-titulo" className="flex flex-col gap-3">
                <h2 id="servicios-titulo" className="font-heading text-2xl font-bold italic">Servicios</h2>
                <ul className="flex flex-col divide-y divide-border rounded-sm border border-border">
                  {r.montos.lineas.map((l, i) => (
                    <li key={i} className="flex justify-between gap-4 p-3">
                      <span>{l.descripcion}</span>
                      <span className="tabular-nums">{bs(l.precio)}</span>
                    </li>
                  ))}
                </ul>
                <dl className="grid max-w-sm grid-cols-[1fr_auto] gap-x-6 gap-y-1">
                  {r.montos.descuento !== "0.00" && (
                    <>
                      <dt className="text-tinta-suave">Descuento</dt>
                      <dd className="text-right tabular-nums">− {bs(r.montos.descuento)}</dd>
                    </>
                  )}
                  <dt className="font-semibold">Total</dt>
                  <dd className="text-right font-semibold tabular-nums">{bs(r.montos.saldo.total)}</dd>
                  <dt className="text-tinta-suave">Pagado</dt>
                  <dd className="text-right tabular-nums">{bs(r.montos.saldo.pagado)}</dd>
                  <dt className="font-semibold">Saldo</dt>
                  <dd className="text-right text-lg font-bold tabular-nums">{bs(r.montos.saldo.saldo)}</dd>
                </dl>
              </section>
              <section aria-labelledby="pagos-titulo" className="flex flex-col gap-3">
                <h2 id="pagos-titulo" className="font-heading text-2xl font-bold italic">Pagos</h2>
                {r.montos.pagos.length === 0 ? (
                  <p className="text-tinta-suave">Sin adelanto.</p>
                ) : (
                  <ul aria-label="Pagos" className="flex flex-col divide-y divide-border rounded-sm border border-border">
                    {r.montos.pagos.map((p) => (
                      <li key={p.id} className={cn("flex flex-col gap-0.5 p-3", p.anulado && "text-tinta-suave")}>
                        <span className="flex justify-between gap-4">
                          <span className={cn("font-semibold", p.anulado && "line-through")}>
                            {NOMBRE_TIPO_PAGO[p.tipo]} {METODO_EN_FRASE[p.metodo]}
                          </span>
                          <span className={cn("tabular-nums", p.anulado && "line-through")}>{bs(p.monto)}</span>
                        </span>
                        <span className="text-sm text-tinta-suave">
                          {formatearFecha(p.fecha)}, registrado por {p.registradoPor}
                        </span>
                        {p.anulado && <span className="text-sm">Anulado: {p.motivoAnulacion}</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </>
  );
}
