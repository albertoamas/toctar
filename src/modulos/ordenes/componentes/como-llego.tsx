import Image from "next/image";
import type { DetalleRevision } from "../consultas";
import { NOMBRE_DETALLE } from "../reglas";

// "Cómo llegó" en la orden (pedido 12): los detalles del checklist con su foto (se abre en grande), "El resto, bien" (o
// "Todas las partes, bien") y las observaciones de ingreso. Lo ve también el técnico: no hay precios ni teléfonos (RN-12).

type Props = { revision: DetalleRevision[]; observaciones: string | null };

export function ComoLlego({ revision, observaciones }: Props) {
  const detalles = revision.filter((d) => d.estado === "detalle");
  return (
    <section aria-labelledby="como-llego-titulo" className="flex flex-col gap-3">
      <h2 id="como-llego-titulo" className="tt-titulo-seccion">Cómo llegó</h2>
      {detalles.length > 0 ? (
        <>
          <ul aria-label="Detalles de ingreso" className="flex flex-col divide-y divide-border tt-tarjeta-panel">
            {detalles.map((d) => (
              <li key={d.parteId} className="flex items-center gap-3 p-3">
                {d.foto && (
                  <a href={d.foto.url} target="_blank" rel="noreferrer" className="shrink-0" aria-label={`Ver la foto: ${d.parte}`}>
                    <Image src={d.foto.miniatura} alt="" width={64} height={64} unoptimized className="size-16 rounded-sm object-cover" />
                  </a>
                )}
                <span className="flex min-w-0 flex-col">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{d.parte}</span>
                    <span className="tt-estado tt-estado--aviso">{d.tipo && NOMBRE_DETALLE[d.tipo]}</span>
                  </span>
                  {d.nota && <span className="text-sm">{d.nota}</span>}
                </span>
              </li>
            ))}
          </ul>
          <p className="text-tinta-suave">El resto, bien.</p>
        </>
      ) : revision.length > 0 ? (
        <p>Revisada parte por parte: todas bien.</p>
      ) : (
        // Las órdenes recibidas antes del checklist
        <p className="text-tinta-suave">Se recibió sin checklist.</p>
      )}
      {observaciones && <p className="whitespace-pre-line">{observaciones}</p>}
    </section>
  );
}
