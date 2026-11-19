import { CircleCheckIcon, InfoIcon, TriangleAlertIcon } from "lucide-react";
import { cn } from "cn";

// Lo que decide un paso del taller, arriba de todo (C7 §5.3, 18/11): "Pagado por completo." en verde, "Falta cobrar
// 300 Bs" en ámbar, lo que hace el paso en azul. Con ícono y texto, nunca solo el color; su acción, en la misma franja
// ("Registrar pago"), a la derecha o debajo si no entra. El azul es una frase, sin negrita.

const TONO = {
  exito: { clase: "border-exito/30 bg-exito-fondo text-exito", Icono: CircleCheckIcon },
  aviso: { clase: "border-aviso/40 bg-aviso-fondo text-aviso", Icono: TriangleAlertIcon },
  info: { clase: "border-info/30 bg-info-fondo text-info", Icono: InfoIcon },
} as const;

export function AvisoEstado({ tono, accion, children }: { tono: keyof typeof TONO; accion?: React.ReactNode; children: React.ReactNode }) {
  const { clase, Icono } = TONO[tono];
  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-lg border px-3 py-2.5 sm:px-4", clase)}>
      <p className={cn("flex min-h-9 items-center gap-2 tabular-nums", tono !== "info" && "font-semibold")}>
        <Icono aria-hidden className="size-5 shrink-0" />
        {children}
      </p>
      {accion}
    </div>
  );
}
