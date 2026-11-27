import Image from "next/image";
import type { DetalleRevision } from "../consultas";
import { NOMBRE_DETALLE } from "../reglas";
import { AbrirFoto } from "@/componentes/panel/abrir-foto";
import { Seccion } from "@/componentes/panel/cabecera-seccion";
import { Insignia } from "@/componentes/panel/insignia";
import type { FotoVisor } from "@/componentes/panel/visor-fotos";

// "Cómo llegó" en la orden (pedido 12; pedido 26): una tarjeta con el resumen del checklist arriba ("11 bien",
// "2 con detalle"), los detalles con su foto (se abre en grande y se pasa a las de los otros detalles, pulido 13.16), las partes en bien plegadas ("El resto, bien") y las
// observaciones de ingreso. Lo ve todo el que trabaja la orden: no hay precios (RN-12).

type Props = { revision: DetalleRevision[]; observaciones: string | null };

export function ComoLlego({ revision, observaciones }: Props) {
  const detalles = revision.filter((d) => d.estado === "detalle");
  const bien = revision.filter((d) => d.estado === "bien");
  const conFoto = detalles.filter((d) => d.foto);
  const fotos: FotoVisor[] = conFoto.map((d) => ({ ...d.foto!, alt: `Foto: ${d.parte}`, leyenda: leyendaDe(d) }));
  return (
    <Seccion
      id="como-llego"
      titulo="Cómo llegó"
      sinRelleno
      accion={
        revision.length > 0 && (
          <span className="flex flex-wrap gap-1.5">
            {bien.length > 0 && <Insignia tono="exito">{bien.length} bien</Insignia>}
            {detalles.length > 0 && <Insignia tono="aviso">{detalles.length} con detalle</Insignia>}
          </span>
        )
      }
    >
      {detalles.length > 0 ? (
        <>
          <ul aria-label="Detalles de ingreso" className="flex flex-col divide-y divide-border border-b border-border">
            {detalles.map((d) => (
              <li key={d.parteId} className="flex items-center gap-3 px-4 py-3">
                {d.foto && (
                  <AbrirFoto fotos={fotos} indice={conFoto.indexOf(d)} titulo="Cómo llegó" etiqueta={`Ver la foto: ${d.parte}`} className="shrink-0 rounded-lg">
                    <Image src={d.foto.miniatura} alt="" width={64} height={64} unoptimized className="size-14 rounded-lg object-cover" />
                  </AbrirFoto>
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
    </Seccion>
  );
}

/** Debajo de la foto en grande: la pieza, el detalle y la nota ("Puerta derecha: Rayón. Raspado en la manija"). */
function leyendaDe(d: DetalleRevision) {
  return `${d.parte}: ${d.tipo ? NOMBRE_DETALLE[d.tipo] : "Detalle"}${d.nota ? `. ${d.nota}` : ""}`;
}
