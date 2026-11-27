import { useSyncExternalStore } from "react";

// El celular del panel: hasta 640 px (el `sm` de Tailwind), donde los modales son una hoja desde abajo y los
// formularios largos llevan su pie fijo. Con max-width y no con la forma de rango (`width < 40rem`): Safari la entiende
// recién desde la 16.4, y en uno más viejo matchMedia diría que no es un celular.
export const CELULAR = "(max-width: 639px)";

let consulta: MediaQueryList | undefined;
const celular = () => (consulta ??= window.matchMedia(CELULAR));

/** Si la pantalla es de celular (`CELULAR`), y se renueva si cambia. En el servidor, no. */
export function useCelular(): boolean {
  return useSyncExternalStore(
    (avisar) => {
      celular().addEventListener("change", avisar);
      return () => celular().removeEventListener("change", avisar);
    },
    () => celular().matches,
    () => false,
  );
}
