import { cn } from "cn";
import { formatearFecha } from "@/lib/fechas";
import { VerComprobante } from "@/modulos/pagos/componentes/ver-comprobante";
import { METODO_EN_FRASE } from "@/modulos/pagos/reglas";
import type { GastoEnLista } from "../consultas";
import { bsExacto } from "../reglas";
import { AnularGasto } from "./anular-gasto";

// Pedido 16: un gasto en una lista (la de Gastos y la pestaña Gastos de Reportes), como un pago en la orden.


/** Un gasto: su comprobante (si tiene), qué se pagó y el detalle, la fecha y cómo, y el monto; anulado, tachado. */
export function FilaGasto({ g }: { g: GastoEnLista }) {
  const descripcion = `${g.categoria}, ${bsExacto(g.monto)}, del ${formatearFecha(g.fecha)}`;
  return (
    <li className="flex items-start gap-3 py-3 pr-2 pl-4">
      {g.comprobante && <VerComprobante foto={g.comprobante} descripcion={descripcion} />}
      <div className={cn("flex min-w-0 flex-1 flex-col gap-0.5", g.anulado && "text-tinta-suave")}>
        <span className="flex justify-between gap-4">
          <span className={cn("font-semibold", g.anulado && "line-through")}>{g.categoria}</span>
          <span className={cn("shrink-0 font-semibold whitespace-nowrap tabular-nums", g.anulado && "line-through")}>{bsExacto(g.monto)}</span>
        </span>
        {g.detalle && <span className={cn("text-sm", g.anulado && "line-through")}>{g.detalle}</span>}
        <span className="text-sm text-tinta-suave">
          {formatearFecha(g.fecha)}, {METODO_EN_FRASE[g.metodo]}
        </span>
        {g.anulado && <span className="text-sm text-tinta">Anulado: {g.motivoAnulacion}</span>}
      </div>
      {/* Sin "⋯" (anulado), el mismo ancho: los montos quedan en columna */}
      {g.anulado ? (
        <span aria-hidden className="w-9 shrink-0 pointer-coarse:w-11" />
      ) : (
        <div className="-my-1.5">
          <AnularGasto id={g.id} descripcion={descripcion} />
        </div>
      )}
    </li>
  );
}
