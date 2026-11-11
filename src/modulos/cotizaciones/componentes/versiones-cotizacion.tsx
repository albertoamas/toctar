import { cn } from "cn";
import { FileTextIcon } from "lucide-react";
import { MenuMas } from "@/componentes/panel/menu-mas";
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
// Pulido 13.50: cada servicio con su opción en gris debajo (como en la orden) y su precio sin negrita (la negrita, para el
// total); cada versión dice quién la cotizó. La que vale (vigente o aceptada) se comparte y se ve; descargarla, en su
// "⋯". Una reemplazada ya no se manda: solo "Ver PDF", para consultar lo que se envió.

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
            {/* Lo cotizado, como en el PDF (pedido 26): cada servicio con su precio, el descuento si hubo y el total. Las
                reemplazadas, solo con su total: ya no valen */}
            {c.estado !== "reemplazada" && c.lineas.length > 0 && (
              <>
              <h3 className="sr-only">Servicios{varias ? ` de la versión ${c.version}` : ""}</h3>
              <dl className="mb-1 flex flex-col divide-y divide-border text-sm">
                {c.lineas.map((l, i) => (
                  <div key={i} className="flex justify-between gap-4 py-2 first:pt-0">
                    <dt className="flex min-w-0 flex-col">
                      {l.servicio}
                      {l.opcion && <span className="text-tinta-suave">{l.opcion}</span>}
                    </dt>
                    <dd className="shrink-0 tabular-nums">{bs(l.precio)}</dd>
                  </div>
                ))}
                {Number(c.descuento) > 0 && (
                  <div className="flex justify-between gap-4 py-2">
                    <dt className="text-tinta-suave">Descuento</dt>
                    <dd className="shrink-0 tabular-nums">−{bs(c.descuento)}</dd>
                  </div>
                )}
              </dl>
              </>
            )}
            <span className={cn("text-2xl font-bold tabular-nums", c.estado === "reemplazada" ? "text-tinta-suave" : "text-tinta")}>{bs(c.total)}</span>
            <span className="flex flex-wrap gap-x-3 text-sm">
              <span>Válida hasta {formatearFecha(c.validaHasta)}</span>
              <span>{c.esEstimado ? "Por fotos (estimado)" : "En persona"}</span>
            </span>
            <span className="text-sm text-tinta-suave">
              {formatearFechaHora(c.createdAt)}, {c.autor}
            </span>
            <span className="flex flex-wrap gap-2 pt-2">
              {c.tienePdf ? (
                <>
                  {c.estado !== "reemplazada" && (
                    <CompartirPdf ruta={ruta} nombre={nombreArchivoPdf(c.numero, c.version)} titulo={`Cotización ${c.numero}${c.version > 1 ? `, versión ${c.version}` : ""}`} />
                  )}
                  {/* La ruta lleva al enlace firmado; en otra pestaña, para volver a la ficha */}
                  <a href={ruta} target="_blank" rel="noreferrer" className={cn(buttonVariants({ variant: "outline" }))}>
                    <FileTextIcon />
                    Ver PDF
                  </a>
                  {c.estado !== "reemplazada" && (
                    <MenuMas
                      icono
                      etiqueta={`Opciones del PDF${varias ? ` de la versión ${c.version}` : ""}`}
                      acciones={[{ texto: "Descargar PDF", href: `${ruta}?descargar=1`, descarga: true }]}
                    />
                  )}
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
