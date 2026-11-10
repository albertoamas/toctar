import { cn } from "cn";

// El tipo de una pantalla del panel decide su ancho y la separación entre sus partes (docs/06-diseno/sistema-del-panel.md
// §1). Las páginas no escriben su propio max-w: así dos fichas no pueden quedar de distinto ancho. No protege nada: cada
// página sigue verificando la sesión y el permiso.

// Tres anchos, uno por tipo (pulido final, 10/11): en un monitor grande las tablas se estiraban a todo el ancho (1600 px,
// columnas muy separadas) y las fichas y los formularios no. Hasta una laptop de 1280 no cambia nada.
const FORMA = {
  /** Una tabla con columnas o un tablero, hasta 1280 px. Más junto: pestañas, buscador y lista van de la mano. */
  lista: "max-w-7xl gap-6",
  /** Ver y editar una cosa, o una lista de filas sin columnas. */
  ficha: "max-w-5xl gap-8",
  /** Crear algo, o un paso que se hace de arriba abajo. */
  formulario: "max-w-3xl gap-6",
  /** Elegir a dónde ir o ver el día, hasta 1280 px como las listas: cada portada acomoda lo suyo. */
  portada: "max-w-7xl gap-8",
} as const;

/**
 * Partes cortas y parecidas de una ficha, del mismo alto (§2): de a dos o, si son tres (`enTres`), de a tres, así ninguna
 * queda sola con un hueco al lado. Según el ancho del área de trabajo, no el de la pantalla: el menú lateral le quita lugar.
 */
export function PartesIguales({ enTres, children }: { enTres?: boolean; children: React.ReactNode }) {
  return <div className={cn("grid grid-cols-[minmax(0,1fr)] gap-8 gap-x-4", enTres ? "@4xl:grid-cols-3" : "@3xl:grid-cols-2")}>{children}</div>;
}

export function PaginaPanel({ tipo, children }: { tipo: keyof typeof FORMA; children: React.ReactNode }) {
  return <div className={cn("flex flex-col", FORMA[tipo])}>{children}</div>;
}
