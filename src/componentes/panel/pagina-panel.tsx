import { cn } from "cn";
import { EmpiezaDeCero } from "@/componentes/panel/empieza-de-cero";

// El tipo de una pantalla del panel decide su ancho y la separación entre sus partes (docs/06-diseno/sistema-del-panel.md
// §1). Las páginas no escriben su propio max-w: así dos fichas no pueden quedar de distinto ancho. No protege nada: cada
// página sigue verificando la sesión y el permiso.

// Un solo ancho para todas (17/11, pedido del dueño): todo el espacio, sin tope (en un monitor de 2560 un tope dejaba otra
// vez un hueco a la derecha). Antes eran cuatro (1280, 1024 y 768 px): en un monitor grande el
// formulario usaba un tercio, la ficha la mitad, y el título y el botón principal cambiaban de lugar de una pantalla a
// otra. Ahora el contenido se acomoda adentro (las fichas de a 2 o 3 partes, los formularios con sus campos de a 2 o 3).
// El tipo solo decide la separación entre partes. Hasta una laptop de 1280 no cambia nada.
const ANCHO = "w-full";
const FORMA = {
  /** Una tabla con columnas o un tablero. Más junto: pestañas, buscador y lista van de la mano. */
  lista: "gap-6",
  /** Ver y editar una cosa, o una lista de filas sin columnas. */
  ficha: "gap-8",
  /** Crear algo, o un paso que se hace de arriba abajo. */
  formulario: "gap-6",
  /** Elegir a dónde ir o ver el día: cada portada acomoda lo suyo. */
  portada: "gap-8",
} as const;

/**
 * Partes cortas y parecidas de una ficha, del mismo alto (§2): de a dos o, si son tres (`enTres`), de a tres, así ninguna
 * queda sola con un hueco al lado. Según el ancho del área de trabajo, no el de la pantalla: el menú lateral le quita lugar.
 */
export function PartesIguales({ enTres, children }: { enTres?: boolean; children: React.ReactNode }) {
  return <div className={cn("grid grid-cols-[minmax(0,1fr)] gap-8 gap-x-4", enTres ? "@4xl:grid-cols-3" : "@3xl:grid-cols-2")}>{children}</div>;
}

/**
 * Toda pantalla del panel, con su ancho. Las fichas y los formularios, además, dentro de EmpiezaDeCero: Next guarda
 * oculta la última pantalla de cada ruta con lo que tenía escrito, y al volver a entrar aparecía lo descartado: un
 * formulario a medio llenar, un modal abierto (hallazgo 9 de la prueba en celulares, 15/11). Así ninguna pantalla nueva
 * lo tiene que recordar. Las listas y las portadas no: al volver a ellas se espera encontrarlas como estaban (p43).
 */
export function PaginaPanel({ tipo, children }: { tipo: keyof typeof FORMA; children: React.ReactNode }) {
  const deCero = tipo === "ficha" || tipo === "formulario";
  return <div className={cn("flex flex-col", ANCHO, FORMA[tipo])}>{deCero ? <EmpiezaDeCero>{children}</EmpiezaDeCero> : children}</div>;
}
