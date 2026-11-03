import Link from "next/link";
import type { Route } from "next";
import { cn } from "cn";

// Filtros de una lista del panel (pedido 26): píldoras que se tocan, cada una con su cuenta ("En proceso 2"). Cada filtro
// es un enlace (?estado=…), así se comparte y el botón atrás funciona; el elegido lleva aria-current. Para cortes
// dentro de una pestaña; las vistas de un módulo siguen siendo Pestanas.

export type Filtro = { href: Route; texto: string; cuenta: number; activo: boolean };

export function Filtros({ etiqueta, filtros }: { etiqueta: string; filtros: Filtro[] }) {
  return (
    <nav aria-label={etiqueta} className="flex flex-wrap gap-2">
      {filtros.map((f) => (
        <Link
          key={f.href}
          href={f.href}
          aria-current={f.activo ? "page" : undefined}
          className={cn(
            "inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border bg-fondo px-3.5 text-sm font-semibold text-tinta-suave hover:border-tinta-suave hover:text-tinta pointer-coarse:min-h-11",
            f.activo && "border-tinta bg-tinta text-fondo hover:text-fondo",
          )}
        >
          {f.texto}
          <span className={cn("font-medium tabular-nums", f.activo ? "text-fondo/75" : "text-tinta-suave")}>{f.cuenta}</span>
        </Link>
      ))}
    </nav>
  );
}
