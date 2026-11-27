import Link from "next/link";
import type { Route } from "next";
import { ChevronRightIcon, type LucideIcon } from "lucide-react";

// La portada de una sección con varias partes (pedido 26: Sitio web, Configuración): "¿Qué quieres cambiar?" con una
// tarjeta grande por parte, su ícono y una línea que dice qué hay adentro. Al tocarla, se entra solo a esa parte. Así el
// dueño encuentra dónde cambiar un texto sin recorrer pestañas.

export type TarjetaSeccion = { href: Route; icono: LucideIcon; titulo: string; descripcion: string };

export function TarjetasSeccion({ etiqueta, tarjetas }: { etiqueta: string; tarjetas: TarjetaSeccion[] }) {
  return (
    <nav aria-label={etiqueta}>
      <ul className="grid gap-3 @xl:grid-cols-2 @4xl:grid-cols-3">
        {tarjetas.map((t) => (
          <li key={t.href}>
            <Link href={t.href} className="tt-tarjeta-panel flex h-full min-h-11 items-center gap-4 p-4 transition-colors hover:border-tinta-suave/50">
              <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-neutro-fondo text-tinta">
                <t.icono className="size-5" aria-hidden />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="font-semibold">{t.titulo}</span>
                <span className="text-sm text-tinta-suave">{t.descripcion}</span>
              </span>
              <ChevronRightIcon className="size-5 shrink-0 text-tinta-suave" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
