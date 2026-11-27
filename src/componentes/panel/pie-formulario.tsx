"use client";

import { cn } from "cn";
import { useEffect, useRef } from "react";
import { CELULAR } from "./celular";

// El botón principal de un formulario de crear (skill pantallas-panel, §2 "Crear"): al pie, y en el celular fijo abajo
// mientras el formulario se desplaza, así "Crear …" está siempre a mano del pulgar. Desde 640 px, al pie sin más.
//
// El pie dice cuánto ocupa (`--alto-pie-movil`): con eso se reserva su espacio al final de la página (el formulario no
// queda tapado) y el desplazamiento hasta un campo con el teclado lo deja a la vista. La regla de globals.css queda para
// antes de que cargue JavaScript. Los avisos del celular van arriba (sonner.tsx, 19/11).
//
// Mide su alto, no su posición, y solo cuando cambia de tamaño, nunca al desplazar (19/11, prueba en un iPhone 14): al
// estirar al final de la página, el rebote del iPhone movía la posición cuadro a cuadro, el pie cambiaba el alto de la
// página en pleno rebote y la página "tironeaba" contra el dedo. Desde que está siempre fijo abajo, lo que ocupa es su alto.

export function PieFormulario({ children, pegado = false }: { children: React.ReactNode; /** En los flujos de pasos: pegado abajo también en la computadora mientras se baja (24/11). */ pegado?: boolean }) {
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
        const valor = celular.matches && elemento?.isConnected ? `${Math.round(elemento.getBoundingClientRect().height)}px` : null;
        // Solo si cambió: escribir en <html> recalcula los estilos de toda la página
        if (valor === ultimo) return;
        ultimo = valor;
        if (valor) raiz.style.setProperty("--alto-pie-movil", valor);
        else raiz.style.removeProperty("--alto-pie-movil");
      });
    };
    medir();
    // Si el pie cambia de alto (sus botones pasan a dos renglones) o la pantalla de ancho
    const tamano = new ResizeObserver(medir);
    if (pie.current) tamano.observe(pie.current);
    window.addEventListener("resize", medir);
    celular.addEventListener("change", medir);
    return () => {
      cancelAnimationFrame(cuadro);
      tamano.disconnect();
      window.removeEventListener("resize", medir);
      celular.removeEventListener("change", medir);
      // Si en la pantalla queda otro pie (al cambiar de paso o de página), su medida sigue
      if (!document.querySelector("[data-pie-movil]")) raiz.style.removeProperty("--alto-pie-movil");
    };
  }, []);

  // En el celular, fijo al borde de abajo siempre (prueba en un iPhone 14, 19/11): pegado solo "mientras se pudiera"
  // (sticky), con un formulario corto quedaba a media pantalla y al final de la página se detenía sobre el margen. El
  // espacio de abajo, del alto del pie, deja ver el final del formulario; la zona del gesto de inicio del iPhone, libre
  return (
    <>
      <div
        ref={pie}
        data-pie-movil
        className={cn(
          "flex flex-wrap gap-2 max-sm:fixed max-sm:inset-x-0 max-sm:bottom-0 max-sm:z-30 max-sm:border-t max-sm:border-border max-sm:bg-background max-sm:px-4 max-sm:pt-3 max-sm:pb-[calc(0.75rem+env(safe-area-inset-bottom))]",
          // En la computadora, en un flujo de pasos: pegado abajo mientras se baja (con una lista larga, "Siguiente" quedaba al
          // final); con el contenido corto, queda justo debajo
          pegado && "sm:sticky sm:bottom-0 sm:z-20 sm:-mx-1 sm:border-t sm:border-border sm:bg-fondo-panel sm:px-1 sm:py-3",
        )}
      >
        {children}
      </div>
      <div aria-hidden className="h-(--alto-pie-movil) sm:hidden" />
    </>
  );
}
