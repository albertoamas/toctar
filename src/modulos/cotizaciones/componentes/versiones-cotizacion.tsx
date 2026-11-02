import { cn } from "cn";
import { DownloadIcon, FileTextIcon } from "lucide-react";
import { buttonVariants } from "@/componentes/ui/button";
import type { EstadoCotizacion } from "@/db/esquema/cotizaciones";
import { formatearFecha, formatearFechaHora } from "@/lib/fechas";
import type { FilaVersion } from "../consultas";
import { bs, nombreArchivoPdf, rutaPdf } from "../reglas";
import { CompartirPdf } from "./compartir-pdf";
import { GenerarPdf } from "./generar-pdf";

// Las versiones de una cotización, de la más nueva a la más vieja (RN-02): cada una con su total, su validez, si fue
// por fotos (RN-03) y su PDF, que se ve, se comparte con el menú del teléfono (HU-27) o se descarga. La reemplazada
// queda tal como se envió, en tinta suave.

const NOMBRE: Record<EstadoCotizacion, string> = { enviada: "Vigente", reemplazada: "Reemplazada", aceptada: "Aceptada" };
const INSIGNIA: Record<EstadoCotizacion, string> = {
  enviada: "tt-estado tt-estado--exito",
  reemplazada: "tt-estado",
  aceptada: "tt-estado tt-estado--exito",
};

export function VersionesCotizacion({ consultaId, versiones }: { consultaId: number; versiones: FilaVersion[] }) {
  // Con una sola versión, su nombre no aporta: es "la cotización"
  const varias = versiones.length > 1;
  return (
    <ul aria-label="Versiones" className="flex flex-col divide-y divide-border tt-tarjeta-panel">
      {versiones.map((c) => {
        const ruta = rutaPdf(consultaId, c.id);
        return (
          <li key={c.id} className={cn("flex flex-col gap-1 p-4", c.estado === "reemplazada" && "text-tinta-suave")}>
            {varias && (
              <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-semibold">Versión {c.version}</span>
                <span className={INSIGNIA[c.estado]}>{NOMBRE[c.estado]}</span>
              </span>
            )}
            <span className={cn("text-2xl font-bold tabular-nums", c.estado === "reemplazada" ? "text-tinta-suave" : "text-tinta")}>{bs(c.total)}</span>
            <span className="flex flex-wrap gap-x-3 text-sm">
              <span>Válida hasta {formatearFecha(c.validaHasta)}</span>
              <span>{c.esEstimado ? "Por fotos (estimado)" : "En persona"}</span>
            </span>
            <span className="text-sm text-tinta-suave">{formatearFechaHora(c.createdAt)}</span>
            <span className="flex flex-wrap gap-2 pt-2">
              {c.tienePdf ? (
                <>
                  {/* La ruta lleva al enlace firmado; en otra pestaña, para volver a la ficha */}
                  <a href={ruta} target="_blank" rel="noreferrer" className={cn(buttonVariants({ variant: "outline" }))}>
                    <FileTextIcon />
                    Ver PDF
                  </a>
                  <CompartirPdf ruta={ruta} nombre={nombreArchivoPdf(c.numero, c.version)} titulo={`Cotización ${c.numero}${c.version > 1 ? `, versión ${c.version}` : ""}`} />
                  <a href={`${ruta}?descargar=1`} className={cn(buttonVariants({ variant: "outline" }))}>
                    <DownloadIcon />
                    Descargar
                  </a>
                </>
              ) : (
                // Cualquier versión sin PDF lo puede generar: sale de lo copiado al cotizarla
                <GenerarPdf cotizacionId={c.id} />
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
