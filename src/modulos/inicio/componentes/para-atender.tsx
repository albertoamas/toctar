import Link from "next/link";
import type { Route } from "next";
import { ChevronRightIcon, type LucideIcon } from "lucide-react";

// "Para atender" en el inicio (pedido 26): lo que espera una acción de la persona (un reclamo, una cotización sin
// respuesta, un saldo, los mantenimientos vencidos), cada uno con su acción a la derecha. Toda la fila lleva a donde se
// hace. Vacío, una línea.

export type Pendiente = { href: Route; icono: LucideIcon; titulo: string; detalle: string; accion: string };

export function ParaAtender({ pendientes }: { pendientes: Pendiente[] }) {
  return (
    <section aria-labelledby="atender-titulo" className="tt-tarjeta-panel min-w-0 overflow-hidden">
      <h2 id="atender-titulo" className="tt-titulo-seccion border-b border-border px-4 py-3">
        Para atender
      </h2>
      {pendientes.length === 0 ? (
        <p className="px-4 py-4 text-sm text-tinta-suave">Nada pendiente.</p>
      ) : (
        <ul aria-label="Para atender" className="flex flex-col divide-y divide-border">
          {pendientes.map((p) => (
            <li key={p.href}>
              <Link href={p.href} className="flex min-h-11 items-center gap-3 px-4 py-3 hover:bg-superficie/60 focus-visible:-outline-offset-2">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-aviso-fondo text-aviso">
                  <p.icono className="size-4" aria-hidden />
                </span>
                <span className="flex min-w-0 flex-1 flex-col text-sm">
                  <span className="font-semibold">{p.titulo}</span>
                  <span className="text-tinta-suave">{p.detalle}</span>
                </span>
                <span className="flex shrink-0 items-center gap-0.5 text-sm font-semibold">
                  {p.accion}
                  <ChevronRightIcon className="size-4 text-tinta-suave" aria-hidden />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
