"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "cn";
import { direccion, useDestinoPendiente } from "./navegacion-pendiente";

// Pestañas de un módulo del panel. Cada pestaña tiene su ruta, para poder enlazarla. La activa, subrayada en tinta: el
// rojo es del botón principal y del menú (pedido 26). Barra de las listas (10/11): la cuenta, en gris después del nombre
// ("Pendientes 1"), igual en todas (antes, "(1)" en unas y nada en otras); y al cambiar de pestaña sigue lo buscado.

export type Pestana = { href: string; texto: string; cuenta?: number };

/** `activa`: el href de la pestaña elegida, cuando las pestañas cambian la búsqueda (?vista=) y no la ruta. */
export function Pestanas(props: {
  etiqueta: string;
  pestanas: Pestana[];
  activa?: string;
  /** Lo buscado sigue al cambiar de pestaña: solo si todas buscan lo mismo (no en Órdenes, donde "Entregadas" busca fechas). */
  conservarBusqueda?: boolean;
}) {
  const { etiqueta, pestanas, activa: elegida, conservarBusqueda = false } = props;
  const ruta = usePathname();
  const busqueda = useSearchParams().get("q");
  const q = conservarBusqueda ? busqueda : null;
  // Lo buscado sigue al cambiar de vista (el buscador lo sigue mostrando)
  const conBusqueda = (href: string) => {
    if (!q?.trim()) return href;
    const [camino, consulta = ""] = href.split("?");
    const p = new URLSearchParams(consulta);
    p.set("q", q);
    return `${camino}?${p.toString()}`;
  };
  // La pestaña tocada se marca al instante, sin esperar al servidor (NavegacionPendiente, 17/11)
  const destino = useDestinoPendiente();
  const tocada = destino ? pestanas.find((p) => direccion(conBusqueda(p.href)) === destino) : undefined;
  return (
    <nav aria-label={etiqueta} className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
      {/* En el celular, cada una con su parte del ancho y el número debajo del nombre: entran todas a 390 px sin
          deslizar (C7 fase 3: la última de Cotizaciones se cortaba y no se notaba que había más) */}
      <ul className="flex gap-2 border-b border-border sm:min-w-max sm:gap-6">
        {pestanas.map((p) => {
          const activa = tocada ? p === tocada : elegida !== undefined ? elegida === p.href : ruta === p.href;
          return (
            <li key={p.href} className="min-w-0 flex-1 sm:flex-none">
              <Link
                href={conBusqueda(p.href)}
                aria-current={activa ? "page" : undefined}
                className={cn(
                  "-mb-px flex h-full flex-col items-center justify-end border-b-2 border-transparent px-0.5 py-2.5 text-center text-sm font-semibold text-tinta-suave hover:text-tinta sm:block sm:px-1 sm:py-3 sm:text-left",
                  activa && "border-tinta text-tinta",
                )}
              >
                {p.texto}
                {/* Con su espacio: el lector oye "Pendientes 1" y no "Pendientes1" */}
                {p.cuenta !== undefined && <span className="font-medium tabular-nums text-tinta-suave sm:ml-1.5"> {p.cuenta}</span>}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
