"use client";

import { useEffect } from "react";
import { toast } from "sonner";

// El aviso de que algo salió bien, al llegar a otra pantalla después de guardar (la dirección trae, por ejemplo,
// `?agendada=1`): flotante y temporal, como los de los cambios en la misma pantalla (avisos.ts). Se muestra una vez por
// dirección en la sesión del navegador: recargar, volver atrás u otra acción en la misma pantalla no lo repiten, aunque
// la dirección siga igual o el texto cambie (el historial no sirve para anotarlo: el enrutador de Next lo reescribe). Si el
// navegador no deja guardarlo, el aviso sale igual. Con el `setTimeout`, el visor de avisos del panel ya está montado.

const DURACION = 5000; // Un poco más que en la misma pantalla: la vista también está cambiando

function yaSeMostro(clave: string): boolean {
  try {
    if (sessionStorage.getItem(clave)) return true;
    sessionStorage.setItem(clave, "1");
  } catch {
    // Almacenamiento bloqueado: el aviso importa más que no repetirlo
  }
  return false;
}

export function AvisoFlotante({ mensaje }: { mensaje: string }) {
  useEffect(() => {
    const pendiente = setTimeout(() => {
      if (!yaSeMostro(`aviso:${window.location.pathname}${window.location.search}`)) toast.success(mensaje, { duration: DURACION });
    }, 0);
    return () => clearTimeout(pendiente);
  }, [mensaje]);
  return null;
}
