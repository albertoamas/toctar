"use client";

import { useSyncExternalStore } from "react";
import { WifiOffIcon } from "lucide-react";

// Franja del panel cuando se corta internet (HU-06, RNF-03). No hay modo sin conexión:
// avisa que lo que se haga no se va a guardar hasta que vuelva la conexión.

function suscribir(avisar: () => void) {
  window.addEventListener("online", avisar);
  window.addEventListener("offline", avisar);
  return () => {
    window.removeEventListener("online", avisar);
    window.removeEventListener("offline", avisar);
  };
}

export function AvisoConexion() {
  const conectado = useSyncExternalStore(suscribir, () => navigator.onLine, () => true);
  return (
    <div aria-live="polite">
      {!conectado && (
        // Ámbar del tema oscuro (--aviso #f2b33d) con texto negro: se lee al sol.
        <p data-theme="oscuro" className="flex items-center gap-2 bg-aviso px-4 py-2 text-sm font-semibold text-negro">
          <WifiOffIcon className="size-4 shrink-0" aria-hidden />
          Sin conexión. Los cambios no se guardarán hasta que vuelva internet.
        </p>
      )}
    </div>
  );
}
