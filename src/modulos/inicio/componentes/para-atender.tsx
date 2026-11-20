import Link from "next/link";
import type { Route } from "next";
import { ChevronRightIcon, type LucideIcon } from "lucide-react";
import { Seccion } from "@/componentes/panel/cabecera-seccion";

// "Para atender" en el inicio (pedido 26): lo que espera una acción de la persona (un reclamo, una cotización sin
// respuesta, un saldo, los mantenimientos vencidos), cada uno con su acción a la derecha. Toda la fila lleva a donde se
// hace. Vacío, una línea. Pulido final (10/11): el título arriba y fuera de su tarjeta, como "Para hoy" y el resto.
// 18/11: una fila por tipo (la arma Inicio). 19/11 (prototipo 4): el ícono en gris (el ámbar en cada fila no decía
// nada) y la acción siempre a la derecha.

export type Pendiente = { href: Route; icono: LucideIcon; titulo: string; detalle: string; accion: string };

export function ParaAtender({ pendientes }: { pendientes: Pendiente[] }) {
  return (
    <Seccion id="atender" titulo="Para atender" sinRelleno className="@container min-w-0">
      {/* Vacío, como "Para hoy" al lado; la lista la nombra el título de la sección */}
      {pendientes.length === 0 ? (
        <p className="px-4 py-6 text-tinta-suave">Nada pendiente.</p>
      ) : (
        <div className="tt-tarjeta-panel overflow-hidden">
          <ul className="flex flex-col divide-y divide-border">
            {pendientes.map((p) => (
              <li key={p.href}>
                <Link href={p.href} className="flex min-h-11 items-center gap-3 px-4 py-3 hover:bg-superficie/60 focus-visible:-outline-offset-2">
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-superficie text-tinta-suave">
                    <p.icono className="size-4" aria-hidden />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5 text-sm">
                    <span className="font-semibold">{p.titulo}</span>
                    <span className="text-tinta-suave">{p.detalle}</span>
                  </span>
                  {/* La acción, siempre a la derecha (19/11): es una palabra, no aprieta el texto */}
                  <span className="flex shrink-0 items-center gap-0.5 text-sm font-semibold">
                    {p.accion}
                    <ChevronRightIcon className="size-4 text-tinta-suave" aria-hidden />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Seccion>
  );
}
