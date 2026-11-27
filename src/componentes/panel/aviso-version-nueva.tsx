"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { hayVersionNueva } from "@/lib/version";

// Pedido 39 (etapas/P39-version-nueva.md): avisa que se publicó una versión nueva del sistema. Quien tiene el panel
// abierto, sobre todo en la app instalada, sigue en la versión vieja hasta recargar, y algunas acciones pueden fallar.
// Se revisa al abrir el panel, al volver a la app y cada 10 minutos con la pantalla a la vista. El aviso no se va solo y
// no recarga sin preguntar: la persona puede estar a mitad de un formulario. Si lo cierra, no se repite por esa misma
// versión, pero sí si después se publica otra: la app instalada casi nunca se cierra.

const PROPIA = process.env.NEXT_PUBLIC_VERSION_APP;
const CADA = 10 * 60 * 1000;
const ID_AVISO = "version-nueva";

export function AvisoVersionNueva() {
  useEffect(() => {
    // La última versión publicada que se avisó (a la vista o ya cerrada)
    let avisada: string | undefined;
    let revisando = false;
    let vigente = true;

    async function revisar() {
      if (revisando || document.visibilityState !== "visible") return;
      revisando = true;
      try {
        const respuesta = await fetch("/api/version", { cache: "no-store" });
        if (!respuesta.ok) return;
        const publicada = ((await respuesta.json()) as { version?: string }).version;
        if (!vigente || !hayVersionNueva(PROPIA, publicada) || publicada === avisada) return;
        avisada = publicada;
        toast.info("Hay una versión nueva del sistema", {
          id: ID_AVISO,
          description: "Actualiza para seguir con lo último.",
          duration: Infinity,
          closeButton: true,
          action: { label: "Actualizar", onClick: () => window.location.reload() },
        });
      } catch {
        // Sin conexión: el aviso de conexión ya lo dice; se vuelve a revisar después
      } finally {
        revisando = false;
      }
    }

    void revisar();
    const intervalo = window.setInterval(() => void revisar(), CADA);
    const alVolver = () => void revisar();
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      vigente = false;
      window.clearInterval(intervalo);
      document.removeEventListener("visibilitychange", alVolver);
    };
  }, []);

  return null;
}
