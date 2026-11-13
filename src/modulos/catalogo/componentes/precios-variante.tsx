import type { Tamano } from "@/modulos/configuracion/consultas";
import type { VarianteCatalogo } from "../consultas";
import { mostrarMonto, textoDias } from "../reglas";
import { Insignia } from "@/componentes/panel/insignia";

// HU-20: los precios de una variante en lectura, como se consultan casi siempre: una lista de precios en todos los
// tamaños de pantalla (el tamaño a la izquierda y el monto alineado a la derecha, un renglón cada uno), así los montos
// quedan en columna aunque el nombre del tamaño ocupe dos líneas. Sin cargar se resalta (es lo que falta); "Según
// evaluación" se dice con palabras. La negrita, como en la tabla de precios (pulido 13.57): el monto en negrita; el tamaño
// y "Según evaluación", normales y en gris.
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
              <dd className="shrink-0 whitespace-nowrap tabular-nums">
                {monto === undefined ? <Insignia tono="aviso">Sin cargar</Insignia> : monto === null ? <SegunEvaluacion /> : <span className="font-semibold">{mostrarMonto(monto)} Bs</span>}
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

/** "Según evaluación": sin precio fijo, depende de ver el vehículo. Normal y en gris (no es un monto), en la tabla y en la tarjeta. */
export function SegunEvaluacion() {
  return <span className="text-tinta-suave">Según evaluación</span>;
}
