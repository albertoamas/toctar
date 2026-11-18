import type { Route } from "next";
import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { cn } from "cn";
import { buttonVariants } from "@/componentes/ui/button";
import { cantidad } from "@/lib/cantidad";
import { POR_PAGINA } from "@/lib/paginacion";

// Las páginas de una lista larga del panel (17/11): cuántas filas se ven de cuántas, y "Anterior" y "Siguiente". Los dos
// botones están siempre (apagados en la primera y en la última), así no saltan de lugar al pasar de página. Con una
// sola página no se muestra nada. La página va en la dirección: `enlace` arma la de otra página con los filtros de ahora.

type Props = {
  pagina: number;
  paginas: number;
  total: number;
  /** Cómo se nombran las filas: ["cliente", "clientes"]. */
  nombre: [string, string];
  enlace: (pagina: number) => string;
  porPagina?: number;
};

export function Paginacion({ pagina, paginas, total, nombre, enlace, porPagina = POR_PAGINA }: Props) {
  if (paginas <= 1) return null;
  const desde = (pagina - 1) * porPagina + 1;
  const hasta = Math.min(pagina * porPagina, total);
  return (
    <nav aria-label="Páginas" className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-tinta-suave tabular-nums">
        {desde} a {hasta} de {cantidad(total, ...nombre)}
      </p>
      <div className="flex items-center gap-3">
        <Boton href={pagina > 1 ? enlace(pagina - 1) : null}>
          <ChevronLeftIcon />
          Anterior
        </Boton>
        <span className="text-sm tabular-nums" aria-current="page">
          Página {pagina} de {paginas}
        </span>
        <Boton href={pagina < paginas ? enlace(pagina + 1) : null}>
          Siguiente
          <ChevronRightIcon />
        </Boton>
      </div>
    </nav>
  );
}

function Boton({ href, children }: { href: string | null; children: React.ReactNode }) {
  const clase = buttonVariants({ variant: "outline" });
  // En la primera o la última página: a la vista pero apagado, sin enlace
  if (!href) {
    return (
      <span aria-disabled="true" className={cn(clase, "pointer-events-none opacity-50")}>
        {children}
      </span>
    );
  }
  return (
    <Link href={href as Route} className={clase}>
      {children}
    </Link>
  );
}
