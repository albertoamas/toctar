"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "cn";

// Pestañas de un módulo del panel. Cada pestaña tiene su ruta, para poder enlazarla.

export type Pestana = {
  href: string;
  texto: string;
  /** Otras rutas que también la marcan como activa (por ejemplo, el detalle de un elemento). */
  incluye?: string;
};

export function Pestanas({ etiqueta, pestanas }: { etiqueta: string; pestanas: Pestana[] }) {
  const ruta = usePathname();
  return (
    <nav aria-label={etiqueta} className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
      <ul className="flex min-w-max gap-6 border-b border-border">
        {pestanas.map((p) => {
          const activa = ruta === p.href || (!!p.incluye && ruta.startsWith(p.incluye));
          return (
            <li key={p.href}>
              <Link
                href={p.href}
                aria-current={activa ? "page" : undefined}
                className={cn(
                  "-mb-px block border-b-2 border-transparent py-3 text-sm font-semibold text-tinta-suave hover:text-tinta",
                  activa && "border-rojo text-tinta",
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
