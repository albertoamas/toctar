"use client";

import { useEffect } from "react";

// Registra public/sw.js (HU-06): muestra la página "Sin conexión" si una navegación falla sin internet.
// Solo en producción: en desarrollo interferiría con la recarga en caliente.
export function RegistrarServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {
      // Sin service worker el panel funciona igual; solo no se ve el aviso sin conexión.
    });
  }, []);
  return null;
}
