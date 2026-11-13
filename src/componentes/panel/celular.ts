// El celular del panel: hasta 640 px (el `sm` de Tailwind), donde los modales son una hoja desde abajo y los
// formularios largos llevan su pie fijo. Con max-width y no con la forma de rango (`width < 40rem`): Safari la entiende
// recién desde la 16.4, y en uno más viejo matchMedia diría que no es un celular.
export const CELULAR = "(max-width: 639px)";
