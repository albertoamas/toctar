import { useEffect, useRef } from "react";

// Los pasos de un formulario en el historial del navegador (pedidos 40 y 41): cada paso deja su "#" en la dirección
// (#vehiculo, #fecha…), así el botón Atrás del celular vuelve al paso anterior y no sale del formulario. Lo usan Nueva
// cotización y la reserva sin cotización. Aquí va el mecanismo, que era igual en los dos (17/11): escuchar Atrás y
// Adelante, quitar un "#" que quedó de antes al entrar (siempre se empieza por el primer paso) y llamar siempre a la
// regla más nueva. Qué paso mostrar y qué revisar al ir adelante es de cada formulario: `alCambiar`.

/** `alCambiar`: lo que hace el formulario cuando cambia el "#" (puede leer el estado de ese momento). `activo`: sin pasos, nada. */
export function usePasosEnHistorial(alCambiar: () => void, activo = true) {
  // La regla más nueva: el que escucha se registra una vez y llama siempre a esta
  const regla = useRef(alCambiar);
  useEffect(() => {
    regla.current = alCambiar;
  });
  useEffect(() => {
    if (!activo) return;
    if (window.location.hash) window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search);
    const escuchar = () => regla.current();
    window.addEventListener("popstate", escuchar);
    return () => window.removeEventListener("popstate", escuchar);
  }, [activo]);
}
