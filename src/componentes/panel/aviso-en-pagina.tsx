import { CheckCircle2Icon } from "lucide-react";

// Confirmación que queda en la página después de crear algo y pasar a otra pantalla
// (por ejemplo, "Usuario creado"). Los cambios en la misma pantalla avisan con un aviso flotante (avisos.ts).

export function AvisoEnPagina({ children }: { children: React.ReactNode }) {
  return (
    <p role="status" className="flex items-center gap-2 rounded-sm border border-border bg-superficie p-3 text-sm">
      <CheckCircle2Icon className="size-4 shrink-0 text-exito" aria-hidden />
      {children}
    </p>
  );
}
