"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "cn";

// Pestañas de un módulo del panel. Cada pestaña tiene su ruta, para poder enlazarla. La activa, subrayada en tinta: el
// rojo es del botón principal y del menú (pedido 26).

export type Pestana = { href: string; texto: string };

/** `activa`: el href de la pestaña elegida, cuando las pestañas cambian la búsqueda (?vista=) y no la ruta. */
export function Pestanas({ etiqueta, pestanas, activa: elegida }: { etiqueta: string; pestanas: Pestana[]; activa?: string }) {
  const ruta = usePathname();
  return (
    <nav aria-label={etiqueta} className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
      <ul className="flex min-w-max gap-6 border-b border-border">
        {pestanas.map((p) => {
          const activa = elegida !== undefined ? elegida === p.href : ruta === p.href;
          return (
            <li key={p.href}>
              <Link
                href={p.href}
                aria-current={activa ? "page" : undefined}
                className={cn(
                  "-mb-px block border-b-2 border-transparent px-1 py-3 text-sm font-semibold text-tinta-suave hover:text-tinta",
                  activa && "border-tinta text-tinta",
                )}
              >
                {p.texto}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
