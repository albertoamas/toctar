import { useContext, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/componentes/ui/button";
import { Modal } from "./modal-contexto";

// El pie de un formulario en un modal (ModalFormulario): sus botones y, con un cierre sin querer con cambios, la
// pregunta "Tienes cambios sin guardar." en el mismo pie (pulido 13.48; hallazgo 7).

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
  // Cuándo se apoyó el dedo sobre "Descartar cambios" (hallazgo 7)
  const apoyado = useRef<number | null>(null);
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
        <Button
          type="button"
          variant="destructive"
          onPointerDown={() => (apoyado.current = Date.now())}
          onClick={(e) => {
            // detail: cuántos toques o clics; 0 si lo activó el teclado
            modal.descartar(e.detail > 0, apoyado.current);
            apoyado.current = null;
          }}
        >
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
 * "Cancelar" al lado del botón principal: cierra sin guardar; con cambios, antes pregunta (hallazgo 7). "Listo"
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
  // "Cancelar" y "Volver", con cambios, preguntan antes de descartarlos (hallazgo 7). "Listo": cada cambio ya se guardó
  return (
    <Button type="button" variant="outline" disabled={ocupado} onClick={texto === "Listo" ? modal.cerrar : modal.pedirCierreConBoton} data-foco-inicial={focoInicial || undefined}>
      {texto}
    </Button>
  );
}
