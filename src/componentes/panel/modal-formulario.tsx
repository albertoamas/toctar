import { createContext, useActionState, useContext, useRef, useState } from "react";
import { useFocoEnError } from "@/componentes/foco-en-error";
import { conAviso } from "@/componentes/panel/avisos";
import { contenidoFormulario } from "@/componentes/panel/contenido-formulario";
import { Button } from "@/componentes/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/componentes/ui/dialog";
import type { EstadoFormulario } from "@/lib/formularios";

// Componente de cliente: se usa dentro de otros componentes de cliente (recibe funciones como props).
// Un formulario corto en un modal (skill pantallas-panel): editar una sección de una ficha (SeccionConEditar) o crear
// algo de pocos campos ("Agregar servicio"). En el celular es una hoja desde abajo con los botones fijos al pie; desde
// 640 px, el modal centrado. El foco va al primer campo para escribir al abrir y el diálogo lo devuelve al botón que lo
// abrió al cerrar. El formulario de adentro lo cierra al guardar con useCerrarModal y pone sus botones en PieModal
// ("Cancelar" o "Listo" con CancelarModal).
// Ningún modal pierde lo escrito sin preguntar (C6, sistema-del-panel.md §4): si el formulario de adentro cambió desde que
// se abrió, cerrarlo con "Cancelar", Escape o tocando afuera pregunta "¿Salir sin guardar?". Guardar no pregunta.

type ContextoModal = {
  /** Cierra sin preguntar: ya se guardó. */
  cerrar: () => void;
  /** Lo que pide la persona: pregunta si hay cambios sin guardar. */
  pedirCierre: () => void;
  /** Lo que tiene ahora el formulario pasa a ser lo guardado (una acción que guarda sin cerrar el modal). */
  renovarBase: () => void;
};

const Modal = createContext<ContextoModal | null>(null);

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
  // Lo que tenía el formulario al abrirse. Sin formulario (una lista, una confirmación), null: nunca pregunta
  const base = useRef<string | null>(null);
  const [preguntando, setPreguntando] = useState(false);

  const tomarBase = () => {
    const formulario = modal.current?.querySelector("form");
    base.current = formulario ? contenidoFormulario(formulario) : null;
  };
  const cerrar = () => {
    setPreguntando(false);
    alCambiar(false);
  };
  const pedirCierre = () => {
    const formulario = modal.current?.querySelector("form");
    if (formulario && base.current !== null && contenidoFormulario(formulario) !== base.current) setPreguntando(true);
    else cerrar();
  };

  return (
    <Dialog open={abierto} onOpenChange={(abrir) => (abrir ? alCambiar(true) : pedirCierre())}>
      <DialogContent
        ref={modal}
        initialFocus={() => {
          tomarBase();
          return primerControl(modal.current);
        }}
        className="max-h-[calc(100dvh-2rem)] gap-5 overflow-y-auto text-base max-sm:top-auto max-sm:bottom-0 max-sm:max-w-full max-sm:translate-y-0 max-sm:rounded-b-none sm:max-w-lg"
      >
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
        </DialogHeader>
        <Modal.Provider value={{ cerrar, pedirCierre, renovarBase: tomarBase }}>{children}</Modal.Provider>
        <ModalFormularioPregunta abierta={preguntando} alSeguir={() => setPreguntando(false)} alSalir={cerrar} />
      </DialogContent>
    </Dialog>
  );
}

/** "¿Salir sin guardar?", sobre el modal que tiene cambios. El foco, en la opción que no pierde nada. */
function ModalFormularioPregunta({ abierta, alSeguir, alSalir }: { abierta: boolean; alSeguir: () => void; alSalir: () => void }) {
  return (
    <ModalFormulario titulo="¿Salir sin guardar?" abierto={abierta} alCambiar={(abrir) => !abrir && alSeguir()}>
      <p>Tienes cambios sin guardar. Si sales, se pierden.</p>
      <PieModal>
        <CancelarModal texto="Seguir editando" focoInicial />
        <Button type="button" variant="destructive" onClick={alSalir}>
          Salir sin guardar
        </Button>
      </PieModal>
    </ModalFormulario>
  );
}

/** Para el formulario de un modal: lo cierra (después de guardar). Fuera de un modal no hace nada. */
export function useCerrarModal(): () => void {
  return useContext(Modal)?.cerrar ?? sinModal;
}

/** Para una acción que guarda sin cerrar el modal ("Volver al texto original"): lo que quedó ya no es un cambio. */
export function useRenovarBaseModal(): () => void {
  return useContext(Modal)?.renovarBase ?? sinModal;
}
const sinModal = () => {};

/**
 * Un formulario dentro de un modal: envía la acción con su aviso, cierra el modal al guardar y lleva el foco al primer
 * error. `e` son los errores por campo y `v` lo escrito, que vuelve si el servidor rechaza el envío.
 */
export function useFormularioEnModal(accion: (previo: EstadoFormulario, datos: FormData) => Promise<EstadoFormulario>) {
  const cerrar = useCerrarModal();
  const [estado, enviar, enviando] = useActionState<EstadoFormulario, FormData>(
    conAviso(accion, (r) => r.ok && cerrar()),
    {},
  );
  const formulario = useRef<HTMLFormElement>(null);
  useFocoEnError(formulario, estado);
  return { accion: enviar, enviando, formulario, e: estado.errores ?? {}, v: estado.valores };
}

/** Los botones del formulario, al pie del modal: fijos abajo mientras el formulario se desplaza (en el celular, la hoja). */
export function PieModal({ children }: { children: React.ReactNode }) {
  return <div className="sticky -bottom-4 -mx-4 -mb-4 flex flex-wrap gap-2 border-t border-border bg-popover p-4">{children}</div>;
}

/** El pie de un formulario de edición: guardar, que dice qué guarda, y "Cancelar". */
export function PieGuardar({ texto, enviando }: { texto: string; enviando: boolean }) {
  return (
    <PieModal>
      <Button type="submit" disabled={enviando}>
        {enviando ? "Guardando…" : texto}
      </Button>
      <CancelarModal />
    </PieModal>
  );
}

/**
 * "Cancelar" al lado del botón principal: cierra sin guardar, y pregunta si hay cambios. "Listo" donde cada cambio ya se
 * guardó al momento (una lista que se edita fila por fila). "Volver" si el principal ya dice "Cancelar…" ("Cancelar
 * reserva"). "Seguir editando" al preguntar antes de perder cambios. Fuera de un modal no se muestra.
 */
export function CancelarModal({ texto = "Cancelar", focoInicial }: { texto?: "Cancelar" | "Listo" | "Volver" | "Seguir editando"; focoInicial?: boolean }) {
  const modal = useContext(Modal);
  if (!modal) return null;
  return (
    <Button type="button" variant="outline" onClick={modal.pedirCierre} data-foco-inicial={focoInicial || undefined}>
      {texto}
    </Button>
  );
}
