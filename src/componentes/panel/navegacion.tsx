"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "cn";

// Los módulos llegan ya filtrados por rol y permisos desde MenuPanel (src/lib/permisos.ts).
// El módulo actual lleva un trazo rojo a 60° a la izquierda: el mismo lenguaje que la página actual del sitio.
export type EnlaceModulo = { href: string; texto: string };

export function NavegacionPanel({ modulos }: { modulos: EnlaceModulo[] }) {
  const ruta = usePathname();

  return (
    <nav aria-label="Panel" className="flex flex-col gap-1">
      {modulos.map((m) => {
        const activo = m.href === "/panel" ? ruta === m.href : ruta.startsWith(m.href);
        return (
          <Link
            key={m.href}
            href={m.href}
            aria-current={activo ? "page" : undefined}
            className={cn(
              "relative flex min-h-11 items-center rounded-sm pr-4 pl-7 text-sm text-tinta-suave hover:bg-superficie hover:text-tinta",
              activo && "tt-modulo-actual bg-superficie-alta font-semibold text-tinta",
            )}
          >
            {m.texto}
          </Link>
        );
      })}
    </nav>
  );
}
