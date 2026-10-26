import type { Tamano } from "@/modulos/configuracion/consultas";
import type { VarianteCatalogo } from "../consultas";
import { mostrarMonto, textoDias } from "../reglas";

// HU-20: los precios de una variante en lectura, como se consultan casi siempre: una lista de precios en todos los
// tamaños de pantalla (el tamaño a la izquierda y el monto alineado a la derecha, un renglón cada uno), así los montos
// quedan en columna aunque el nombre del tamaño ocupe dos líneas. Sin cargar se resalta (es lo que falta); "Según
// evaluación" se dice con palabras.
// Se editan con "Editar" (FormularioPrecios).

export function PreciosVariante({ variante: v, tamanos, duracionServicio }: { variante: VarianteCatalogo; tamanos: Tamano[]; duracionServicio: number }) {
  return (
    <div className="flex flex-col gap-3">
      <dl className="flex flex-col divide-y divide-border">
        {tamanos.map((t) => {
          const monto = v.precios[t.id];
          return (
            <div key={t.id} className="flex min-w-0 items-baseline justify-between gap-4 py-2">
              <dt className="text-sm text-tinta-suave">{t.nombre}</dt>
              <dd className="shrink-0 font-semibold whitespace-nowrap tabular-nums">
                {monto === undefined ? <span className="tt-insignia tt-insignia--aviso">Sin cargar</span> : monto === null ? "Según evaluación" : `${mostrarMonto(monto)} Bs`}
              </dd>
            </div>
          );
        })}
      </dl>
      {/* Solo si es distinta: la del servicio ya está en sus datos */}
      {v.duracionDias !== null && v.duracionDias !== duracionServicio && (
        <p className="text-sm text-tinta-suave">Ocupa {textoDias(v.duracionDias)}.</p>
      )}
    </div>
  );
}
