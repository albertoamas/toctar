"use client";

import { useId } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useDestinoPendiente } from "./navegacion-pendiente";
import { cn } from "cn";
import type { Modulo } from "@/lib/permisos";
import { ICONO_MODULO } from "./iconos-modulo";
import { useMenuComprimido } from "./menu-comprimido";

// Los módulos llegan ya filtrados por rol y permisos, y agrupados, desde MenuPanel (menuAgrupado, src/lib/permisos.ts).
// El título del grupo, chico y gris, ordena sin competir con los enlaces, y el lector de pantalla lo anuncia. Cada enlace
// lleva el ícono de su módulo (el mismo del inicio); el actual, con fondo marcado, una barra roja a la izquierda y su
// ícono en rojo: lo único rojo del menú (pedido 26). Cada enlace mide 44 px con el dedo y 36 con mouse, como los botones
// del panel (pulido 13.25): con 44 también con mouse, en una pantalla de 768 px de alto el menú no entraba.
type EnlaceModulo = { modulo: Modulo; href: string; texto: string };
type GrupoEnlaces = { titulo: string | null; enlaces: EnlaceModulo[] };

export function NavegacionPanel({ grupos }: { grupos: GrupoEnlaces[] }) {
  const todas = grupos.flatMap((g) => g.enlaces.map((e) => e.href));
  return (
    // Entre los grupos, 10 px: con los grupos nuevos y Finanzas completo, a 16 px el menú no entraba en 768 px de alto
    <nav aria-label="Panel" className="flex flex-col gap-2.5">
      {grupos.map((g) => (
        <Grupo key={g.enlaces[0].href} {...g} todas={todas} />
      ))}
    </nav>
  );
}

/** Si la dirección es la de esa entrada o una de sus páginas ("/panel" solo para el inicio). */
const esDe = (ruta: string, href: string) => (href === "/panel" ? ruta === href : ruta === href || ruta.startsWith(`${href}/`));

function Grupo({ titulo, enlaces, todas }: GrupoEnlaces & { todas: string[] }) {
  const id = useId();
  const comprimido = useMenuComprimido();
  // El módulo tocado se marca al instante, sin esperar al servidor (NavegacionPendiente, 17/11)
  const destino = useDestinoPendiente();
  const actual = usePathname();
  const ruta = destino ? destino.split("?")[0] : actual;
  return (
    // Comprimida, cada grupo separado por una línea en lugar de su título (que queda para el lector de pantalla)
    <div role={titulo ? "group" : undefined} aria-labelledby={titulo ? id : undefined} className={cn("flex flex-col gap-0.5", titulo && "comprimido:border-t comprimido:border-border comprimido:pt-2")}>
      {titulo && (
        <p id={id} className="px-3 pb-0.5 text-xs font-semibold text-tinta-suave comprimido:sr-only">
          {titulo}
        </p>
      )}
      {enlaces.map((m) => {
        // Gana la entrada más específica: en Gastos (/panel/reportes/gastos) no se marca también Reportes
        const activo = esDe(ruta, m.href) && !todas.some((h) => h.length > m.href.length && esDe(ruta, h));
        const Icono = ICONO_MODULO[m.modulo];
        return (
          <Link
            key={m.href}
            href={m.href}
            aria-current={activo ? "page" : undefined}
            // Comprimida, el nombre al pasar el mouse (el lector lo oye del texto, que queda oculto a la vista)
            title={comprimido ? m.texto : undefined}
            className={cn(
              "group/enlace relative flex min-h-8 items-center gap-3 rounded-md px-3 text-sm font-medium text-tinta-suave hover:bg-superficie hover:text-tinta pointer-coarse:min-h-11 comprimido:justify-center comprimido:px-0",
              activo && "tt-modulo-actual bg-superficie-alta font-semibold text-tinta",
            )}
          >
            <Icono className={cn("size-[18px] shrink-0", activo ? "text-rojo" : "text-tinta-suave group-hover/enlace:text-tinta")} aria-hidden />
            <span className="comprimido:sr-only">{m.texto}</span>
          </Link>
        );
      })}
    </div>
  );
}
