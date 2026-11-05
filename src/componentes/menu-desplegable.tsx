"use client";

import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { MenuIcon } from "lucide-react";
import { BOTON_MENU, type PropsMenu } from "./menu-desplegable-comun";

// Menú desplegable del celular, compartido por el sitio y el panel.
// - Se cierra al tocar cualquier enlace: si no, queda abierto tapando la pantalla nueva.
// - Abrir y cerrar miden 44 × 44 px, el mínimo cómodo para el pulgar (BOTON_MENU).
// - La hoja (y su librería) se descarga aparte: cuando la página terminó de cargar, o antes si la persona apunta al
//   botón. Antes se descargaba con la página y le quitaba red a la primera pintura (pulido 2, rendimiento).
// - Apenas se descarga, se monta cerrada (no dibuja nada). Si se montaba recién al tocar, React la dejaba en espera
//   (Suspense) unos 300 ms y aparecía de golpe, ya abierta y sin animación: solo la primera vez después de cargar la
//   página, en el sitio y en el panel (medido el 05/11 en pruebas: 310 ms el primer toque, 5 ms los siguientes).

const cargarHoja = () => import("./menu-desplegable-hoja");
const HojaMenu = lazy(cargarHoja);

export function MenuDesplegable(props: PropsMenu) {
  const [abierto, setAbierto] = useState(false);
  // Montada (cerrada) desde que se descargó, y no se desmonta: así se ven las animaciones de abrir y de cerrar.
  const [usado, setUsado] = useState(false);
  const boton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let vigente = true;
    const montar = () => void cargarHoja().then(() => vigente && setUsado(true));
    // En un momento libre del navegador (Safari no tiene requestIdleCallback: va enseguida después de cargar).
    const precargar = () => {
      if ("requestIdleCallback" in window) requestIdleCallback(montar);
      else setTimeout(montar, 0);
    };
    if (document.readyState === "complete") precargar();
    else window.addEventListener("load", precargar, { once: true });
    return () => {
      vigente = false;
      window.removeEventListener("load", precargar);
    };
  }, []);

  function cambiar(nuevo: boolean) {
    setAbierto(nuevo);
    // Al cerrar, el foco vuelve al botón que lo abrió.
    if (!nuevo) boton.current?.focus();
  }

  return (
    <>
      <button
        ref={boton}
        type="button"
        className={BOTON_MENU}
        aria-haspopup="dialog"
        aria-expanded={abierto}
        onPointerEnter={() => void cargarHoja()}
        onFocus={() => void cargarHoja()}
        onClick={() => {
          setUsado(true);
          setAbierto(true);
        }}
      >
        <MenuIcon className="size-6" aria-hidden />
        <span className="sr-only">Abrir menú</span>
      </button>
      {usado && (
        <Suspense fallback={null}>
          <HojaMenu {...props} abierto={abierto} cambiar={cambiar} />
        </Suspense>
      )}
    </>
  );
}
