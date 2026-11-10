import Link from "next/link";
import type { Route } from "next";
import { cn } from "cn";

// Filtros de una lista del panel (pedido 26): píldoras que se tocan, cada una con su cuenta ("En proceso 2"). Cada filtro
// es un enlace (?estado=…), así se comparte y el botón atrás funciona; el elegido lleva aria-current. Para cortes
// dentro de una pestaña; las vistas de un módulo siguen siendo Pestanas. Van en la barra de la lista (BarraLista): en el
// celular, en una sola fila que se desliza (10/11: se partían en dos renglones).

/** La píldora: la misma para un filtro, un interruptor ("Desactivados") o un botón (los servicios de la Galería). */
export const CLASE_PILDORA =
  "inline-flex min-h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-fondo px-3.5 text-sm font-semibold text-tinta-suave hover:border-tinta-suave hover:text-tinta pointer-coarse:min-h-11";
export const CLASE_PILDORA_ACTIVA = "border-tinta bg-tinta text-fondo hover:text-fondo";

export type Filtro = { href: Route; texto: string; cuenta?: number; activo: boolean };

export function Filtros({ etiqueta, filtros }: { etiqueta: string; filtros: Filtro[] }) {
  return (
    <nav aria-label={etiqueta} className="flex w-max gap-2 sm:w-auto sm:flex-wrap">
      {filtros.map((f) => (
        <Link key={f.href} href={f.href} aria-current={f.activo ? "page" : undefined} className={cn(CLASE_PILDORA, f.activo && CLASE_PILDORA_ACTIVA)}>
          {f.texto}
          {f.cuenta !== undefined && <span className={cn("font-medium tabular-nums", f.activo ? "text-fondo/75" : "text-tinta-suave")}> {f.cuenta}</span>}
        </Link>
      ))}
    </nav>
  );
}
