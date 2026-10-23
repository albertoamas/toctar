import { useSyncExternalStore } from "react";

const sinSuscripcion = () => () => {};

/**
 * true cuando el componente ya corre en el navegador. Para los botones que necesitan JavaScript (subir al elegir un
 * archivo): se habilitan al hidratar y no antes, así un toque temprano no se pierde.
 */
export const useHidratado = () => useSyncExternalStore(sinSuscripcion, () => true, () => false);
