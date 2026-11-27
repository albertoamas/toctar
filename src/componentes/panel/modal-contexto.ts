import { createContext, useActionState, useContext, useEffect, useRef } from "react";
import { useFocoEnError } from "@/componentes/foco-en-error";
import { conAviso } from "@/componentes/panel/avisos";
import type { EstadoFormulario } from "@/lib/formularios";

// El modal y su formulario (ModalFormulario): el contexto que los conecta y los hooks que usa el formulario de
// adentro (cerrar al guardar, avisar un cambio que no es un campo, renovar lo guardado, saber si hay cambios).

type ContextoModal = {
  /** Cierra sin preguntar: ya se guardó, o la persona eligió "Descartar cambios". */
  cerrar: () => void;
  /** "Descartar cambios": cierra, salvo que sea el mismo toque que hizo aparecer la pregunta. */
  descartar: (conToque: boolean, apoyadoEn: number | null) => void;
  /** Un cierre que puede ser sin querer: con cambios, pregunta en el pie del modal. */
  pedirCierre: () => void;
  /** "Cancelar" o la X: con cambios, pregunta; y el toque "afuera" que lo repite no cuenta. */
  pedirCierreConBoton: () => void;
  /** Está preguntando: el pie muestra "Seguir editando" y "Descartar cambios" en lugar de sus botones. */
  preguntando: boolean;
  /** "Seguir editando": vuelve el pie de siempre. */
  seguir: () => void;
  /** Un pie (PieModal) está a la vista: la pregunta va en él; si no hay, al final del modal. */
  conPie: (hay: boolean) => void;
  /** Lo que tiene ahora el formulario pasa a ser lo guardado (una acción que guarda sin cerrar el modal). */
  renovarBase: () => void;
  /** El formulario tiene algo distinto de lo que tenía al abrirse (o de la última base). */
  hayCambios: () => boolean;
  /** Hay un cambio que no es un campo del formulario (una foto elegida). */
  fijarAdemas: (hay: boolean) => void;
  /** El formulario se está guardando. */
  fijarEnviando: (enviando: boolean) => void;
};

export const Modal = createContext<ContextoModal | null>(null);

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

/** Si el formulario del modal tiene cambios sin guardar, con la misma cuenta que usa el modal para preguntar al cerrar. */
export function useHayCambiosModal(): () => boolean {
  return useContext(Modal)?.hayCambios ?? sinCambios;
}

const sinCambios = () => false;

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
