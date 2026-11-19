import type { Route } from "next";
import Link from "next/link";
import { ChevronRightIcon } from "lucide-react";
import { cn } from "cn";
import { buttonVariants } from "@/componentes/ui/button";
import { fechaCorta } from "@/lib/fechas";

// La historia de un cliente o de un vehículo (C7 §5.6, 18/11, como el prototipo v3): sus reservas, órdenes y
// cotizaciones en una línea de tiempo, lo más reciente arriba (con su punto en rojo). Antes eran dos listas aparte
// (Reservas y Cotizaciones) y había que armar el orden en la cabeza.
// Cada fila: qué es ("Orden", "Cotización 2026-0055") con su estado al lado; debajo, en gris, la placa, los servicios y
// la fecha; a la derecha, el monto si quien mira lo ve (RN-12). Toda la fila abre lo suyo. Las primeras `corta` y, si
// hay más, "Ver toda la historia (N)", que es un enlace (la página la arma el servidor).

export type HitoHistoria = {
  clave: string;
  href: string;
  /** El día, YYYY-MM-DD: ordena la lista y se muestra corto ("2/11"). */
  fecha: string;
  /** Qué es: "Orden", "Reserva", "Cotización 2026-0055". */
  titulo: string;
  /** Al lado del título: el estado y lo que pide atención. */
  insignias: React.ReactNode;
  /** Debajo, la placa marcada (en la ficha del cliente: puede tener varios vehículos). */
  placa?: string;
  /** Debajo, en gris, separados por " · ": los servicios, "Con Ana", el motivo de una rechazada. */
  partes: string[];
  /** A la derecha: "1.200 Bs". Sin él, quien mira no ve montos (RN-12). */
  monto?: string;
};

/** Ordena por fecha, la más reciente arriba; el mismo día, en el orden en que llegaron. */
export function ordenarHistoria(hitos: HitoHistoria[]): HitoHistoria[] {
  return hitos
    .map((h, i) => ({ h, i }))
    .sort((a, b) => (a.h.fecha === b.h.fecha ? a.i - b.i : a.h.fecha < b.h.fecha ? 1 : -1))
    .map(({ h }) => h);
}

export function LineaDeTiempo(props: {
  hitos: HitoHistoria[];
  hoy: string;
  /** Cuántas se ven sin "Ver toda la historia"; sin él, todas. */
  corta?: number;
  /** A dónde lleva "Ver toda la historia". */
  verTodo?: Route;
  /** Sin nada que mostrar: "Todavía no tiene trabajos ni cotizaciones." */
  vacio: string;
}) {
  const { hitos, hoy, corta, verTodo, vacio } = props;
  if (hitos.length === 0) return <p className="px-4 py-3 text-tinta-suave">{vacio}</p>;
  const visibles = corta ? hitos.slice(0, corta) : hitos;
  return (
    <>
      <ol aria-label="Historia" className="flex flex-col divide-y divide-border">
        {visibles.map((h, i) => (
          <li key={h.clave}>
            <Link href={h.href as Route} className="grid grid-cols-[0.625rem_minmax(0,1fr)_auto] gap-x-3 px-4 py-3 hover:bg-superficie/60 focus-visible:-outline-offset-2">
              {/* El punto de la línea de tiempo: rojo el más reciente */}
              <span aria-hidden className={cn("mt-1.5 size-2.5 rounded-full", i === 0 ? "bg-rojo" : "bg-input")} />
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1 font-semibold">
                  {h.titulo}
                  {h.insignias}
                </span>
                <span className="text-sm text-tinta-suave">
                  {h.placa && (
                    <>
                      <span className="tt-placa text-tinta">{h.placa}</span>
                      {" · "}
                    </>
                  )}
                  {[...h.partes, fechaCorta(h.fecha, hoy)].join(" · ")}
                </span>
              </span>
              <span className="flex items-start gap-1">
                {h.monto && <span className="font-semibold whitespace-nowrap tabular-nums">{h.monto}</span>}
                <ChevronRightIcon className="size-5 shrink-0 text-tinta-suave" aria-hidden />
              </span>
            </Link>
          </li>
        ))}
      </ol>
      {corta && verTodo && hitos.length > corta && (
        <div className="border-t border-border p-3">
          <Link href={verTodo} className={buttonVariants({ variant: "accion" })}>
            Ver toda la historia ({hitos.length})
          </Link>
        </div>
      )}
    </>
  );
}
