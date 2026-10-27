import type { Metadata } from "next";
import { nombreVehiculo } from "@/modulos/clientes/reglas";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { cn } from "cn";
import { CalendarIcon, FileTextIcon } from "lucide-react";
import { EnlaceVolver } from "@/componentes/enlace-volver";
import { AvisoEnPagina } from "@/componentes/panel/aviso-en-pagina";
import { Cargando } from "@/componentes/panel/cargando";
import { EncabezadoPagina } from "@/componentes/panel/encabezado-pagina";
import { SeccionConEditar } from "@/componentes/panel/seccion-con-editar";
import { IconoWhatsApp } from "@/componentes/sitio/iconos-marca";
import { buttonVariants } from "@/componentes/ui/button";
import { formatearFechaHora } from "@/lib/fechas";
import { puede, puedeVerModulo } from "@/lib/permisos";
import { exigirModulo } from "@/lib/sesion";
import { enlaceWhatsApp, formatearWhatsApp } from "@/lib/whatsapp";
import { ArchivosConsulta } from "@/modulos/consultas/componentes/archivos-consulta";
import { MasConsulta, ReabrirConsulta } from "@/modulos/consultas/componentes/estado-consulta";
import { FormularioNota } from "@/modulos/consultas/componentes/nota-consulta";
import { reservasDeConsulta } from "@/modulos/agenda/consultas";
import { obtenerConsulta } from "@/modulos/consultas/consultas";
import { CotizacionesConsulta } from "@/modulos/cotizaciones/componentes/cotizaciones-consulta";
import { cotizacionesDeConsulta } from "@/modulos/cotizaciones/consultas";
import { INSIGNIA_ESTADO, NOMBRE_CANAL, NOMBRE_ESTADO, NOMBRE_MOTIVO } from "@/modulos/consultas/reglas";

export const metadata: Metadata = { title: "Consulta" };

// HU-24: una consulta, con sus fotos y su nota. HU-28: marcarla como perdida o reabrirla. HU-25: sus cotizaciones; el
// dueño cotiza y corrige, el encargado las ve sin montos (RN-01). Pulido 9.3 (skill pantallas-panel): el paso siguiente
// en el encabezado y "Marcar como perdida" en "Más"; la nota en lectura, editada en un modal.
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
  const esDueno = puede(usuario, "cotizar");
  const puedeAgendar = puedeVerModulo(usuario, "agenda");
  const [c, cotizaciones, reservas] = await Promise.all([
    obtenerConsulta(numero),
    cotizacionesDeConsulta(numero, esDueno),
    puedeAgendar ? reservasDeConsulta(numero) : [],
  ]);
  if (!c) notFound();
  const recienGuardada = typeof cotizada === "string" ? cotizaciones.find((x) => String(x.id) === cotizada) : undefined;
  const verFicha = puedeVerModulo(usuario, "clientes");
  const vehiculo = nombreVehiculo(c);

  // El paso siguiente, uno solo, en el encabezado (skill pantallas-panel, §2 "Ficha"): cotizar una abierta sin cotización
  // (solo el dueño, RN-01), agendar la cotizada (el cliente aceptó: la cotización queda aceptada y la consulta confirmada,
  // RF-36) o reabrir una perdida. Una confirmada ya no cambia: su reserva está en Cotizaciones
  const vigente = cotizaciones.find((x) => x.estado === "enviada");
  const abierta = c.estado === "consulto" || c.estado === "cotizado";
  const principal =
    c.estado === "perdido" ? (
      <ReabrirConsulta id={c.id} />
    ) : puedeAgendar && vigente && c.estado === "cotizado" ? (
      <Link href={`/panel/agenda/nueva?cotizacion=${vigente.id}`} className={cn(buttonVariants())}>
        <CalendarIcon />
        Agendar
      </Link>
    ) : esDueno && abierta && !vigente ? (
      <Link href={`/panel/consultas/${c.id}/cotizar`} className={cn(buttonVariants())}>
        <FileTextIcon />
        Cotizar
      </Link>
    ) : null;

  return (
    <div className="flex max-w-5xl flex-col gap-8">
      <EncabezadoPagina
        titulo={c.cliente}
        estado={<span className={INSIGNIA_ESTADO[c.estado]}>{NOMBRE_ESTADO[c.estado]}</span>}
        accion={
          <div className="flex flex-wrap gap-2">
            {principal}
            <a href={enlaceWhatsApp(c.telefono)} target="_blank" rel="noreferrer" className={cn(buttonVariants({ variant: "outline" }))}>
              <IconoWhatsApp />
              Escribir por WhatsApp
            </a>
            {abierta && <MasConsulta id={c.id} />}
          </div>
        }
      >
        {/* "Perdida: Precio. Le pareció caro." o "Perdida: No respondió." */}
        {c.estado === "perdido" && c.motivoPerdida && `Perdida: ${NOMBRE_MOTIVO[c.motivoPerdida]}.${c.detallePerdida ? ` ${c.detallePerdida}` : ""}`}
      </EncabezadoPagina>
      {creada && <AvisoEnPagina>Consulta registrada. Agrega las fotos que mandó el cliente o las que tomes en el taller.</AvisoEnPagina>}
      {recienGuardada && (
        <AvisoEnPagina>
          {recienGuardada.version === 1 ? `Cotización ${recienGuardada.numero} lista.` : `Versión ${recienGuardada.version} de la cotización ${recienGuardada.numero} lista.`}
          {/* Con el PDF ya generado (por «Generar PDF»), el aviso deja de tener sentido aunque siga en la dirección */}
          {sinpdf && recienGuardada.montos && !recienGuardada.montos.tienePdf && " El PDF no se pudo generar: usa «Generar PDF» en Cotizaciones."}
        </AvisoEnPagina>
      )}

      {/* En la computadora, fotos y nota a la izquierda; datos y cotizaciones a la derecha. En el celular, primero los
          datos y las cotizaciones (el contexto y lo que decide), después fotos y nota */}
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:items-start">
        <div className="flex flex-col gap-10 lg:col-start-2 lg:row-start-1">
          {/* El cliente ya está en el título: acá, su WhatsApp y su ficha */}
          <div className="flex flex-col gap-2 rounded-sm border border-border p-4">
            <dl aria-label="Datos de la consulta" className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-3">
              <dt className="text-tinta-suave">Vehículo</dt>
              <dd className="flex flex-col">
                <span className="font-heading text-xl font-extrabold italic tabular-nums">{c.placa}</span>
                <span className="text-sm text-tinta-suave">{[c.tamano, vehiculo].filter(Boolean).join(", ")}</span>
              </dd>
              <dt className="text-tinta-suave">Servicio</dt>
              <dd>{c.servicio ?? <span className="text-tinta-suave">Todavía no sabe</span>}</dd>
              <dt className="text-tinta-suave">Canal</dt>
              <dd>{NOMBRE_CANAL[c.canal]}</dd>
              <dt className="text-tinta-suave">WhatsApp</dt>
              <dd>{formatearWhatsApp(c.telefono)}</dd>
              <dt className="text-tinta-suave">Registrada</dt>
              <dd className="flex flex-col">
                <span>{formatearFechaHora(c.createdAt)}</span>
                <span className="text-sm text-tinta-suave">por {c.registradaPor}</span>
              </dd>
            </dl>
            {/* El encargado puede tener Consultas sin Clientes: entonces no enlaza a una ficha que no puede abrir */}
            {verFicha && (
              <Link href={`/panel/clientes/${c.clienteId}`} className="inline-flex min-h-11 items-center self-start font-semibold underline">
                Ver ficha del cliente
              </Link>
            )}
          </div>
          <CotizacionesConsulta consultaId={c.id} estado={c.estado} cotizaciones={cotizaciones} esDueno={esDueno} reservas={reservas} verOrdenes={puedeVerModulo(usuario, "ordenes")} />
        </div>

        <div className="flex flex-col gap-10 lg:col-start-1 lg:row-start-1">
          <ArchivosConsulta consultaId={c.id} archivos={c.archivos} />
          <SeccionConEditar
            id="nota"
            titulo="Nota"
            etiquetaEditar="Editar la nota"
            tituloModal="Nota de la consulta"
            lectura={c.nota?.trim() ? <p className="whitespace-pre-line">{c.nota}</p> : <p className="text-tinta-suave">Sin nota.</p>}
          >
            <FormularioNota id={c.id} nota={c.nota} />
          </SeccionConEditar>
        </div>
      </div>
    </div>
  );
}
