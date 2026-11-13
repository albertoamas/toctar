import { createContext, useActionState, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { useFocoEnError } from "@/componentes/foco-en-error";
import { conAviso } from "@/componentes/panel/avisos";
import { contenidoFormulario } from "@/componentes/panel/contenido-formulario";
import { Button } from "@/componentes/ui/button";
import { AlertDialog } from "@base-ui/react/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/componentes/ui/dialog";
import type { EstadoFormulario } from "@/lib/formularios";

// Componente de cliente: se usa dentro de otros componentes de cliente (recibe funciones como props).
// Un formulario corto en un modal (skill pantallas-panel): editar una sección de una ficha (SeccionConEditar) o crear
// algo de pocos campos ("Agregar servicio"). En el celular es una hoja que sube desde abajo, con los botones fijos al pie;
// desde 640 px, el modal centrado. Revisión de los modales del 13/11:
// - la hoja sube y baja deslizándose (antes aparecía agrandándose desde el centro, como el modal de la computadora);
// - el título deja lugar a la X (con un nombre largo, "¿Desactivar a …?", la X tapaba su final);
// - con el teclado del iPhone abierto, la hoja se apoya sobre el teclado (`useSobreElTeclado`): Safari no achica la
//   pantalla al abrirlo, y la hoja pegada abajo quedaba detrás, con "Guardar" tapado. El foco va al primer campo para escribir al abrir y el diálogo lo devuelve al botón que lo
// abrió al cerrar. El formulario de adentro lo cierra al guardar con useCerrarModal y pone sus botones en PieModal
// ("Cancelar" o "Listo" con CancelarModal).
// Ningún modal pierde lo escrito por un cierre sin querer (C6, sistema-del-panel.md §4; pulido 13.48): si el formulario de
// adentro cambió desde que se abrió, tocar afuera, Escape o el "atrás" de Android (Chrome lo avisa al diálogo) no cierran: el pie pasa
// a "Tienes cambios sin guardar." con "Seguir editando" y "Descartar cambios". Nunca otro modal encima (hasta el 11/11 era
// un segundo modal sobre el primero: en el celular, una hoja sobre otra). "Cancelar" y la X cierran sin preguntar: son una
// decisión. Guardar no pregunta. Mientras se guarda no se puede cerrar.

type ContextoModal = {
  /** Cierra sin preguntar: ya se guardó, o la persona eligió "Cancelar". */
  cerrar: () => void;
  /** Un cierre que puede ser sin querer: con cambios, pregunta en el pie del modal. */
  pedirCierre: () => void;
  /** Está preguntando: el pie muestra "Seguir editando" y "Descartar cambios" en lugar de sus botones. */
  preguntando: boolean;
  /** "Seguir editando": vuelve el pie de siempre. */
  seguir: () => void;
  /** Un pie (PieModal) está a la vista: la pregunta va en él; si no hay, al final del modal. */
  conPie: (hay: boolean) => void;
  /** Lo que tiene ahora el formulario pasa a ser lo guardado (una acción que guarda sin cerrar el modal). */
  renovarBase: () => void;
  /** Hay un cambio que no es un campo del formulario (una foto elegida). */
  fijarAdemas: (hay: boolean) => void;
  /** El formulario se está guardando. */
  fijarEnviando: (enviando: boolean) => void;
};

const Modal = createContext<ContextoModal | null>(null);

/** El celular: hasta 640 px, donde el modal es una hoja desde abajo (el `sm` de Tailwind). */
const CELULAR = "(width < 40rem)";

/**
 * Con el teclado abierto, la hoja se apoya sobre él. Safari (y todo navegador del iPhone) no achica la pantalla al
 * abrir el teclado: solo la parte visible (`visualViewport`). Se miden cuánto tapa el teclado y cuánto alto queda, y la
 * hoja los usa (`--tt-teclado` y `--tt-alto-visible`, en sus clases). En Android el navegador ya achica la pantalla: el
 * teclado mide 0 y no cambia nada. Sin `visualViewport` (navegadores viejos), queda como siempre.
 */
function useSobreElTeclado(modal: React.RefObject<HTMLDivElement | null>, abierto: boolean) {
  useEffect(() => {
    const vista = window.visualViewport;
    if (!abierto || !vista) return;
    let cuadro = 0;
    const medir = () => {
      const hoja = modal.current;
      // Todavía no se dibujó (se abre en un portal): se vuelve a probar en el próximo cuadro
      if (!hoja) {
        cuadro = requestAnimationFrame(medir);
        return;
      }
      if (!window.matchMedia(CELULAR).matches) {
        hoja.style.removeProperty("--tt-teclado");
        hoja.style.removeProperty("--tt-alto-visible");
        return;
      }
      const teclado = Math.max(0, Math.round(window.innerHeight - vista.height - vista.offsetTop));
      hoja.style.setProperty("--tt-teclado", `${teclado}px`);
      hoja.style.setProperty("--tt-alto-visible", `${Math.round(vista.height)}px`);
    };
    medir();
    vista.addEventListener("resize", medir);
    vista.addEventListener("scroll", medir);
    return () => {
      cancelAnimationFrame(cuadro);
      vista.removeEventListener("resize", medir);
      vista.removeEventListener("scroll", medir);
    };
  }, [modal, abierto]);
}

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
  const ademas = useRef(false);
  const enviando = useRef(false);
  // El último lugar del modal con el foco, fuera de la pregunta: "Seguir editando" lo devuelve ahí (el campo que se estaba editando)
  const focoPrevio = useRef<HTMLElement | null>(null);
  const [preguntando, setPreguntando] = useState(false);
  const [hayPie, setHayPie] = useState(false);
  // La pantalla puede cerrarlo por su cuenta (al terminar una acción): la pregunta no queda para la próxima vez
  if (!abierto && preguntando) setPreguntando(false);

  const tomarBase = useCallback(() => {
    const formulario = modal.current?.querySelector("form");
    base.current = formulario ? contenidoFormulario(formulario) : null;
  }, []);
  const fijarAdemas = useCallback((hay: boolean) => {
    ademas.current = hay;
  }, []);
  const fijarEnviando = useCallback((valor: boolean) => {
    enviando.current = valor;
  }, []);
  // Cierra: después de guardar, o por decisión ("Cancelar" está desactivado mientras se guarda)
  const cerrar = () => {
    setPreguntando(false);
    alCambiar(false);
  };
  const hayCambios = () => {
    const formulario = modal.current?.querySelector("form");
    const cambio = !!formulario && base.current !== null && contenidoFormulario(formulario) !== base.current;
    return cambio || ademas.current;
  };
  const pedirCierre = () => {
    if (enviando.current) return;
    if (!hayCambios()) return cerrar();
    setPreguntando(true);
  };
  const seguir = useCallback(() => {
    // Primero el foco al campo (sigue a la vista): si se esperara a que se vaya la pregunta, el diálogo lo tomaría antes
    if (focoPrevio.current?.isConnected) focoPrevio.current.focus();
    setPreguntando(false);
  }, []);
  const conPie = useCallback((hay: boolean) => setHayPie(hay), []);
  useSobreElTeclado(modal, abierto);

  return (
    <Dialog
      open={abierto}
      onOpenChange={(abrir, detalles) => {
        if (abrir) return alCambiar(true);
        // La X es una decisión, como "Cancelar": cierra sin preguntar (no mientras se guarda)
        if (detalles.reason === "close-press") return enviando.current ? undefined : cerrar();
        // Ya preguntando, otro Escape (o "atrás") es seguir editando, salvo que ya no quede nada sin guardar
        if (preguntando) return hayCambios() ? seguir() : cerrar();
        // Tocar afuera, Escape o el "atrás" del celular pueden ser sin querer
        pedirCierre();
      }}
    >
      <DialogContent
        ref={modal}
        onFocusCapture={(e) => {
          const elemento = e.target as HTMLElement;
          if (!elemento.closest("[data-pregunta-salir]")) focoPrevio.current = elemento;
        }}
        initialFocus={() => {
          tomarBase();
          return primerControl(modal.current);
        }}
        className={[
          "max-h-[calc(100dvh-2rem)] gap-5 overflow-y-auto text-base sm:max-w-lg",
          // En el celular, la hoja: pegada abajo (sobre el teclado, si está abierto), de borde a borde y hasta donde se ve
          "max-sm:top-auto max-sm:bottom-[var(--tt-teclado,0px)] max-sm:max-h-[calc(var(--tt-alto-visible,100dvh)-1rem)] max-sm:max-w-full max-sm:translate-y-0 max-sm:rounded-b-none",
          // Sube deslizándose desde abajo y baja al cerrarse, sin agrandarse; con "reducir movimiento", solo aparece
          "max-sm:duration-200 max-sm:data-open:zoom-in-100 max-sm:data-closed:zoom-out-100 max-sm:data-open:slide-in-from-bottom max-sm:data-closed:slide-out-to-bottom",
          "max-sm:motion-reduce:data-open:slide-in-from-bottom-0 max-sm:motion-reduce:data-closed:slide-out-to-bottom-0",
        ].join(" ")}
      >
        {/* Con lugar a la derecha para la X (44 px desde el borde): un título largo no queda debajo */}
        <DialogHeader className="pr-9">
          <DialogTitle>{titulo}</DialogTitle>
        </DialogHeader>
        <Modal.Provider value={{ cerrar, pedirCierre, preguntando, seguir, conPie, renovarBase: tomarBase, fijarAdemas, fijarEnviando }}>
          {children}
          {/* Sin pie propio (raro): la pregunta va al final del modal */}
          {preguntando && !hayPie && <PieModal respaldo>{null}</PieModal>}
        </Modal.Provider>
      </DialogContent>
    </Dialog>
  );
}

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

/** Para el formulario de un modal: lo cierra (después de guardar). Fuera de un modal no hace nada. */
export function useCerrarModal(): () => void {
  return useContext(Modal)?.cerrar ?? sinModal;
}

/** Para lo que el modal no ve en el formulario (una foto que vive en el estado): elegirla también es un cambio. */
export function useCambioFueraDelFormulario(hay: boolean) {
  const fijarAdemas = useContext(Modal)?.fijarAdemas;
  useEffect(() => fijarAdemas?.(hay), [fijarAdemas, hay]);
}

/**
 * Lo que tiene ahora el formulario ya no es un cambio. Para una acción que guarda sin cerrar el modal ("Volver al texto
 * original") y para lo que termina de cargar con el modal abierto (los espacios libres). Se llama desde un efecto, con los
 * valores nuevos ya dibujados. Siempre es la misma función.
 */
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

/**
 * Los botones del formulario, al pie del modal: fijos abajo mientras el formulario se desplaza (en el celular, la hoja).
 * Si el modal está preguntando (un cierre sin querer con cambios), el pie pasa a "Tienes cambios sin guardar." con
 * "Seguir editando" (con el foco) y "Descartar cambios": la pregunta, en el mismo modal (pulido 13.48).
 */
export function PieModal({ children, respaldo = false }: { children: React.ReactNode; /** El del modal sin pie propio: no se cuenta. */ respaldo?: boolean }) {
  const modal = useContext(Modal);
  const conPie = respaldo ? undefined : modal?.conPie;
  useEffect(() => {
    conPie?.(true);
    return () => conPie?.(false);
  }, [conPie]);
  const seguir = useRef<HTMLButtonElement>(null);
  const preguntando = modal?.preguntando ?? false;
  useEffect(() => {
    if (preguntando) seguir.current?.focus();
  }, [preguntando]);
  const pregunta = modal && preguntando && (
    // Un grupo con su título (no "alert": el foco ya va a "Seguir editando" y se oiría dos veces)
    <div role="group" aria-labelledby="pregunta-salir-titulo" data-pregunta-salir className="sticky -bottom-4 -mx-4 -mb-4 flex flex-col gap-3 border-t border-aviso bg-aviso-fondo p-4">
      <p id="pregunta-salir-titulo" className="font-semibold text-aviso">
        Tienes cambios sin guardar.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button ref={seguir} type="button" variant="outline" className="bg-popover" onClick={modal.seguir}>
          Seguir editando
        </Button>
        <Button type="button" variant="destructive" onClick={modal.cerrar}>
          Descartar cambios
        </Button>
      </div>
    </div>
  );
  return (
    <>
      {pregunta}
      {/* Mientras pregunta, el pie de siempre queda montado pero oculto: su botón sigue diciendo si se está guardando */}
      <div hidden={!!pregunta} className="sticky -bottom-4 -mx-4 -mb-4 flex flex-wrap gap-2 border-t border-border bg-popover p-4">
        {children}
      </div>
    </>
  );
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
 * "Cancelar" al lado del botón principal: cierra sin guardar y sin preguntar (es una decisión, pulido 13.48). "Listo"
 * donde cada cambio ya se guardó al momento (una lista que se edita fila por fila). "Volver" si el principal ya dice
 * "Cancelar…" ("Cancelar reserva"). Fuera de un modal no se muestra.
 */
export function CancelarModal(props: {
  texto?: "Cancelar" | "Listo" | "Volver";
  focoInicial?: boolean;
  /** Para un formulario que envía por su cuenta (con una foto que achicar): los demás lo avisan solos. */
  enviando?: boolean;
}) {
  const { texto = "Cancelar", focoInicial, enviando = false } = props;
  const modal = useContext(Modal);
  const { pending } = useFormStatus();
  const ocupado = enviando || pending;
  const fijarEnviando = modal?.fijarEnviando;
  useEffect(() => fijarEnviando?.(ocupado), [fijarEnviando, ocupado]);
  if (!modal) return null;
  // "Volver" acompaña a una acción que pide escribir (el motivo de "Cancelar reserva"): no parece descartar, así que pregunta
  return (
    <Button type="button" variant="outline" disabled={ocupado} onClick={texto === "Volver" ? modal.pedirCierre : modal.cerrar} data-foco-inicial={focoInicial || undefined}>
      {texto}
    </Button>
  );
}
