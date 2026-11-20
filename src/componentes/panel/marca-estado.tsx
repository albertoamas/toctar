import { cn } from "cn";
import type { TonoEstado } from "@/lib/tonos";

// Un estado escrito con un punto de color delante, sin píldora (recorrido visual del 19/11, "menos es más"): en el
// inicio y en las listas de la agenda. El punto lleva el color del tono; la palabra, el de la tinta, o el del tono si es
// un problema ("Debía ingresar el 7 nov." en rojo). Las insignias con fondo (`Insignia`) quedan para las fichas y tablas.

/** El color del punto de cada tono de estado. */
const PUNTO: Record<TonoEstado, string> = { exito: "bg-exito", aviso: "bg-aviso", peligro: "bg-peligro", info: "bg-info", violeta: "bg-violeta" };
const TEXTO: Record<TonoEstado, string> = { exito: "text-exito", aviso: "text-aviso", peligro: "text-peligro", info: "text-info", violeta: "text-violeta" };

export function MarcaEstado({ tono, problema, className, children }: { tono?: TonoEstado; problema?: boolean; className?: string; children: React.ReactNode }) {
  return (
    <span className={cn("flex min-w-0 items-center gap-2", problema && cn("font-semibold", tono && TEXTO[tono]), className)}>
      <span className={cn("size-2 shrink-0 rounded-full", tono ? PUNTO[tono] : "bg-tinta-suave")} aria-hidden />
      {children}
    </span>
  );
}
