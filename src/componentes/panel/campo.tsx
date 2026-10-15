import { CircleAlertIcon } from "lucide-react";
import { Label } from "@/componentes/ui/label";

// Campo de formulario del panel: etiqueta, control, y debajo el error o la ayuda.
// El control debe usar aria-describedby="<id>-error" o "<id>-ayuda" según corresponda.

export function Campo(props: { id: string; etiqueta: string; error?: string; ayuda?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={props.id}>{props.etiqueta}</Label>
      {props.children}
      {props.error ? (
        <MensajeError id={`${props.id}-error`}>{props.error}</MensajeError>
      ) : (
        props.ayuda && <p id={`${props.id}-ayuda`} className="text-sm text-tinta-suave">{props.ayuda}</p>
      )}
    </div>
  );
}

export function MensajeError({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <p id={id} className="flex items-center gap-1 text-sm font-semibold text-rojo-texto">
      <CircleAlertIcon className="size-4 shrink-0" aria-hidden />
      {children}
    </p>
  );
}
