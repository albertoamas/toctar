import { createContext, useContext, useRef } from "react";
import { Button } from "@/componentes/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/componentes/ui/dialog";

// Componente de cliente: se usa dentro de otros componentes de cliente (recibe funciones como props).
// Un formulario corto en un modal (skill pantallas-panel): editar una sección de una ficha (SeccionConEditar) o crear
// algo de pocos campos ("Agregar servicio"). En el celular es una hoja desde abajo con los botones fijos al pie; desde
// 640 px, el modal centrado. El foco va al primer campo para escribir al abrir y el diálogo lo devuelve al botón que lo
// abrió al cerrar. El formulario de adentro lo cierra al guardar con useCerrarModal y pone sus botones en PieModal
// ("Cancelar" o "Listo" con CancelarModal).

const Modal = createContext<{ cerrar: () => void } | null>(null);

/**
 * Dónde va el foco al abrir: el primer campo para escribir; si no hay (una lista), el primer botón habilitado. Una
 * confirmación de algo destructivo lo pone en "Cancelar" (`CancelarModal focoInicial`): un Enter no la confirma.
 */
const habilitado = (selectores: string[]) => selectores.map((c) => `${c}:not(:disabled)`).join(", ");
const primerControl = (modal: HTMLElement | null) =>
  modal?.querySelector<HTMLElement>("[data-foco-inicial]") ??
  modal?.querySelector<HTMLElement>(habilitado(["input:not([type=hidden])", "textarea", "select"])) ??
  modal?.querySelector<HTMLElement>(habilitado(["button"])) ??
  true;

type Props = {
  titulo: string;
  abierto: boolean;
  alCambiar: (abierto: boolean) => void;
  /** El formulario. */
  children: React.ReactNode;
};

export function ModalFormulario({ titulo, abierto, alCambiar, children }: Props) {
  const modal = useRef<HTMLDivElement>(null);
  return (
    <Dialog open={abierto} onOpenChange={alCambiar}>
      <DialogContent
        ref={modal}
        initialFocus={() => primerControl(modal.current)}
        className="max-h-[calc(100dvh-2rem)] gap-5 overflow-y-auto text-base max-sm:top-auto max-sm:bottom-0 max-sm:max-w-full max-sm:translate-y-0 max-sm:rounded-b-none sm:max-w-lg"
      >
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
        </DialogHeader>
        <Modal.Provider value={{ cerrar: () => alCambiar(false) }}>{children}</Modal.Provider>
      </DialogContent>
    </Dialog>
  );
}

/** Para el formulario de un modal: lo cierra (después de guardar). Fuera de un modal no hace nada. */
export function useCerrarModal(): () => void {
  return useContext(Modal)?.cerrar ?? sinModal;
}
const sinModal = () => {};

/** Los botones del formulario, al pie del modal: fijos abajo mientras el formulario se desplaza (en el celular, la hoja). */
export function PieModal({ children }: { children: React.ReactNode }) {
  return <div className="sticky -bottom-4 -mx-4 -mb-4 flex flex-wrap gap-2 border-t border-border bg-popover p-4">{children}</div>;
}

/**
 * "Cancelar" al lado del botón principal: cierra sin guardar. "Listo" donde cada cambio ya se guardó al momento (una
 * lista que se edita fila por fila). "Volver" si el principal ya dice "Cancelar…" ("Cancelar reserva"). Fuera de un
 * modal no se muestra.
 */
export function CancelarModal({ texto = "Cancelar", focoInicial }: { texto?: "Cancelar" | "Listo" | "Volver"; focoInicial?: boolean }) {
  const modal = useContext(Modal);
  if (!modal) return null;
  return (
    <Button type="button" variant="outline" onClick={modal.cerrar} data-foco-inicial={focoInicial || undefined}>
      {texto}
    </Button>
  );
}
