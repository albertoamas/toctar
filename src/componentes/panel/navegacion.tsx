"use client";

import { useId } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "cn";
import type { Modulo } from "@/lib/permisos";
import { ICONO_MODULO } from "./iconos-modulo";

// Los módulos llegan ya filtrados por rol y permisos, y agrupados, desde MenuPanel (menuAgrupado, src/lib/permisos.ts).
// Cada bloque va separado por una línea fina; el título del grupo, en la letra de los titulares de la marca (Barlow
// Condensed itálica), ordena sin competir con los enlaces y el lector de pantalla lo anuncia. Cada enlace lleva el
// ícono de su módulo (el mismo del inicio) y el actual, el trazo rojo a 60° del sitio.
type EnlaceModulo = { modulo: Modulo; href: string; texto: string };
type GrupoEnlaces = { titulo: string | null; enlaces: EnlaceModulo[] };

export function NavegacionPanel({ grupos }: { grupos: GrupoEnlaces[] }) {
  return (
    <nav aria-label="Panel" className="flex flex-col divide-y divide-border">
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
    <div role={titulo ? "group" : undefined} aria-labelledby={titulo ? id : undefined} className="flex flex-col gap-0.5 py-3 first:pt-0 last:pb-0">
      {titulo && (
        <p id={id} className="px-3 pb-1 font-heading text-base font-bold text-tinta-suave italic">
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
              "group/enlace relative flex min-h-11 items-center gap-3 rounded-sm pr-3 pl-7 text-sm text-tinta-suave hover:bg-superficie hover:text-tinta",
              activo && "tt-modulo-actual bg-superficie-alta font-semibold text-tinta",
            )}
          >
            <Icono className={cn("size-[18px] shrink-0", activo ? "text-tinta" : "text-tinta-suave group-hover/enlace:text-tinta")} aria-hidden />
            {m.texto}
          </Link>
        );
      })}
    </div>
  );
}
