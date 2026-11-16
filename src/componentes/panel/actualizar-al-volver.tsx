"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { debeActualizar } from "@/lib/actualizar-al-volver";

// Al volver a la app después de un rato fuera, la pantalla del panel se pone al día (hallazgo 4 de la prueba en
// celulares, 15/11): lo que guardó otra persona mientras tanto aparece sin recargar. `router.refresh()` vuelve a pedir
// los datos al servidor y conserva lo que hay en pantalla (el desplazamiento, lo escrito). Nunca con algo a medio hacer:
// una pantalla con cambios sin guardar (AvisoAlSalir lleva la cuenta en `data-pantalla-con-cambios`) o un modal, un
// menú o una lista desplegable a la vista. Sin conexión, espera a que vuelva: si no, Next recargaría la página entera y
// la app instalada mostraría el error del navegador.

/** Algo abierto y a la vista (una pantalla oculta por Next puede dejar el suyo en el documento, sin mostrarse). */
function hayAlgoAbiertoALaVista(): boolean {
  return [...document.querySelectorAll<HTMLElement>('[role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"]')].some((el) =>
    el.checkVisibility ? el.checkVisibility() : true,
  );
}

export function ActualizarAlVolver() {
  const router = useRouter();
  useEffect(() => {
    // Desde cuándo están los datos de la pantalla: se mide contra esto, no contra la última salida (varias salidas
    // cortas también suman)
    let datosDesde = Date.now();
    let estuvoFuera = false;
    const probar = () => {
      if (document.visibilityState !== "visible" || !estuvoFuera) return;
      if (!navigator.onLine) return; // al volver la conexión ("online"), se prueba de nuevo
      const hayCambios = document.documentElement.hasAttribute("data-pantalla-con-cambios");
      if (!debeActualizar({ fueraMs: Date.now() - datosDesde, hayCambios, hayAlgoAbierto: hayAlgoAbiertoALaVista() })) return;
      estuvoFuera = false;
      datosDesde = Date.now();
      router.refresh();
    };
    const alCambiar = () => {
      if (document.visibilityState === "hidden") estuvoFuera = true;
      else probar();
    };
    document.addEventListener("visibilitychange", alCambiar);
    window.addEventListener("online", probar);
    return () => {
      document.removeEventListener("visibilitychange", alCambiar);
      window.removeEventListener("online", probar);
    };
  }, [router]);
  return null;
}
