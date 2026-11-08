import type { Route } from "next";
import { BotonVolver } from "@/componentes/panel/boton-volver";

// Mientras carga una pantalla del panel: siluetas grises con la forma de lo que viene.
// Aparecen recién si la carga tarda más de 0,3 s (si no, no se ve nada y no hay parpadeo).
// El lector de pantalla anuncia "Cargando…". Una sola versión para todo el panel.

export function Cargando({ filas = 3, volver }: { filas?: number; /** El botón de volver ya a la vista, en su lugar (pulido 13.18). */ volver?: { href: Route; texto: string } }) {
  return (
    <div role="status" className="tt-cargando flex flex-col gap-3">
      <span className="sr-only">Cargando…</span>
      {volver ? (
        <div className="flex items-center gap-3">
          <BotonVolver href={volver.href} texto={volver.texto} />
          <div aria-hidden className="tt-cargando__bloque h-8 w-48" />
        </div>
      ) : (
        <div aria-hidden className="tt-cargando__bloque h-8 w-48" />
      )}
      {Array.from({ length: filas }, (_, i) => (
        <div key={i} aria-hidden className="tt-cargando__bloque h-16 w-full" />
      ))}
    </div>
  );
}
