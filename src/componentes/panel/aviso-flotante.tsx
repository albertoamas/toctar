"use client";

import { useEffect } from "react";
import { toast } from "sonner";

// El aviso de que algo salió bien, al llegar a otra pantalla después de guardar (la dirección trae, por ejemplo,
// `?agendada=1`): flotante y temporal, como los de los cambios en la misma pantalla (avisos.ts). Se muestra una vez por
// visita: queda anotado en el historial, así recargar o volver atrás no lo repite aunque la dirección siga igual. Con el
// aviso en el `setTimeout` el visor de avisos del panel ya está montado aunque la página haya cargado de una.

const DURACION = 5000; // Un poco más que en la misma pantalla: la vista también está cambiando

export function AvisoFlotante({ mensaje }: { mensaje: string }) {
  useEffect(() => {
    const pendiente = setTimeout(() => {
      if (window.history.state?.avisoMostrado === mensaje) return;
      toast.success(mensaje, { duration: DURACION });
      window.history.replaceState({ ...window.history.state, avisoMostrado: mensaje }, "");
    }, 0);
    return () => clearTimeout(pendiente);
  }, [mensaje]);
  return null;
}
