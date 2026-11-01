import Image from "next/image";
import type { DetalleRevision } from "../consultas";
import { NOMBRE_DETALLE } from "../reglas";

// "Cómo llegó" en la orden (pedido 12): los detalles del checklist con su foto (se abre en grande), "El resto, bien" y
// las observaciones de ingreso. Lo ve también el técnico: no hay precios ni teléfonos (RN-12).

type Props = { detalles: DetalleRevision[]; observaciones: string | null };

export function ComoLlego({ detalles, observaciones }: Props) {
  return (
    <section aria-labelledby="como-llego-titulo" className="flex flex-col gap-3">
      <h2 id="como-llego-titulo" className="font-heading text-2xl font-bold italic">Cómo llegó</h2>
      {detalles.length > 0 ? (
        <>
          <ul aria-label="Detalles de ingreso" className="flex flex-col divide-y divide-border rounded-sm border border-border">
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
                    <span className="tt-insignia tt-insignia--aviso">{NOMBRE_DETALLE[d.tipo]}</span>
                  </span>
                  {d.nota && <span className="text-sm">{d.nota}</span>}
                </span>
              </li>
            ))}
          </ul>
          <p className="text-tinta-suave">El resto, bien.</p>
        </>
      ) : (
        <p className="text-tinta-suave">Sin detalles marcados al recibir.</p>
      )}
      {observaciones && <p className="whitespace-pre-line">{observaciones}</p>}
    </section>
  );
}
