"use client";

import { useId } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "cn";

// Los módulos llegan ya filtrados por rol y permisos, y agrupados, desde MenuPanel (menuAgrupado, src/lib/permisos.ts).
// El módulo actual lleva un trazo rojo a 60° a la izquierda: el mismo lenguaje que la página actual del sitio.
// Los grupos se separan con aire, no con líneas; su título es chico y no compite con los enlaces, y el lector de
// pantalla lo anuncia al entrar al grupo.
type EnlaceModulo = { href: string; texto: string };
type GrupoEnlaces = { titulo: string | null; enlaces: EnlaceModulo[] };

export function NavegacionPanel({ grupos }: { grupos: GrupoEnlaces[] }) {
  return (
    <nav aria-label="Panel" className="flex flex-col gap-5">
      {grupos.map((g) => (
        <Grupo key={g.enlaces[0].href} {...g} />
      ))}
    </nav>
  );
}

function Grupo({ titulo, enlaces }: GrupoEnlaces) {
  const id = useId();
  const ruta = usePathname();
  return (
    <div role={titulo ? "group" : undefined} aria-labelledby={titulo ? id : undefined} className="flex flex-col gap-1">
      {titulo && (
        <p id={id} className="pb-1 pl-7 text-xs font-semibold text-tinta-suave">
          {titulo}
        </p>
      )}
      {enlaces.map((m) => {
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
    </div>
  );
}
