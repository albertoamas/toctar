"use client";

import Link from "next/link";
import type { Route } from "next";
import { cn } from "cn";
import { direccion, useDestinoPendiente } from "./navegacion-pendiente";
import { CLASE_PILDORA, CLASE_PILDORA_ACTIVA } from "./pildora";

// Filtros de una lista del panel (pedido 26): píldoras que se tocan, cada una con su cuenta ("En proceso 2"). Cada filtro
// es un enlace (?estado=…), así se comparte y el botón atrás funciona; el elegido lleva aria-current. Para cortes
// dentro de una pestaña; las vistas de un módulo siguen siendo Pestanas. Van en la barra de la lista (BarraLista): en el
// celular, en una sola fila que se desliza (10/11: se partían en dos renglones).


export type Filtro = { href: Route; texto: string; cuenta?: number; activo: boolean };

export function Filtros({ etiqueta, filtros }: { etiqueta: string; filtros: Filtro[] }) {
  // El filtro tocado se marca al instante, sin esperar al servidor (NavegacionPendiente, 17/11)
  const destino = useDestinoPendiente();
  const tocado = destino ? filtros.find((f) => direccion(f.href) === destino) : undefined;
  return (
    <nav aria-label={etiqueta} className="flex w-max gap-2 sm:w-auto sm:flex-wrap">
      {filtros.map((f) => (
        <Link key={f.href} href={f.href} aria-current={f.activo ? "page" : undefined} className={cn(CLASE_PILDORA, (tocado ? f === tocado : f.activo) && CLASE_PILDORA_ACTIVA)}>
          {f.texto}
          {f.cuenta !== undefined && <span className={cn("font-medium tabular-nums", (tocado ? f === tocado : f.activo) ? "text-fondo/75" : "text-tinta-suave")}> {f.cuenta}</span>}
        </Link>
      ))}
    </nav>
  );
}
