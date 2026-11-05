"use client";

import { useEffect, useRef, useState, type ComponentType } from "react";
import { MenuIcon } from "lucide-react";
import { BOTON_MENU, type PropsMenu } from "./menu-desplegable-comun";

// Menú desplegable del celular, compartido por el sitio y el panel.
// - Se cierra al tocar cualquier enlace: si no, queda abierto tapando la pantalla nueva.
// - Abrir y cerrar miden 44 × 44 px, el mínimo cómodo para el pulgar (BOTON_MENU).
// - La hoja (y su librería) se descarga aparte: cuando la página terminó de cargar, o antes si la persona apunta al
//   botón o llega con el teclado. Antes se descargaba con la página y le quitaba red a la primera pintura (pulido 2).
// - Siempre se monta cerrada y se abre en el cuadro siguiente, así se desliza también la primera vez (pulido 2B.18).
//   Antes iba con lazy() y Suspense: el primer toque después de cargar la página esperaba unos 300 ms (React demora
//   mostrar lo que estuvo en espera) y la hoja aparecía de golpe, ya abierta (medido el 05/11 en pruebas: 310 ms el
//   primer toque, 5 ms los siguientes). Ahora el componente descargado se guarda y se dibuja directo, sin Suspense.

type Hoja = ComponentType<PropsMenu & { abierto: boolean; cambiar: (abierto: boolean) => void }>;

const cargarHoja = () => import("./menu-desplegable-hoja").then((m) => m.default);

/** Dos cuadros: el primero dibuja la hoja cerrada; en el siguiente, abrirla ya se anima. */
const despuesDeDibujar = () => new Promise<void>((listo) => requestAnimationFrame(() => requestAnimationFrame(() => listo())));

export function MenuDesplegable(props: PropsMenu) {
  const [abierto, setAbierto] = useState(false);
  // La hoja ya descargada. Montada (cerrada) desde entonces y no se desmonta: así se ven las animaciones de abrir y cerrar
  const [HojaMenu, setHojaMenu] = useState<Hoja | null>(null);
  const cargada = useRef<Hoja | null>(null);
  const vigente = useRef(true);
  const boton = useRef<HTMLButtonElement>(null);

  /** Descarga la hoja y la monta cerrada. Si la descarga falla (sin señal, o un despliegue cambió los archivos), no la
   *  monta: el próximo toque lo vuelve a intentar, sin romper la página. */
  async function montar(): Promise<boolean> {
    if (cargada.current) return true;
    let hoja: Hoja;
    try {
      hoja = await cargarHoja();
    } catch {
      return false;
    }
    if (!vigente.current) return false;
    if (!cargada.current) {
      cargada.current = hoja;
      setHojaMenu(() => hoja);
    }
    return true;
  }

  useEffect(() => {
    vigente.current = true;
    let espera: number | undefined;
    // En un momento libre del navegador (Safari no tiene requestIdleCallback: va enseguida después de cargar)
    const precargar = () => {
      if ("requestIdleCallback" in window) espera = requestIdleCallback(() => void montar());
      else espera = globalThis.setTimeout(() => void montar(), 0) as unknown as number;
    };
    if (document.readyState === "complete") precargar();
    else window.addEventListener("load", precargar, { once: true });
    return () => {
      vigente.current = false;
      window.removeEventListener("load", precargar);
      if (espera !== undefined) {
        if ("cancelIdleCallback" in window) cancelIdleCallback(espera);
        clearTimeout(espera);
      }
    };
  }, []);

  async function abrir() {
    if (!cargada.current) {
      if (!(await montar())) return;
      await despuesDeDibujar();
    }
    setAbierto(true);
  }

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
        onPointerEnter={() => void montar()}
        onFocus={() => void montar()}
        onClick={() => void abrir()}
      >
        <MenuIcon className="size-6" aria-hidden />
        <span className="sr-only">Abrir menú</span>
      </button>
      {HojaMenu && <HojaMenu {...props} abierto={abierto} cambiar={cambiar} />}
    </>
  );
}
