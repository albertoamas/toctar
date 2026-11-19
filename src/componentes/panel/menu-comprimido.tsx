"use client";

import { useEffect, useSyncExternalStore } from "react";
import { PanelLeftCloseIcon, PanelLeftOpenIcon } from "lucide-react";
import { Button } from "@/componentes/ui/button";

// La barra lateral comprimida, solo con los íconos (19/11): en la computadora deja unos 180 px más para el tablero de la
// Agenda, las tablas y los formularios con su resumen al costado. Se recuerda en el navegador (es una comodidad de cada
// persona, no un dato del negocio) y se marca en <html data-menu="comprimido">: la variante `comprimido:` de globals.css
// cambia solo lo que está dentro de la barra lateral ([data-menu-lateral]), no el menú del celular. El script del layout
// la aplica antes de pintar: sin él, la barra se vería abierta un instante y se cerraría.

const CLAVE = "tt-menu";
const ATRIBUTO = "data-menu";

/** El script que aplica lo guardado antes de pintar (va en el layout del panel). */
export const SCRIPT_MENU_COMPRIMIDO = `try{if(localStorage.getItem("${CLAVE}")==="comprimido")document.documentElement.setAttribute("${ATRIBUTO}","comprimido")}catch(e){}`;

const estaComprimido = () => document.documentElement.getAttribute(ATRIBUTO) === "comprimido";

/** Si la barra lateral está comprimida; se renueva al cambiar. */
export function useMenuComprimido(): boolean {
  return useSyncExternalStore(
    (avisar) => {
      const observador = new MutationObserver(avisar);
      observador.observe(document.documentElement, { attributes: true, attributeFilter: [ATRIBUTO] });
      return () => observador.disconnect();
    },
    estaComprimido,
    () => false,
  );
}

function fijar(comprimido: boolean) {
  if (comprimido) document.documentElement.setAttribute(ATRIBUTO, "comprimido");
  else document.documentElement.removeAttribute(ATRIBUTO);
  try {
    if (comprimido) localStorage.setItem(CLAVE, "comprimido");
    else localStorage.removeItem(CLAVE);
  } catch {
    // Sin almacenamiento (navegación privada): vale hasta recargar
  }
}

/** El botón que comprime o abre la barra lateral. */
export function AlternarMenu() {
  const comprimido = useMenuComprimido();
  // Al llegar al panel sin recargar (desde el ingreso), el script no corrió: se aplica lo guardado
  useEffect(() => {
    try {
      if (localStorage.getItem(CLAVE) === "comprimido" && !estaComprimido()) fijar(true);
    } catch {
      // Sin almacenamiento: la barra abierta
    }
  }, []);
  const Icono = comprimido ? PanelLeftOpenIcon : PanelLeftCloseIcon;
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="size-9 shrink-0 text-tinta-suave hover:text-tinta"
      aria-label={comprimido ? "Abrir el menú" : "Comprimir el menú"}
      title={comprimido ? "Abrir el menú" : "Comprimir el menú"}
      aria-pressed={comprimido}
      onClick={() => fijar(!comprimido)}
    >
      <Icono />
    </Button>
  );
}
