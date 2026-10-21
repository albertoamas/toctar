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
import { formatearFechaHora } from "@/lib/fechas";
import { puedeVerModulo } from "@/lib/permisos";
import { exigirModulo } from "@/lib/sesion";
import { enlaceWhatsApp, formatearWhatsApp } from "@/lib/whatsapp";
import { ArchivosConsulta } from "@/modulos/consultas/componentes/archivos-consulta";
import { EstadoConsulta } from "@/modulos/consultas/componentes/estado-consulta";
import { NotaConsulta } from "@/modulos/consultas/componentes/nota-consulta";
import { obtenerConsulta } from "@/modulos/consultas/consultas";
import { CotizacionesConsulta } from "@/modulos/cotizaciones/componentes/cotizaciones-consulta";
import { cotizacionesDeConsulta } from "@/modulos/cotizaciones/consultas";
import { INSIGNIA_ESTADO, NOMBRE_CANAL, NOMBRE_ESTADO } from "@/modulos/consultas/reglas";

export const metadata: Metadata = { title: "Consulta" };

// HU-24: una consulta, con sus fotos y su nota. HU-28: marcarla como perdida o reabrirla. HU-25: sus cotizaciones; el
// dueño cotiza y corrige, el encargado las ve sin montos (RN-01).
export default function PaginaConsulta({ params, searchParams }: PageProps<"/panel/consultas/[id]">) {
  return (
    <section className="flex flex-col gap-6">
      <EnlaceVolver href="/panel/consultas">Consultas</EnlaceVolver>
      <Suspense fallback={<Cargando />}>
        <Detalle params={params} searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

async function Detalle({ params, searchParams }: Pick<PageProps<"/panel/consultas/[id]">, "params" | "searchParams">) {
  const usuario = await exigirModulo("consultas");
  const [{ id }, { creada, cotizada, sinpdf }] = await Promise.all([params, searchParams]);
  const numero = Number(id);
  if (!Number.isInteger(numero) || numero <= 0) notFound();
  const esDueno = puedeVerModulo(usuario, "cotizaciones");
  const [c, cotizaciones] = await Promise.all([obtenerConsulta(numero), cotizacionesDeConsulta(numero, esDueno)]);
  if (!c) notFound();
  const recienGuardada = typeof cotizada === "string" ? cotizaciones.find((x) => String(x.id) === cotizada) : undefined;
  // El encargado puede tener Consultas sin Clientes: entonces el nombre no enlaza a una ficha que no puede abrir
  const verFicha = puedeVerModulo(usuario, "clientes");
  const vehiculo = [c.marca, c.modelo].filter(Boolean).join(" ");

  return (
    <>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-4">
        <h1 className="font-heading text-4xl font-extrabold italic">{c.cliente}</h1>
        <span className={INSIGNIA_ESTADO[c.estado]}>{NOMBRE_ESTADO[c.estado]}</span>
        <a href={enlaceWhatsApp(c.telefono)} target="_blank" rel="noreferrer" className={cn(buttonVariants({ variant: "outline" }), "sm:ml-auto")}>
          <IconoWhatsApp />
          Escribir por WhatsApp
        </a>
      </div>
      {creada && <AvisoEnPagina>Consulta registrada. Agrega las fotos que mandó el cliente o las que tomes en el taller.</AvisoEnPagina>}
      {recienGuardada && (
        <AvisoEnPagina>
          {recienGuardada.version === 1 ? `Cotización ${recienGuardada.numero} lista.` : `Versión ${recienGuardada.version} de la cotización ${recienGuardada.numero} lista.`}
          {/* Con el PDF ya generado (por «Generar PDF»), el aviso deja de tener sentido aunque siga en la dirección */}
          {sinpdf && recienGuardada.montos && !recienGuardada.montos.tienePdf && " El PDF no se pudo generar: usa «Generar PDF» en Cotizaciones."}
        </AvisoEnPagina>
      )}

      <div className="grid max-w-5xl gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:items-start">
        <div className="flex flex-col gap-10 lg:col-start-2 lg:row-start-1">
          <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-3 rounded-sm border border-border p-4 text-sm">
            <dt className="text-tinta-suave">Cliente</dt>
            <dd className="flex flex-col">
              {verFicha ? (
                <Link href={`/panel/clientes/${c.clienteId}`} className="font-semibold underline">
                  {c.cliente}
                </Link>
              ) : (
                <span className="font-semibold">{c.cliente}</span>
              )}
              <span className="text-tinta-suave">{formatearWhatsApp(c.telefono)}</span>
            </dd>
            <dt className="text-tinta-suave">Vehículo</dt>
            <dd className="flex flex-col">
              <span className="font-semibold">{c.placa}</span>
              <span className="text-tinta-suave">{[c.tamano, vehiculo].filter(Boolean).join(", ")}</span>
            </dd>
            <dt className="text-tinta-suave">Servicio</dt>
            <dd>{c.servicio ?? <span className="text-tinta-suave">Todavía no sabe</span>}</dd>
            <dt className="text-tinta-suave">Canal</dt>
            <dd>{NOMBRE_CANAL[c.canal]}</dd>
            <dt className="text-tinta-suave">Registrada</dt>
            <dd className="flex flex-col">
              <span>{formatearFechaHora(c.createdAt)}</span>
              <span className="text-tinta-suave">por {c.registradaPor}</span>
            </dd>
          </dl>
          <CotizacionesConsulta consultaId={c.id} estado={c.estado} cotizaciones={cotizaciones} esDueno={esDueno} />
        </div>

        <div className="flex flex-col gap-10 lg:col-start-1 lg:row-start-1">
          <ArchivosConsulta consultaId={c.id} archivos={c.archivos} />
          <NotaConsulta id={c.id} nota={c.nota} />
          <EstadoConsulta id={c.id} estado={c.estado} motivo={c.motivoPerdida} detalle={c.detallePerdida} />
        </div>
      </div>
    </>
  );
}
