"use client";

import { useId } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "cn";
import type { Modulo } from "@/lib/permisos";
import { ICONO_MODULO } from "./iconos-modulo";

// Los módulos llegan ya filtrados por rol y permisos, y agrupados, desde MenuPanel (menuAgrupado, src/lib/permisos.ts).
// El título del grupo, chico y gris, ordena sin competir con los enlaces, y el lector de pantalla lo anuncia. Cada enlace
// lleva el ícono de su módulo (el mismo del inicio); el actual, con fondo marcado, una barra roja a la izquierda y su
// ícono en rojo: lo único rojo del menú (pedido 26).
type EnlaceModulo = { modulo: Modulo; href: string; texto: string };
type GrupoEnlaces = { titulo: string | null; enlaces: EnlaceModulo[] };

export function NavegacionPanel({ grupos }: { grupos: GrupoEnlaces[] }) {
  return (
    <nav aria-label="Panel" className="flex flex-col gap-4">
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
    <div role={titulo ? "group" : undefined} aria-labelledby={titulo ? id : undefined} className="flex flex-col gap-0.5">
      {titulo && (
        <p id={id} className="px-3 pb-1 text-xs font-semibold text-tinta-suave">
          {titulo}
        </p>
      )}
      {enlaces.map((m) => {
        const activo = m.href === "/panel" ? ruta === m.href : ruta.startsWith(m.href);
        const Icono = ICONO_MODULO[m.modulo];
        return (
          <Link
            key={m.href}
            href={m.href}
            aria-current={activo ? "page" : undefined}
            className={cn(
              "group/enlace relative flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium text-tinta-suave hover:bg-superficie hover:text-tinta",
              activo && "tt-modulo-actual bg-superficie-alta font-semibold text-tinta",
            )}
          >
            <Icono className={cn("size-[18px] shrink-0", activo ? "text-rojo" : "text-tinta-suave group-hover/enlace:text-tinta")} aria-hidden />
            {m.texto}
          </Link>
        );
      })}
    </div>
  );
}
