import { cn } from "cn";
import type { LucideIcon } from "lucide-react";
import type { TonoEstado } from "@/lib/tonos";

// La insignia de estado del panel (pedido 26): una píldora con punto y el fondo de su tono. La palabra lleva el
// significado; el color lo refuerza. Una sola, para que todas las pantallas la muestren igual. Con `icono` (las alertas,
// `Alerta`), el ícono va en lugar del punto: se distingue sin depender del color (23/11).
// Los colores, uno por significado (23/11, src/lib/tonos.ts): gris esperando a otro o ya no cuenta, azul en curso o
// programado, violeta recién llegado al taller, verde bien o terminado, ámbar falta hacer algo, rojo perdido o problema.

export function Insignia({ tono, icono: Icono, className, children }: { tono?: TonoEstado; icono?: LucideIcon; className?: string; children: React.ReactNode }) {
  return (
    <span className={cn("tt-estado", tono && `tt-estado--${tono}`, Icono && "tt-estado--icono", className)}>
      {Icono && <Icono className="size-3.5 shrink-0" aria-hidden />}
      {children}
    </span>
  );
}
