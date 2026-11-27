import Link from "next/link";
import type { Route } from "next";
import type { LucideIcon } from "lucide-react";
import { cn } from "cn";

// Una tarjeta con un número (pedido 26): qué se cuenta, la cifra grande y una línea que la explica. Toda la tarjeta
// lleva a la lista de lo que cuenta. El nombre del enlace se lee en orden: "En el taller 4, 1 atrasada".
// Recorrido visual del 19/11 (prototipo 4, "menos es más"): la etiqueta chica con su ícono suelto (sin caja), que baja
// de renglón si no cabe (en un iPhone, "Mantenimientos" se salía); si la línea pide atención, va con un punto y en el
// color de lo que pasa: rojo lo atrasado (`aviso="peligro"`), ámbar lo que espera (`aviso`).
// Pedido 16 (Reportes): sin `href` es solo un número (no lleva a ninguna lista), y la nota puede llevar el cambio frente
// al mes anterior con su color ("▲ 12 % vs. oct.").

type Props = { href?: Route; icono: LucideIcon; titulo: string; valor: React.ReactNode; nota: React.ReactNode; aviso?: boolean | "peligro"; className?: string };

export function TarjetaNumero({ href, icono: Icono, titulo, valor, nota, aviso = false, className }: Props) {
  const clase = cn("tt-tarjeta-panel flex min-w-0 flex-col gap-1 p-3.5 @xl:px-[1.125rem] @xl:py-4", href && "transition-colors hover:border-tinta-suave/50", className);
  const contenido = (
    <>
      <span className="flex min-w-0 items-center gap-2 text-[0.8125rem] font-medium text-tinta-suave">
        <Icono className="size-4 shrink-0" aria-hidden />
        <span className="min-w-0 break-words">{titulo}</span>
      </span>
      <span className="text-[1.4rem] leading-tight font-bold tracking-tight tabular-nums @xl:text-[1.6rem]">{valor}</span>
      <span
        className={cn(
          "text-xs",
          aviso
            ? cn("flex items-center gap-1.5 font-semibold before:size-1.5 before:shrink-0 before:rounded-full before:bg-current", aviso === "peligro" ? "text-peligro" : "text-aviso")
            : "text-tinta-suave",
        )}
      >
        {nota}
      </span>
    </>
  );
  return href ? (
    <Link href={href} className={clase}>
      {contenido}
    </Link>
  ) : (
    <div className={clase}>{contenido}</div>
  );
}
