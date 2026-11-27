import { useCallback, useRef, useState } from "react";
import { contenidoFormulario } from "@/componentes/panel/contenido-formulario";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/componentes/ui/dialog";
import { Modal } from "./modal-contexto";
import { PieModal } from "./modal-pie";
import { useSobreElTeclado } from "./modal-teclado";

// Componente de cliente: se usa dentro de otros componentes de cliente (recibe funciones como props).
// Un formulario corto en un modal (skill pantallas-panel): editar una sección de una ficha (SeccionConEditar) o crear
// algo de pocos campos ("Nuevo servicio"). En el celular es una hoja que sube desde abajo, con los botones fijos al pie;
// desde 640 px, el modal centrado. Revisión de los modales del 13/11 (y la de "Registrar pago", el mismo día):
// - la hoja sube y baja deslizándose (antes aparecía agrandándose desde el centro, como el modal de la computadora);
// - el título deja lugar a la X (con un nombre largo, "¿Desactivar a …?", la X tapaba su final);
// - con el teclado del iPhone abierto, la hoja se apoya sobre el teclado (`useSobreElTeclado`): Safari no achica la
//   pantalla al abrirlo, y la hoja pegada abajo quedaba detrás, con "Guardar" tapado.
// El foco va al primer campo para escribir al abrir (con `sinTeclado` y pantalla táctil, a la hoja) y el diálogo lo
// devuelve al botón que lo abrió al cerrar. El formulario de adentro lo cierra al guardar con useCerrarModal y
// pone sus botones en PieModal ("Cancelar" o "Listo" con CancelarModal).
// Ningún modal pierde lo escrito por un cierre sin querer (C6, sistema-del-panel.md §4; pulido 13.48): si el formulario de
// adentro cambió desde que se abrió, tocar afuera, Escape o el "atrás" de Android (Chrome lo avisa al diálogo) no cierran: el pie pasa
// a "Tienes cambios sin guardar." con "Seguir editando" y "Descartar cambios". Nunca otro modal encima (hasta el 11/11 era
// un segundo modal sobre el primero: en el celular, una hoja sobre otra). "Cancelar" y la X también preguntan (hallazgo 7
// de la prueba en celulares, 15/11: como en iOS y Android, cerrar con cambios nunca los descarta sin avisar; antes cerraban
// directo y en el iPhone la pregunta se veía un instante mientras el modal se iba). Sin cambios, todo cierra directo.
// "Listo" no pregunta: ahí cada cambio ya se guardó. Guardar no pregunta. Mientras se guarda no se puede cerrar.
// Partido en archivos (17/11): el contexto y los hooks de los formularios en modal-contexto, el pie y sus
// botones en modal-pie, el teclado del iPhone en modal-teclado y "¿Salir sin guardar?" en pregunta-salir.

/** Lo que dura un toque repetido: el mismo dedo llega como dos eventos casi juntos (hallazgo 7, iPhone). */
const TOQUE_REPETIDO_MS = 400;

/**
 * Dónde va el foco al abrir: el primer campo para escribir; si no hay (una lista), el primer botón habilitado. Una
 * confirmación de algo destructivo lo pone en "Cancelar" (`CancelarModal focoInicial`): un Enter no la confirma.
 * `sinTeclado`: con pantalla táctil, en la hoja misma (revisión del 13/11, "Registrar pago"). Ahí el campo ya viene
 * escrito (el monto, con el saldo) y lo primero es tocar otra cosa (cómo pagó): el foco en el campo abría solo el teclado
 * en Android, el primer toque lo cerraba, la hoja se movía bajo el dedo y el toque se perdía. Donde lo primero es
 * escribir (un nombre, una placa), el teclado abierto ayuda: queda en el campo.
 */
const habilitado = (selectores: string[]) => selectores.map((c) => `${c}:not(:disabled)`).join(", ");

const primerControl = (modal: HTMLElement | null, sinTeclado: boolean) =>
  modal?.querySelector<HTMLElement>("[data-foco-inicial]") ??
  (sinTeclado && window.matchMedia("(pointer: coarse)").matches ? modal : null) ??
  modal?.querySelector<HTMLElement>(habilitado(["input:not([type=hidden])", "textarea", "select"])) ??
  modal?.querySelector<HTMLElement>(habilitado(["button"])) ??
  true;

/** Chico (casi todos), mediano (una tabla o fotos) o grande: el ancho en la computadora; en el celular, la hoja de borde a borde (C7 §4.2). */
const TAMANO = { chico: "sm:max-w-[30rem]", mediano: "sm:max-w-[40rem]", grande: "sm:max-w-[50rem]" } as const;

type Props = {
  titulo: string;
  tamano?: keyof typeof TAMANO;
  /** Con pantalla táctil, abrir sin poner el foco en un campo (no abre solo el teclado): ver `primerControl`. */
  sinTeclado?: boolean;
  abierto: boolean;
  alCambiar: (abierto: boolean) => void;
  /** El formulario. */
  children: React.ReactNode;
};

export function ModalFormulario({ titulo, abierto, alCambiar, sinTeclado = false, tamano = "chico", children }: Props) {
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
  // Cuándo se pidió cerrar con un botón del modal ("Cancelar", la X) y cuándo apareció la pregunta (hallazgo 7). En el
  // iPhone, con el teclado abierto, un mismo toque llega dos veces: el botón y, como el modal baja al cerrarse el teclado,
  // un toque "afuera". Ese segundo no cuenta, y el toque que hizo aparecer la pregunta no cae en "Descartar cambios"
  const pedidoConBoton = useRef(0);
  const preguntaDesde = useRef(0);
  // Cierra sin preguntar: después de guardar, con "Listo" o con "Descartar cambios"
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
    preguntaDesde.current = Date.now();
    setPreguntando(true);
  };
  /** "Cancelar" o la X: lo mismo que un cierre sin querer, pero anotando que fue un botón. */
  const pedirCierreConBoton = () => {
    pedidoConBoton.current = Date.now();
    pedirCierre();
  };
  /**
   * "Descartar cambios": no si es el mismo toque que hizo aparecer la pregunta. Un toque que empezó en otro lado (en
   * "Cancelar", antes de que el pie cambiara) o antes de que apareciera la pregunta no cuenta. `apoyadoEn`: cuándo se
   * apoyó el dedo sobre este botón (null si no se apoyó); con el teclado (`conToque` falso) siempre descarta.
   */
  const descartar = (conToque: boolean, apoyadoEn: number | null) => {
    if (conToque && (apoyadoEn === null || apoyadoEn < preguntaDesde.current)) return;
    cerrar();
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
        // El toque "afuera" que repite al de un botón del modal (iPhone): no cuenta
        if (detalles.reason === "outside-press" && Date.now() - pedidoConBoton.current < TOQUE_REPETIDO_MS) return;
        // Ya preguntando, la X, otro Escape o "atrás" es seguir editando, salvo que ya no quede nada sin guardar
        if (preguntando) return hayCambios() ? seguir() : cerrar();
        // La X, como "Cancelar": con cambios, pregunta (hallazgo 7). Mientras se guarda, nada
        if (detalles.reason === "close-press") return pedirCierreConBoton();
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
          return primerControl(modal.current, sinTeclado);
        }}
        className={[
          "max-h-[calc(100dvh-2rem)] gap-5 overflow-y-auto text-base",
          TAMANO[tamano],
          // En el celular, la hoja: pegada abajo (sobre el teclado, si está abierto), de borde a borde y hasta donde se ve
          "max-sm:top-auto max-sm:bottom-[var(--tt-teclado,0px)] max-sm:max-h-[calc(var(--tt-alto-visible,100dvh)-1rem)] max-sm:max-w-full max-sm:translate-y-0 max-sm:rounded-b-none",
          // Sube deslizándose desde abajo y baja al cerrarse, sin agrandarse; con "reducir movimiento", solo aparece
          "max-sm:duration-200 max-sm:data-open:zoom-in-100 max-sm:data-closed:zoom-out-100",
          "max-sm:motion-safe:data-open:slide-in-from-bottom max-sm:motion-safe:data-closed:slide-out-to-bottom",
        ].join(" ")}
      >
        {/* Con lugar a la derecha para la X (44 px desde el borde): un título largo no queda debajo */}
        <DialogHeader className="pr-9">
          <DialogTitle>{titulo}</DialogTitle>
        </DialogHeader>
        <Modal.Provider value={{ cerrar, descartar, pedirCierre, pedirCierreConBoton, preguntando, seguir, conPie, renovarBase: tomarBase, hayCambios, fijarAdemas, fijarEnviando }}>
          {children}
          {/* Sin pie propio (raro): la pregunta va al final del modal */}
          {preguntando && !hayPie && <PieModal respaldo>{null}</PieModal>}
        </Modal.Provider>
      </DialogContent>
    </Dialog>
  );
}
