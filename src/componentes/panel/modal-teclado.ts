import { useEffect } from "react";
import { CELULAR } from "./celular";

// La hoja del modal sobre el teclado del iPhone (ModalFormulario).

/**
 * Con el teclado abierto, la hoja se apoya sobre él. Safari (y todo navegador del iPhone) no achica la pantalla al
 * abrir el teclado: solo la parte visible (`visualViewport`). Se mide cuánto tapa el teclado contra el alto del diseño
 * (`clientHeight`, el que usa `position: fixed`; `innerHeight` puede cambiar con el teclado), y la hoja lo usa
 * (`--tt-teclado` y `--tt-alto-visible`, en sus clases). Solo con teclado: sin él quedan `bottom: 0` y `100dvh`. En
 * Android el navegador ya achica la pantalla y el teclado mide 0. Con la página ampliada con los dedos (`scale` distinto
 * de 1) no se toca: la parte visible chica es el zoom, no un teclado. Sin `visualViewport`, queda como siempre.
 */
export function useSobreElTeclado(modal: React.RefObject<HTMLDivElement | null>, abierto: boolean) {
  useEffect(() => {
    const vista = window.visualViewport;
    if (!abierto || !vista) return;
    const celular = window.matchMedia(CELULAR);
    let cuadro = 0;
    let intentos = 0;
    let anterior = "";
    // La hoja que se midió: al cerrar, la limpieza la usa (modal.current ya puede no estar)
    let medida: HTMLElement | null = null;
    const limpiar = (hoja: HTMLElement | null) => {
      hoja?.style.removeProperty("--tt-teclado");
      hoja?.style.removeProperty("--tt-alto-visible");
      anterior = "";
    };
    const medir = () => {
      cuadro = 0;
      const hoja = modal.current;
      // Todavía no se dibujó (se abre en un portal): se prueba en los próximos cuadros, unas pocas veces
      if (!hoja) {
        if (intentos++ < 10) cuadro = requestAnimationFrame(medir);
        return;
      }
      medida = hoja;
      const teclado = Math.max(0, Math.round(document.documentElement.clientHeight - vista.height - vista.offsetTop));
      if (!celular.matches || Math.abs(vista.scale - 1) > 0.01 || teclado === 0) return limpiar(hoja);
      const valor = `${teclado}/${Math.round(vista.height)}`;
      if (valor === anterior) return;
      anterior = valor;
      hoja.style.setProperty("--tt-teclado", `${teclado}px`);
      hoja.style.setProperty("--tt-alto-visible", `${Math.round(vista.height)}px`);
    };
    // Mientras el teclado entra llegan muchos avisos por cuadro: se mide una vez por cuadro
    const pedir = () => {
      if (!cuadro) cuadro = requestAnimationFrame(medir);
    };
    medir();
    vista.addEventListener("resize", pedir);
    vista.addEventListener("scroll", pedir);
    return () => {
      cancelAnimationFrame(cuadro);
      vista.removeEventListener("resize", pedir);
      vista.removeEventListener("scroll", pedir);
      // Al cerrar, el teclado se va a la vez: la hoja baja desde el borde, no desde donde estaba sobre el teclado
      limpiar(medida);
    };
  }, [modal, abierto]);
}
