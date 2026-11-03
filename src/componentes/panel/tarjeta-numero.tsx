import Link from "next/link";
import type { Route } from "next";
import type { LucideIcon } from "lucide-react";
import { cn } from "cn";

// Una tarjeta con un número (pedido 26): qué se cuenta, la cifra grande y una línea que la explica; si esa línea pide
// atención ("1 atrasada"), va en ámbar. Toda la tarjeta lleva a la lista de lo que cuenta. El nombre del enlace se lee
// en orden: "En el taller 4, 1 atrasada".

type Props = { href: Route; icono: LucideIcon; titulo: string; valor: React.ReactNode; nota: string; aviso?: boolean };

export function TarjetaNumero({ href, icono: Icono, titulo, valor, nota, aviso = false }: Props) {
  return (
    <Link href={href} className="tt-tarjeta-panel flex min-w-0 flex-col gap-1.5 p-4 transition-colors hover:border-tinta-suave/50">
      <span className="flex items-center gap-2 text-sm font-semibold text-tinta-suave">
        <span className="grid size-7 shrink-0 place-items-center rounded-md bg-neutro-fondo text-tinta">
          <Icono className="size-4" aria-hidden />
        </span>
        {titulo}
      </span>
      <span className="text-[1.75rem] leading-tight font-bold tracking-tight tabular-nums">{valor}</span>
      <span className={cn("text-xs", aviso ? "font-semibold text-aviso" : "text-tinta-suave")}>{nota}</span>
    </Link>
  );
}
