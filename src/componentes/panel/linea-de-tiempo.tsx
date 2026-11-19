import type { Route } from "next";
import Link from "next/link";
import { ChevronRightIcon } from "lucide-react";
import { cn } from "cn";
import { buttonVariants } from "@/componentes/ui/button";
import { formatearFecha } from "@/lib/fechas";

// La historia de un cliente o de un vehículo (C7 §5.6, 18/11): sus reservas, órdenes y cotizaciones en una sola lista,
// lo más reciente arriba. Antes eran dos listas aparte (Reservas y Cotizaciones) y había que armar el orden en la cabeza.
// Cada fila: la fecha, qué fue (los servicios), sus insignias (el estado, lo que pide atención), un dato de abajo (la
// placa, el número de la cotización) y, a la derecha, el monto si quien mira lo ve. Toda la fila abre lo suyo. Las
// primeras `corta` y, si hay más, "Ver toda la historia (N)", que es un enlace (la página la arma el servidor).

export type HitoHistoria = {
  clave: string;
  href: string;
  /** El día, YYYY-MM-DD: ordena la lista. */
  fecha: string;
  /** Qué fue: "Pulido y nano cerámico, Pulido de vidrios". */
  titulo: string;
  /** Debajo, en gris: "2345KLM", "Cotización 2026-0015". */
  detalle?: string;
  insignias: React.ReactNode;
  /** A la derecha: "Pagado", "Debe 300 Bs", "450 Bs". Sin él, quien mira no ve montos (RN-12). */
  monto?: React.ReactNode;
  /** Lo que oye el lector de pantalla en el enlace, si el texto de la fila no alcanza. */
  etiqueta?: string;
};

/** Ordena por fecha, la más reciente arriba; el mismo día, en el orden en que llegaron. */
export function ordenarHistoria(hitos: HitoHistoria[]): HitoHistoria[] {
  return hitos.map((h, i) => ({ h, i })).sort((a, b) => (a.h.fecha === b.h.fecha ? a.i - b.i : a.h.fecha < b.h.fecha ? 1 : -1)).map(({ h }) => h);
}

export function LineaDeTiempo(props: {
  hitos: HitoHistoria[];
  /** Cuántas se ven sin "Ver toda la historia"; sin él, todas. */
  corta?: number;
  /** A dónde lleva "Ver toda la historia". */
  verTodo?: Route;
  /** Sin nada que mostrar: "Todavía no tiene trabajos ni cotizaciones." */
  vacio: string;
}) {
  const { hitos, corta, verTodo, vacio } = props;
  if (hitos.length === 0) return <p className="px-4 py-3 text-tinta-suave">{vacio}</p>;
  const visibles = corta ? hitos.slice(0, corta) : hitos;
  return (
    <>
      <ol aria-label="Historia" className="flex flex-col divide-y divide-border">
        {visibles.map((h) => (
          <li key={h.clave}>
            <Link
              href={h.href as Route}
              aria-label={h.etiqueta}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 px-4 py-3 hover:bg-superficie/60 focus-visible:-outline-offset-2 sm:grid-cols-[6.5rem_minmax(0,1fr)_auto_auto]"
            >
              {/* La fecha: en la computadora, su columna; en el celular, arriba, chica */}
              <span className="col-span-2 text-sm text-tinta-suave tabular-nums sm:col-span-1 sm:text-base sm:font-semibold sm:text-tinta">{formatearFecha(h.fecha)}</span>
              <span className="flex min-w-0 flex-col gap-1">
                <span className="font-semibold break-words">{h.titulo}</span>
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  {h.insignias}
                  {h.detalle && <span className="text-sm text-tinta-suave">{h.detalle}</span>}
                </span>
              </span>
              <span className={cn("flex items-center gap-1 justify-self-end", !h.monto && "sm:hidden")}>
                {h.monto && <span className="text-right font-semibold whitespace-nowrap tabular-nums">{h.monto}</span>}
                <ChevronRightIcon className="size-5 shrink-0 text-tinta-suave sm:hidden" aria-hidden />
              </span>
              <ChevronRightIcon className="hidden size-5 shrink-0 text-tinta-suave sm:block" aria-hidden />
            </Link>
          </li>
        ))}
      </ol>
      {corta && verTodo && hitos.length > corta && (
        <div className="border-t border-border p-3">
          <Link href={verTodo} className={buttonVariants({ variant: "ghost" })}>
            Ver toda la historia ({hitos.length})
          </Link>
        </div>
      )}
    </>
  );
}
