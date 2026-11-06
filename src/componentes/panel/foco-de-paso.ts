"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

// El foco en un formulario en pasos (Nueva cotización, pedido 40; Nueva reserva, pedido 41): al cambiar de paso, al
// primer campo del paso a la vista (sin mover la pantalla, que queda arriba con el indicador y el resumen); tras un
// error, al campo con error. El paso y los errores pueden llegar en dibujos distintos: se espera un par de dibujos a
// que el campo esté en pantalla. Lo que se hace después del await de una acción se dibuja antes que su resultado: con
// `esperar(resultado)`, el foco espera a que ese resultado esté a la vista, y no cae en el error del envío anterior.

const PRIMER_CAMPO = 'a[href], input:not([type="hidden"]), select, textarea, button, summary';
const CON_ERROR = '[aria-invalid="true"], [data-invalido]';

/** `primerCampo`: a qué va el foco al cambiar de paso (por defecto, lo primero que se puede tocar). */
export function useFocoDePaso(formulario: RefObject<HTMLFormElement | null>, paso: number, estado: unknown, primerCampo = PRIMER_CAMPO) {
  const [pedido, setPedido] = useState<{ n: number; error: boolean }>({ n: 0, error: false });
  const puesto = useRef(0);
  const intentos = useRef(0);
  const esperado = useRef<unknown>(null);

  // En cada dibujo: el pedido pendiente se cumple cuando su campo está en pantalla
  useEffect(() => {
    if (pedido.n === 0 || puesto.current === pedido.n) return;
    if (pedido.error && esperado.current !== null && estado !== esperado.current) return;
    const visible = formulario.current?.querySelector<HTMLElement>(`[data-paso="${paso}"]`);
    const objetivo = visible?.querySelector<HTMLElement>(pedido.error ? CON_ERROR : primerCampo);
    if (!objetivo) {
      intentos.current += 1;
      if (intentos.current > 2) puesto.current = pedido.n;
      return;
    }
    puesto.current = pedido.n;
    esperado.current = null;
    if (pedido.error) objetivo.scrollIntoView({ block: "center" });
    objetivo.focus({ preventScroll: true });
  });

  return {
    /** Pide el foco: al campo con error (`error`) o al primero del paso. */
    pedir(error: boolean) {
      intentos.current = 0;
      setPedido((p) => ({ n: p.n + 1, error }));
    },
    /** El resultado de la acción que trae el error: el foco con error espera a que esté a la vista. */
    esperar(resultado: unknown) {
      esperado.current = resultado;
    },
  };
}
