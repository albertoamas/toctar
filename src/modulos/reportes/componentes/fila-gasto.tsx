import { cn } from "cn";
import { Insignia } from "@/componentes/panel/insignia";
import { fechaCorta, formatearFecha } from "@/lib/fechas";
import { VerComprobante } from "@/modulos/pagos/componentes/ver-comprobante";
import { NOMBRE_METODO } from "@/modulos/pagos/reglas";
import type { GastoEnLista } from "../consultas";
import { bsExacto } from "../reglas";
import { AnularGasto } from "./anular-gasto";

// Pedido 16: un gasto en la lista de Gastos. Como las otras listas del panel (17/11): en la computadora, una fila de
// TablaAcciones (celdasDeGasto y accionesDeGasto); más angosto, su tarjeta (TarjetaGasto). Lo que distingue a un gasto
// es su detalle ("Factura de luz") y su monto: van primero; la categoría, la fecha y cómo se pagó, debajo en gris. Sin
// detalle, la categoría hace de título. Anulado: tachado, con la insignia y el motivo.

/** Lo que se lee de un gasto: "Factura de luz, 417 Bs, del 10/11/2026". */
const descripcionGasto = (g: GastoEnLista) => `${g.detalle || g.categoria}, ${bsExacto(g.monto)}, del ${formatearFecha(g.fecha)}`;

/** El título de un gasto: su detalle o, sin él, su categoría; anulado, tachado y con su insignia. */
function Titulo({ g }: { g: GastoEnLista }) {
  return (
    <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
      <span className={cn("font-semibold", g.anulado && "text-tinta-suave line-through")}>{g.detalle || g.categoria}</span>
      {g.anulado && <Insignia>Anulado</Insignia>}
    </span>
  );
}

const Monto = ({ g }: { g: GastoEnLista }) => <span className={cn("font-semibold whitespace-nowrap tabular-nums", g.anulado && "text-tinta-suave line-through")}>{bsExacto(g.monto)}</span>;

/** Las celdas de la tabla: fecha, el gasto (y por qué se anuló), categoría, cómo se pagó y monto. */
export function celdasDeGasto(g: GastoEnLista, hoy: string): React.ReactNode[] {
  return [
    <span key="f" className="tabular-nums">{fechaCorta(g.fecha, hoy)}</span>,
    <span key="d" className="flex flex-col gap-0.5">
      <Titulo g={g} />
      {g.anulado && <span className="text-sm text-tinta-suave">Motivo: {g.motivoAnulacion}</span>}
    </span>,
    <span key="c" className={cn(g.anulado && "text-tinta-suave")}>{g.detalle ? g.categoria : "—"}</span>,
    <span key="m" className={cn(g.anulado && "text-tinta-suave")}>{NOMBRE_METODO[g.metodo]}</span>,
    <Monto key="s" g={g} />,
  ];
}

/** El comprobante (si tiene) y "⋯" con "Anular gasto" (si no está anulado). */
export function AccionesDeGasto({ g }: { g: GastoEnLista }) {
  return (
    <span className="flex items-center justify-end gap-2">
      {g.comprobante && <VerComprobante foto={g.comprobante} descripcion={descripcionGasto(g)} />}
      {/* Sin "⋯" (anulado), el mismo ancho: los comprobantes quedan en columna */}
      {g.anulado ? <span aria-hidden className="w-9 shrink-0 pointer-coarse:w-11" /> : <AnularGasto id={g.id} descripcion={descripcionGasto(g)} />}
    </span>
  );
}

/**
 * La tarjeta del celular: el gasto y su monto arriba; la categoría, la fecha y cómo se pagó debajo. El comprobante y
 * "⋯", a la derecha en la misma fila (abajo, en su propio renglón como en Saldos, quedaría un renglón casi vacío).
 */
export function TarjetaGasto({ g, hoy }: { g: GastoEnLista; hoy: string }) {
  const debajo = [g.detalle ? g.categoria : null, fechaCorta(g.fecha, hoy), NOMBRE_METODO[g.metodo]].filter(Boolean).join(" · ");
  return (
    <li className="flex items-start gap-2 py-3 pr-2 pl-4">
      <div className="flex min-w-0 flex-1 flex-col gap-1 py-0.5">
        <div className="flex items-start justify-between gap-4">
          <Titulo g={g} />
          <Monto g={g} />
        </div>
        <p className="text-sm text-tinta-suave">{debajo}</p>
        {g.anulado && <p className="text-sm text-tinta-suave">Motivo: {g.motivoAnulacion}</p>}
      </div>
      <div className="-my-1">
        <AccionesDeGasto g={g} />
      </div>
    </li>
  );
}
