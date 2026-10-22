import Link from "next/link";
import { cn } from "cn";
import { CalendarIcon, DownloadIcon, FileTextIcon, PencilIcon } from "lucide-react";
import { buttonVariants } from "@/componentes/ui/button";
import type { EstadoConsulta } from "@/db/esquema/consultas";
import type { EstadoCotizacion } from "@/db/esquema/cotizaciones";
import { formatearFecha, formatearFechaHora } from "@/lib/fechas";
import { mostrarMonto } from "@/modulos/catalogo/reglas";
import type { ReservaCorta } from "@/modulos/agenda/consultas";
import type { FilaCotizacion } from "../consultas";
import { nombreArchivoPdf } from "../reglas";
import { CompartirPdf } from "./compartir-pdf";
import { GenerarPdf } from "./generar-pdf";

// HU-25: las cotizaciones de una consulta, de la versión más nueva a la más vieja. El dueño ve montos y validez, y
// cotiza o corrige (nueva versión). El encargado ve que está cotizada y su número, sin montos ni PDF (RN-01).
// HU-26: cada versión tiene su PDF, que se ve o se descarga; también el de una reemplazada, tal como se envió.
// HU-27: y se comparte con el menú del teléfono.

const NOMBRE: Record<EstadoCotizacion, string> = { enviada: "Vigente", reemplazada: "Reemplazada", aceptada: "Aceptada" };
const INSIGNIA: Record<EstadoCotizacion, string> = {
  enviada: "tt-insignia tt-insignia--exito",
  reemplazada: "tt-insignia",
  aceptada: "tt-insignia tt-insignia--exito",
};

type Props = {
  consultaId: number;
  estado: EstadoConsulta;
  cotizaciones: FilaCotizacion[];
  esDueno: boolean;
  /** Con "Agenda": agendar la vigente (HU-30). */
  puedeAgendar: boolean;
  /** Las reservas que salieron de esta consulta. */
  reservas: ReservaCorta[];
};

export function CotizacionesConsulta({ consultaId, estado, cotizaciones, esDueno, puedeAgendar, reservas }: Props) {
  const vigente = cotizaciones.find((c) => c.estado === "enviada");
  // Se cotiza una consulta abierta; una perdida se reabre primero y una confirmada ya no cambia
  const abierta = estado === "consulto" || estado === "cotizado";

  return (
    <section aria-labelledby="cotizaciones-titulo" className="flex flex-col gap-4">
      <h2 id="cotizaciones-titulo" className="font-heading text-2xl font-bold italic">Cotizaciones</h2>
      {cotizaciones.length === 0 ? (
        <p className="text-tinta-suave">{esDueno ? "Todavía no se cotizó." : "Todavía no se cotizó: la cotiza el dueño."}</p>
      ) : (
        <ul aria-label="Cotizaciones" className="flex flex-col divide-y divide-border rounded-sm border border-border">
          {cotizaciones.map((c) => (
            <li key={c.id} className={cn("flex flex-col gap-1 p-3", c.estado === "reemplazada" && "text-tinta-suave")}>
              <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-semibold">{c.numero}</span>
                {c.version > 1 && <span>versión {c.version}</span>}
                <span className={INSIGNIA[c.estado]}>{NOMBRE[c.estado]}</span>
              </span>
              {c.montos && (
                <span className="flex flex-wrap gap-x-3 text-sm">
                  <span className="font-semibold text-tinta">{mostrarMonto(c.montos.total)} Bs</span>
                  <span>Válida hasta {formatearFecha(c.montos.validaHasta)}</span>
                  {c.montos.esEstimado && <span>Estimado por fotos</span>}
                </span>
              )}
              <span className="text-sm text-tinta-suave">{formatearFechaHora(c.createdAt)}</span>
              {c.montos && (
                <span className="flex flex-wrap gap-2 pt-1">
                  {c.montos.tienePdf ? (
                    <>
                      {/* La ruta lleva al enlace firmado; en otra pestaña, para volver a la consulta */}
                      <a href={`/panel/cotizaciones/${c.id}/pdf`} target="_blank" rel="noreferrer" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
                        <FileTextIcon />
                        Ver PDF
                      </a>
                      <CompartirPdf cotizacionId={c.id} nombre={nombreArchivoPdf(c.numero, c.version)} titulo={`Cotización ${c.numero}${c.version > 1 ? `, versión ${c.version}` : ""}`} />
                      <a href={`/panel/cotizaciones/${c.id}/pdf?descargar=1`} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
                        <DownloadIcon />
                        Descargar
                      </a>
                    </>
                  ) : (
                    // Cualquier versión sin PDF lo puede generar: sale de lo copiado al cotizarla
                    <GenerarPdf cotizacionId={c.id} />
                  )}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
      {reservas.length > 0 && (
        <ul aria-label="Reservas" className="flex flex-col gap-2">
          {reservas.map((r) => (
            <li key={r.id}>
              <Link href={`/panel/agenda/${r.id}`} className="inline-flex min-h-11 items-center gap-2 font-semibold underline">
                <CalendarIcon className="size-4" aria-hidden />
                {r.estado === "cancelado" ? "Reserva cancelada" : "Reserva"} del {formatearFecha(r.fechaInicio).slice(0, 5)} en {r.espacio}
              </Link>
            </li>
          ))}
        </ul>
      )}
      {(esDueno && abierta) || (puedeAgendar && vigente && estado === "cotizado") ? (
        <div className="flex flex-wrap gap-2">
          {/* El cliente aceptó: agendar deja la cotización aceptada y la consulta confirmada (RF-36) */}
          {puedeAgendar && vigente && estado === "cotizado" && (
            <Link href={`/panel/agenda/nueva?cotizacion=${vigente.id}`} className={cn(buttonVariants())}>
              <CalendarIcon />
              Agendar
            </Link>
          )}
          {esDueno && abierta && (vigente ? (
            <Link href={`/panel/consultas/${consultaId}/cotizar?desde=${vigente.id}`} className={cn(buttonVariants({ variant: "outline" }))}>
              <PencilIcon />
              Corregir (nueva versión)
            </Link>
          ) : (
            <Link href={`/panel/consultas/${consultaId}/cotizar`} className={cn(buttonVariants())}>
              <FileTextIcon />
              Cotizar
            </Link>
          ))}
        </div>
      ) : null}
    </section>
  );
}
