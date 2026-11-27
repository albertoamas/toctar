import { useRef } from "react";
import { Button } from "@/componentes/ui/button";
import { Dialog } from "@base-ui/react/dialog";
import { useCelular } from "./celular";

// "¿Salir sin guardar?" al dejar una pantalla con cambios (AvisoAlSalir): un diálogo chico y centrado, no la
// hoja de los formularios.

/**
 * "¿Salir sin guardar?" al dejar una pantalla con cambios (AvisoAlSalir: Nuevo cliente, Recibir, Entregar). Un diálogo
 * chico y centrado, también en el celular (no la hoja de los formularios): no hay otro modal abajo. El foco, en la opción
 * que no pierde nada; cerrarlo de cualquier forma es seguir editando.
 *
 * Sobre el Dialog de Base UI, no su AlertDialog (19/11): el AlertDialog siempre bloquea la página a su manera y en el
 * iPhone, al cerrarse, parpadeaba. Como los otros modales, en el celular sin ese bloqueo (la página la bloquea
 * globals.css) y con lo que lo hace una alerta: su función para el lector de pantalla (alertdialog) y que un toque afuera
 * no lo cierre.
 */
export function PreguntaSalir({ abierta, texto, alSeguir, alSalir }: { abierta: boolean; texto: string; alSeguir: () => void; alSalir: () => void }) {
  const seguir = useRef<HTMLButtonElement>(null);
  const enCelular = useCelular();
  return (
    <Dialog.Root open={abierta} onOpenChange={(abrir) => !abrir && alSeguir()} modal={enCelular ? "trap-focus" : true} disablePointerDismissal>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 isolate z-50 bg-black/10 supports-backdrop-filter:backdrop-blur-xs" />
        {/* data-slot como el de los modales: los avisos flotantes lo ven abierto (sonner.tsx) */}
        <Dialog.Popup
          role="alertdialog"
          data-slot="dialog-content"
          initialFocus={seguir}
          className="fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl bg-popover p-4 text-base text-popover-foreground ring-1 ring-foreground/10 outline-none sm:max-w-sm"
        >
          <Dialog.Title className="font-heading text-base leading-none font-medium">¿Salir sin guardar?</Dialog.Title>
          <Dialog.Description>{texto}</Dialog.Description>
          <div className="flex flex-wrap gap-2">
            <Button ref={seguir} type="button" variant="outline" onClick={alSeguir}>
              Seguir editando
            </Button>
            <Button type="button" variant="destructive" onClick={alSalir}>
              Salir sin guardar
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
