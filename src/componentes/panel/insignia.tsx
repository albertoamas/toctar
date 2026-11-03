import { cn } from "cn";
import type { TonoEstado } from "@/lib/tonos";

// La insignia de estado del panel (pedido 26): una píldora con punto y el fondo de su tono. La palabra lleva el
// significado; el color lo refuerza. Una sola, para que todas las pantallas la muestren igual.

export function Insignia({ tono, className, children }: { tono?: TonoEstado; className?: string; children: React.ReactNode }) {
  return <span className={cn("tt-estado", tono && `tt-estado--${tono}`, className)}>{children}</span>;
}
