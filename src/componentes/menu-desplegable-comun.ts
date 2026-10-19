// Lo que comparten el botón del menú desplegable (menu-desplegable.tsx) y su hoja (menu-desplegable-hoja.tsx).
// Va aparte para que la hoja no importe del botón, que a su vez la carga: sería una importación circular.

export type PropsMenu = {
  lado: "left" | "right";
  /** Lo que va arriba, junto al botón de cerrar (el logo). */
  cabecera: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

/** Abrir y cerrar: 44 × 44 px, el mínimo cómodo para el pulgar. */
export const BOTON_MENU = "-mx-2 grid size-11 shrink-0 place-items-center rounded-sm text-tinta hover:bg-superficie";
