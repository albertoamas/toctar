import { cn } from "cn";
import { ChevronDownIcon, FileTextIcon } from "lucide-react";
import { IconoWhatsApp } from "@/componentes/sitio/iconos-marca";
import { buttonVariants } from "@/componentes/ui/button";
import { fechaConMes, fechaEnBolivia } from "@/lib/fechas";
import type { FilaVersion } from "../consultas/ficha";
import { bs, nombreArchivoPdf, rutaPdf } from "../reglas";
import { MasPdf } from "./compartir-pdf";
import { GenerarPdf } from "./generar-pdf";

// El precio de una cotización (RN-02): la versión que vale (la vigente o la aceptada) con sus servicios, el total, hasta
// cuándo vale, si fue por fotos (RN-03), quién la hizo y su PDF, que se ve, se comparte con el menú del teléfono (HU-27)
// o se descarga. Pedido 47: «Enviar por WhatsApp» (el chat del cliente con el mensaje y el enlace al PDF).
// Recorrido visual del 23/11: el total una sola vez (con un solo servicio, su precio ya es el total); la validez con la
// fecha como en la lista («Vale hasta el 8 dic.»; vencida, en rojo); quién y cuándo, en chico; «Ver PDF» y «⋯» en un
// renglón; y las versiones anteriores plegadas, una por línea, con su PDF (lo que se envió). Sin píldoras.

type Props = {
  consultaId: number;
  versiones: FilaVersion[];
  /** El chat del cliente con el mensaje y el enlace, por versión: solo las que se mandan (valen y tienen PDF). */
  enviar: Map<number, string>;
  /** La versión cuyo «Enviar por WhatsApp» ya está arriba, junto a «Aceptó»: aquí no se repite. */
  enviarArriba?: number | null;
};

export function VersionesCotizacion({ consultaId, versiones, enviar, enviarArriba }: Props) {
  const hoy = fechaEnBolivia();
  // La que vale: la vigente o la aceptada; las demás, las anteriores (reemplazadas)
  const actual = versiones.find((v) => v.estado !== "reemplazada") ?? versiones[0];
  const anteriores = versiones.filter((v) => v !== actual);
  const titulo = (v: FilaVersion) => `Cotización ${v.numero}${v.version > 1 ? `, versión ${v.version}` : ""}`;
  const unSoloServicio = actual.lineas.length === 1 && Number(actual.descuento) === 0;
  const vencida = actual.estado === "enviada" && actual.validaHasta < hoy;
  const ruta = rutaPdf(consultaId, actual.id);
  return (
    // Dentro de la tarjeta de su sección (Seccion «Precio»): sin otra tarjeta adentro
    <div className="flex flex-col">
      <div className="flex flex-col gap-3 p-4 sm:p-5">
        {versiones.length > 1 && <p className="text-sm font-semibold">Versión {actual.version}</p>}
        {/* Lo cotizado, como en el PDF (pedido 26): cada servicio con su opción en gris debajo y su precio */}
        {actual.lineas.length > 0 && (
          <>
            <h3 className="sr-only">Servicios</h3>
            <dl className="flex flex-col divide-y divide-border text-sm">
              {actual.lineas.map((l, i) => (
                <div key={i} className="flex justify-between gap-4 py-2 first:pt-0">
                  <dt className="flex min-w-0 flex-col">
                    {l.servicio}
                    {l.opcion && <span className="text-tinta-suave">{l.opcion}</span>}
                  </dt>
                  {!unSoloServicio && <dd className="shrink-0 tabular-nums">{bs(l.precio)}</dd>}
                </div>
              ))}
              {Number(actual.descuento) > 0 && (
                <div className="flex justify-between gap-4 py-2">
                  <dt className="text-tinta-suave">Descuento</dt>
                  <dd className="shrink-0 tabular-nums">−{bs(actual.descuento)}</dd>
                </div>
              )}
            </dl>
          </>
        )}
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t border-border pt-3">
          <span className="text-sm text-tinta-suave">Total</span>
          <span className="text-2xl font-bold tabular-nums">{bs(actual.total)}</span>
        </div>
        <p className="flex flex-wrap gap-x-3 text-sm">
          {vencida ? (
            <span className="font-semibold text-peligro">Venció el {fechaConMes(actual.validaHasta, hoy)}</span>
          ) : (
            <span>
              <span className="text-tinta-suave">Vale hasta el </span>
              <span className="font-medium">{fechaConMes(actual.validaHasta, hoy)}</span>
            </span>
          )}
          <span className="text-tinta-suave">{actual.esEstimado ? "Por fotos (estimado)" : "En persona"}</span>
        </p>
        <span className="flex flex-wrap items-center gap-2">
          {actual.tienePdf ? (
            <>
              {enviar.has(actual.id) && enviarArriba !== actual.id && (
                <a href={enviar.get(actual.id)} target="_blank" rel="noreferrer" className={cn(buttonVariants({ variant: "outline" }))}>
                  <IconoWhatsApp />
                  Enviar por WhatsApp
                </a>
              )}
              {/* La ruta lleva al enlace firmado; en otra pestaña, para volver a la ficha */}
              <span className="flex items-center gap-1">
                <a href={ruta} target="_blank" rel="noreferrer" className={cn(buttonVariants({ variant: "outline" }))}>
                  <FileTextIcon />
                  Ver PDF
                </a>
                <MasPdf ruta={ruta} nombre={nombreArchivoPdf(actual.numero, actual.version)} titulo={titulo(actual)} conCompartir etiqueta={`Opciones del PDF${versiones.length > 1 ? ` de la versión ${actual.version}` : ""}`} />
              </span>
            </>
          ) : (
            // Sin PDF, se genera: sale de lo copiado al cotizarla
            <GenerarPdf cotizacionId={actual.id} />
          )}
        </span>
        <p className="text-xs text-tinta-suave">
          Hecha el {fechaConMes(fechaEnBolivia(actual.createdAt), hoy)} por {actual.autor}
        </p>
      </div>

      {/* Las anteriores, plegadas: ya no valen, quedan como se enviaron */}
      {anteriores.length > 0 && (
        <details className="group border-t border-border">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-medium hover:bg-fondo-panel sm:px-5 [&::-webkit-details-marker]:hidden">
            <ChevronDownIcon className="size-4 text-tinta-suave group-open:rotate-180" aria-hidden />
            {anteriores.length === 1 ? "Ver la versión anterior" : `Ver las ${anteriores.length} versiones anteriores`}
          </summary>
          <ul aria-label="Versiones anteriores" className="flex flex-col divide-y divide-border border-t border-border">
            {anteriores.map((v) => {
              const rutaV = rutaPdf(consultaId, v.id);
              return (
                <li key={v.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2.5 text-sm text-tinta-suave sm:px-5">
                  <span>
                    <span className="font-medium text-tinta">Versión {v.version}</span> · <span className="tabular-nums">{bs(v.total)}</span> ·{" "}
                    {fechaConMes(fechaEnBolivia(v.createdAt), hoy)}
                  </span>
                  {v.tienePdf ? (
                    <span className="flex items-center gap-1">
                      <a href={rutaV} target="_blank" rel="noreferrer" className={cn(buttonVariants({ variant: "ghost" }))}>
                        <FileTextIcon />
                        Ver PDF
                      </a>
                      <MasPdf ruta={rutaV} nombre={nombreArchivoPdf(v.numero, v.version)} titulo={titulo(v)} conCompartir={false} etiqueta={`Opciones del PDF de la versión ${v.version}`} />
                    </span>
                  ) : (
                    <GenerarPdf cotizacionId={v.id} />
                  )}
                </li>
              );
            })}
          </ul>
        </details>
      )}
    </div>
  );
}
