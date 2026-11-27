import { cn } from "cn";
import type { estadoDelTaller } from "@/lib/horarios";

// Si el taller está abierto ahora y hasta cuándo, o cuándo vuelve a abrir (pedido 38): sale del horario de
// Configuración > Negocio (`estadoDelTaller`, en hora de Bolivia). Lo usan Contacto y la portada (pulido 13.53), para
// que digan lo mismo. Sin horario cargado no se muestra nada.

type Estado = NonNullable<ReturnType<typeof estadoDelTaller>>;

export function EstadoDelTaller({ estado, className }: { estado: Estado; className?: string }) {
  return (
    <p className={cn("flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-semibold", className)}>
      <span aria-hidden className={cn("size-2.5 rounded-full", estado.abierto ? "bg-exito" : "bg-tinta-suave")} />
      {estado.abierto ? "Abierto ahora" : "Cerrado ahora"}
      <span className="font-medium text-tinta-suave">({estado.detalle})</span>
    </p>
  );
}
