"use client";

import { useEffect, useRef } from "react";

// El botón principal de un formulario de crear (skill pantallas-panel, §2 "Crear"): al pie, y en el celular fijo abajo
// mientras el formulario se desplaza, así "Crear …" está siempre a mano del pulgar. Desde 640 px, al pie sin más.
//
// Los avisos flotantes del celular se ponen encima del pie (`--alto-pie-movil`, sonner.tsx). El pie no siempre está
// pegado abajo: al final de la pantalla queda en su lugar, al cierre de la tarjeta, más arriba. Con una medida fija, el
// aviso caía sobre "Recibir vehículo" y no se podía tocar mientras duraba (10/11, lo vio hu-33-checklist en el CI). Por
// eso el pie dice cuánto ocupa desde el borde de abajo cada vez que se mueve. La regla de globals.css queda para antes de
// que cargue JavaScript.

/** Cuánto ocupa el pie desde el borde de abajo de la pantalla, en px (0 si está fuera de la vista, más abajo). */
function altoDesdeAbajo(pie: HTMLElement) {
  return Math.max(0, Math.round(window.innerHeight - pie.getBoundingClientRect().top));
}

export function PieFormulario({ children }: { children: React.ReactNode }) {
  const pie = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const elemento = pie.current;
    if (!elemento) return;
    const raiz = document.documentElement;
    const celular = window.matchMedia("(max-width: 639px)");
    let cuadro = 0;
    const medir = () => {
      cancelAnimationFrame(cuadro);
      cuadro = requestAnimationFrame(() => {
        if (celular.matches) raiz.style.setProperty("--alto-pie-movil", `${altoDesdeAbajo(elemento)}px`);
        else raiz.style.removeProperty("--alto-pie-movil");
      });
    };
    medir();
    const tamano = new ResizeObserver(medir);
    tamano.observe(elemento);
    window.addEventListener("scroll", medir, { passive: true });
    window.addEventListener("resize", medir);
    celular.addEventListener("change", medir);
    return () => {
      cancelAnimationFrame(cuadro);
      tamano.disconnect();
      window.removeEventListener("scroll", medir);
      window.removeEventListener("resize", medir);
      celular.removeEventListener("change", medir);
      raiz.style.removeProperty("--alto-pie-movil");
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
