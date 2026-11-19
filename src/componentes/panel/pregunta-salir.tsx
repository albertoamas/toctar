import { useRef } from "react";
import { Button } from "@/componentes/ui/button";
import { AlertDialog } from "@base-ui/react/alert-dialog";

// "¿Salir sin guardar?" al dejar una pantalla con cambios (AvisoAlSalir): un diálogo chico y centrado, no la
// hoja de los formularios.

/**
 * "¿Salir sin guardar?" al dejar una pantalla con cambios (AvisoAlSalir: Nuevo cliente, Recibir, Entregar). Un diálogo
 * chico y centrado, también en el celular (no la hoja de los formularios): no hay otro modal abajo. El foco, en la opción
 * que no pierde nada; cerrarlo de cualquier forma es seguir editando.
 */
export function PreguntaSalir({ abierta, texto, alSeguir, alSalir }: { abierta: boolean; texto: string; alSeguir: () => void; alSalir: () => void }) {
  const seguir = useRef<HTMLButtonElement>(null);
  return (
    <AlertDialog.Root open={abierta} onOpenChange={(abrir) => !abrir && alSeguir()}>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className="fixed inset-0 isolate z-50 bg-black/10 supports-backdrop-filter:backdrop-blur-xs" />
        {/* data-slot como el de los modales: los avisos flotantes lo ven abierto (sonner.tsx) */}
        <AlertDialog.Popup
          data-slot="dialog-content"
          initialFocus={seguir}
          className="fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl bg-popover p-4 text-base text-popover-foreground ring-1 ring-foreground/10 outline-none sm:max-w-sm"
        >
          <AlertDialog.Title className="font-heading text-base leading-none font-medium">¿Salir sin guardar?</AlertDialog.Title>
          <AlertDialog.Description>{texto}</AlertDialog.Description>
          <div className="flex flex-wrap gap-2">
            <Button ref={seguir} type="button" variant="outline" onClick={alSeguir}>
              Seguir editando
            </Button>
            <Button type="button" variant="destructive" onClick={alSalir}>
              Salir sin guardar
            </Button>
          </div>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
