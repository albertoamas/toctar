import Image from "next/image";
import type { DetalleRevision } from "../consultas";
import { NOMBRE_DETALLE } from "../reglas";
import { Insignia } from "@/componentes/panel/insignia";

// "Cómo llegó" en la orden (pedido 12; pedido 26): una tarjeta con el resumen del checklist arriba ("11 bien",
// "2 con detalle"), los detalles con su foto (se abre en grande), las partes en bien plegadas ("El resto, bien") y las
// observaciones de ingreso. Lo ve también el técnico: no hay precios ni teléfonos (RN-12).

type Props = { revision: DetalleRevision[]; observaciones: string | null };

export function ComoLlego({ revision, observaciones }: Props) {
  const detalles = revision.filter((d) => d.estado === "detalle");
  const bien = revision.filter((d) => d.estado === "bien");
  return (
    <section aria-labelledby="como-llego-titulo" className="tt-tarjeta-panel overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
        <h2 id="como-llego-titulo" className="tt-titulo-seccion">
          Cómo llegó
        </h2>
        {revision.length > 0 && (
          <span className="flex flex-wrap gap-1.5">
            {bien.length > 0 && <Insignia tono="exito">{bien.length} bien</Insignia>}
            {detalles.length > 0 && <Insignia tono="aviso">{detalles.length} con detalle</Insignia>}
          </span>
        )}
      </div>
      {detalles.length > 0 ? (
        <>
          <ul aria-label="Detalles de ingreso" className="flex flex-col divide-y divide-border border-b border-border">
            {detalles.map((d) => (
              <li key={d.parteId} className="flex items-center gap-3 px-4 py-3">
                {d.foto && (
                  <a href={d.foto.url} target="_blank" rel="noreferrer" className="shrink-0" aria-label={`Ver la foto: ${d.parte}`}>
                    <Image src={d.foto.miniatura} alt="" width={64} height={64} unoptimized className="size-14 rounded-lg object-cover" />
                  </a>
                )}
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{d.parte}</span>
                    <Insignia tono="aviso">{d.tipo && NOMBRE_DETALLE[d.tipo]}</Insignia>
                  </span>
                  {d.nota && <span className="text-sm text-tinta-suave">{d.nota}</span>}
                </span>
              </li>
            ))}
          </ul>
          {bien.length > 0 && (
            <details className="group border-b border-border px-4 py-3 text-sm last:border-b-0">
              <summary className="cursor-pointer font-semibold text-tinta-suave hover:text-tinta">
                El resto, bien. <span className="font-normal">Ver {bien.length === 1 ? "cuál" : `las ${bien.length} partes`}</span>
              </summary>
              <p className="mt-2 text-tinta-suave">{bien.map((d) => d.parte).join(", ")}.</p>
            </details>
          )}
        </>
      ) : revision.length > 0 ? (
        <p className="border-b border-border px-4 py-3 last:border-b-0">Revisada parte por parte: todas bien.</p>
      ) : (
        // Las órdenes recibidas antes del checklist
        <p className="border-b border-border px-4 py-3 text-tinta-suave last:border-b-0">Se recibió sin checklist.</p>
      )}
      {observaciones && (
        <div className="flex flex-col gap-0.5 px-4 py-3 text-sm">
          <span className="text-xs font-semibold text-tinta-suave">Observaciones</span>
          <p className="whitespace-pre-line">{observaciones}</p>
        </div>
      )}
    </section>
  );
}
