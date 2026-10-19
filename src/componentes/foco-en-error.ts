import { useEffect, type RefObject } from "react";

/**
 * Después de enviar un formulario con errores, la pantalla y el foco van al primer campo con error (`aria-invalid`).
 * Al centro de la pantalla, para que no quede debajo del encabezado fijo. Sin esto el foco quedaba en la página y no
 * se notaba qué había fallado, sobre todo con lector de pantalla o con el error más abajo (pulido 2.8 y 4.3).
 * `estado` es el resultado del envío: cambia con cada uno.
 */
export function useFocoEnError(formulario: RefObject<HTMLFormElement | null>, estado: unknown) {
  useEffect(() => {
    const conError = formulario.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
    if (!conError) return;
    conError.scrollIntoView({ block: "center" });
    conError.focus({ preventScroll: true });
  }, [formulario, estado]);
}
