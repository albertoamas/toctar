"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "cn";

// Pestañas de Configuración: cada una tiene su ruta para poder enlazarla (especificación B2 §5).
const PESTANAS = [
  { href: "/panel/configuracion", texto: "Negocio" },
  { href: "/panel/configuracion/taller", texto: "Taller" },
  { href: "/panel/configuracion/cotizaciones", texto: "Cotizaciones y mantenimiento" },
] as const;

export function PestanasConfiguracion() {
  const ruta = usePathname();
  return (
    <nav aria-label="Secciones de configuración" className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
      <ul className="flex min-w-max gap-6 border-b border-border">
        {PESTANAS.map((p) => {
          const activa = ruta === p.href;
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
