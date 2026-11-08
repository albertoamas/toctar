import { cn } from "cn";

// El tipo de una pantalla del panel decide su ancho y la separación entre sus partes (docs/06-diseno/sistema-del-panel.md
// §1). Las páginas no escriben su propio max-w: así dos fichas no pueden quedar de distinto ancho. No protege nada: cada
// página sigue verificando la sesión y el permiso.

const FORMA = {
  /** Una tabla con columnas o un tablero: todo el ancho. Más junto: pestañas, buscador y lista van de la mano. */
  lista: "gap-6",
  /** Ver y editar una cosa, o una lista de filas sin columnas. */
  ficha: "max-w-5xl gap-8",
  /** Crear algo, o un paso que se hace de arriba abajo. */
  formulario: "max-w-3xl gap-6",
  /** Elegir a dónde ir o ver el día: cada portada acomoda lo suyo. */
  portada: "gap-8",
} as const;

export function PaginaPanel({ tipo, children }: { tipo: keyof typeof FORMA; children: React.ReactNode }) {
  return <div className={cn("flex flex-col", FORMA[tipo])}>{children}</div>;
}
