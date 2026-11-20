import Link from "next/link";
import type { Route } from "next";
import { ChevronRightIcon } from "lucide-react";
import { cn } from "cn";

// Elegir algo de una lista en un flujo de pasos (recorrido visual del 20/11): el cliente y el vehículo de Nueva reserva y
// Nueva cotización, con la misma forma. Tarjetas apiladas que se tocan enteras y pasan al paso siguiente: el nombre (o la
// placa) y, si ayuda a elegir, una línea gris. La última puede ser "Otro …" (un botón con `CLASE_TARJETA_PARA_ELEGIR`).

export const CLASE_TARJETA_PARA_ELEGIR =
  "flex min-h-16 w-full items-center gap-3 rounded-lg border border-border bg-fondo px-4 py-3 text-left transition-colors hover:border-tinta-suave/60 hover:bg-superficie/50";

export type TarjetaParaElegir = {
  clave: string | number;
  href: Route;
  titulo: string;
  /** El título es una placa: con su letra. */
  esPlaca?: boolean;
  detalle?: string | null;
};

export function TarjetasParaElegir({ etiqueta, tarjetas, children, className }: { etiqueta: string; tarjetas: TarjetaParaElegir[]; children?: React.ReactNode; className?: string }) {
  return (
    <ul aria-label={etiqueta} className={cn("flex flex-col gap-2 p-4 sm:p-5", className)}>
      {tarjetas.map((t) => (
        <li key={t.clave}>
          <Link href={t.href} className={CLASE_TARJETA_PARA_ELEGIR}>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className={t.esPlaca ? "tt-placa text-base" : "font-semibold"}>{t.titulo}</span>
              {t.detalle && <span className="text-sm text-tinta-suave">{t.detalle}</span>}
            </span>
            <ChevronRightIcon className="size-5 shrink-0 text-tinta-suave" aria-hidden />
          </Link>
        </li>
      ))}
      {children}
    </ul>
  );
}
