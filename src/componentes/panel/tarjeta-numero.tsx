import Link from "next/link";
import type { Route } from "next";
import type { LucideIcon } from "lucide-react";
import { cn } from "cn";

// Una tarjeta con un número (pedido 26): qué se cuenta, la cifra grande y una línea que la explica; si esa línea pide
// atención ("1 atrasada"), va en ámbar. Toda la tarjeta lleva a la lista de lo que cuenta. El nombre del enlace se lee
// en orden: "En el taller 4, 1 atrasada".
// Pulido final (10/11): en el celular, compacta (la cifra y su línea en un renglón, menos relleno): las cinco del inicio
// ocupaban unos 430 px antes de "Para hoy". Desde @4xl, como antes.

type Props = { href: Route; icono: LucideIcon; titulo: string; valor: React.ReactNode; nota: string; aviso?: boolean };

export function TarjetaNumero({ href, icono: Icono, titulo, valor, nota, aviso = false }: Props) {
  return (
    <Link href={href} className="tt-tarjeta-panel flex min-w-0 flex-col gap-1 p-3 transition-colors hover:border-tinta-suave/50 @4xl:gap-1.5 @4xl:p-4">
      <span className="flex items-center gap-2 text-sm font-semibold text-tinta-suave">
        <span className="grid size-7 shrink-0 place-items-center rounded-md bg-neutro-fondo text-tinta">
          <Icono className="size-4" aria-hidden />
        </span>
        {titulo}
      </span>
      <span className="flex flex-wrap items-baseline gap-x-2 @4xl:flex-col @4xl:items-start @4xl:gap-1.5">
        <span className="text-xl leading-tight font-bold tracking-tight tabular-nums @4xl:text-[1.75rem]">{valor}</span>
        <span className={cn("text-xs", aviso ? "font-semibold text-aviso" : "text-tinta-suave")}>{nota}</span>
      </span>
    </Link>
  );
}
