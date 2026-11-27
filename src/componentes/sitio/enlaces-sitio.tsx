"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { cn } from "cn";
import type { EnlaceSitio as Enlace } from "@/lib/sitio";

// Enlaces del encabezado del sitio. Marcan la página actual (también con aria-current, para lectores de pantalla).
// Son de cliente solo para saber en qué página se está; el resto del encabezado es del servidor.
// Con Cache Components, la ruta se conoce recién al atender el pedido: mientras tanto se muestran los mismos
// enlaces sin marcar (mismo tamaño, nada salta).

function esActual(ruta: string | null, href: string): boolean {
  return !!ruta && (ruta === href || ruta.startsWith(`${href}/`));
}

/** Barra de la computadora: la página actual enciende un tramo de la línea LED bajo su enlace. */
export function NavegacionPrincipal({ enlaces }: { enlaces: Enlace[] }) {
  return (
    <nav aria-label="Principal" className="flex self-stretch">
      <Suspense fallback={<Barra enlaces={enlaces} ruta={null} />}>
        <BarraConRuta enlaces={enlaces} />
      </Suspense>
    </nav>
  );
}

function BarraConRuta({ enlaces }: { enlaces: Enlace[] }) {
  return <Barra enlaces={enlaces} ruta={usePathname()} />;
}

function Barra({ enlaces, ruta }: { enlaces: Enlace[]; ruta: string | null }) {
  return (
    <ul className="flex gap-8">
      {enlaces.map((e) => {
        const actual = esActual(ruta, e.href);
        return (
          <li key={e.href} className="flex">
            <Link
              href={e.href}
              aria-current={actual ? "page" : undefined}
              className={cn("relative flex items-center text-sm font-semibold text-tinta hover:text-rojo-texto", actual && "tt-enlace-actual")}
            >
              {e.texto}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

type PropsMenu = { principales: Enlace[]; secundarios: Enlace[] };

/** Menú del celular: las páginas principales grandes, en la letra de los titulares; las demás, más chicas. */
export function EnlacesMenu(props: PropsMenu) {
  return (
    <nav aria-label="Principal" className="flex flex-col px-6 pt-4">
      <Suspense fallback={<ListasMenu {...props} ruta={null} />}>
        <ListasMenuConRuta {...props} />
      </Suspense>
    </nav>
  );
}

function ListasMenuConRuta(props: PropsMenu) {
  return <ListasMenu {...props} ruta={usePathname()} />;
}

function ListasMenu({ principales, secundarios, ruta }: PropsMenu & { ruta: string | null }) {
  return (
    <>
      <ul>
        {principales.map((e) => {
          const actual = esActual(ruta, e.href);
          return (
            <li key={e.href}>
              <Link
                href={e.href}
                aria-current={actual ? "page" : undefined}
                className={cn("block py-2 font-heading text-[32px] leading-10 font-bold italic", actual ? "text-rojo-texto" : "text-tinta hover:text-rojo-texto")}
              >
                {e.texto}
              </Link>
            </li>
          );
        })}
      </ul>
      <ul className="mt-4 border-t border-border pt-2">
        {secundarios.map((e) => {
          const actual = esActual(ruta, e.href);
          return (
            <li key={e.href}>
              <Link
                href={e.href}
                aria-current={actual ? "page" : undefined}
                className={cn("block py-3 text-base leading-6 font-medium", actual ? "text-rojo-texto" : "text-tinta-suave hover:text-tinta")}
              >
                {e.texto}
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
