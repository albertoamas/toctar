"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "cn";

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
  return (
    <nav aria-label={etiqueta} className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
      <ul className="flex min-w-max gap-6 border-b border-border">
        {pestanas.map((p) => {
          const activa = elegida !== undefined ? elegida === p.href : ruta === p.href;
          return (
            <li key={p.href}>
              <Link
                href={conBusqueda(p.href)}
                aria-current={activa ? "page" : undefined}
                className={cn(
                  "-mb-px block border-b-2 border-transparent px-1 py-3 text-sm font-semibold text-tinta-suave hover:text-tinta",
                  activa && "border-tinta text-tinta",
                )}
              >
                {p.texto}
                {/* Con su espacio: el lector oye "Pendientes 1" y no "Pendientes1" */}
                {p.cuenta !== undefined && <span className="ml-1.5 font-medium tabular-nums text-tinta-suave"> {p.cuenta}</span>}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
