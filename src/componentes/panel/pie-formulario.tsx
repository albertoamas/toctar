"use client";

import { useEffect, useRef } from "react";
import { CELULAR } from "./celular";

// El botón principal de un formulario de crear (skill pantallas-panel, §2 "Crear"): al pie, y en el celular fijo abajo
// mientras el formulario se desplaza, así "Crear …" está siempre a mano del pulgar. Desde 640 px, al pie sin más.
//
// Los avisos flotantes del celular se ponen encima del pie (`--alto-pie-movil`, sonner.tsx). El pie no siempre está
// pegado abajo: al final de la pantalla queda en su lugar, al cierre de la tarjeta, más arriba. Con una medida fija, el
// aviso caía sobre "Recibir vehículo" y no se podía tocar mientras duraba (10/11, lo vio hu-33-checklist en el CI). Por
// eso el pie dice cuánto ocupa desde el borde de abajo cada vez que se mueve: al desplazar, al cambiar el tamaño de la
// pantalla y cuando algo de la página lo corre. La regla de globals.css queda para antes de que cargue JavaScript.


/**
 * Cuánto ocupa el pie desde el borde de abajo de la pantalla, en px. Contra el alto del diseño (`clientHeight`, no
 * `innerHeight`, que cambia con el teclado y el zoom): es contra lo que se ubican el pie y el aviso. 0 si el pie no está
 * a la vista (más abajo o ya pasado arriba): el aviso va al borde.
 */
function altoDesdeAbajo(pie: HTMLElement) {
  const alto = document.documentElement.clientHeight;
  const { top, bottom } = pie.getBoundingClientRect();
  if (top >= alto || bottom <= 0) return 0;
  return Math.round(Math.min(alto, alto - top));
}

export function PieFormulario({ children }: { children: React.ReactNode }) {
  const pie = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const raiz = document.documentElement;
    const celular = window.matchMedia(CELULAR);
    let cuadro = 0;
    let ultimo: string | null = null;
    const medir = () => {
      cancelAnimationFrame(cuadro);
      cuadro = requestAnimationFrame(() => {
        // El pie de ahora (no uno guardado al montar: React puede haberlo reemplazado)
        const elemento = pie.current;
        const valor = celular.matches && elemento?.isConnected ? `${altoDesdeAbajo(elemento)}px` : null;
        // Solo si cambió: escribir en <html> recalcula los estilos de toda la página
        if (valor === ultimo) return;
        ultimo = valor;
        if (valor) raiz.style.setProperty("--alto-pie-movil", valor);
        else raiz.style.removeProperty("--alto-pie-movil");
      });
    };
    medir();
    // El pie y la página: si algo de arriba crece o se achica (un error, una foto, un plegado), el pie se corre
    const tamano = new ResizeObserver(medir);
    if (pie.current) tamano.observe(pie.current);
    tamano.observe(document.body);
    window.addEventListener("scroll", medir, { passive: true });
    window.addEventListener("resize", medir);
    celular.addEventListener("change", medir);
    return () => {
      cancelAnimationFrame(cuadro);
      tamano.disconnect();
      window.removeEventListener("scroll", medir);
      window.removeEventListener("resize", medir);
      celular.removeEventListener("change", medir);
      // Si en la pantalla queda otro pie (al cambiar de paso o de página), su medida sigue
      if (!document.querySelector("[data-pie-movil]")) raiz.style.removeProperty("--alto-pie-movil");
    };
  }, []);

  return (
    <div
      ref={pie}
      data-pie-movil
      className="flex flex-wrap gap-2 max-sm:sticky max-sm:bottom-0 max-sm:z-10 max-sm:-mx-4 max-sm:border-t max-sm:border-border max-sm:bg-background max-sm:px-4 max-sm:py-3"
    >
      {children}
    </div>
  );
}
