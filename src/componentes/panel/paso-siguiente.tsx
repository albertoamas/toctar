// El paso siguiente de una ficha de trabajo (Reserva, Orden; sistema-del-panel.md §3): recibir, empezar, marcar listo,
// avisar, entregar. Se toca de pie en el taller, con el celular en una mano: debajo del encabezado y grande, en el celular
// y en la computadora. El paso, rojo con `BOTON_PASO`; lo que acompaña al paso (entregar sin avisar, volver a avisar), al
// lado con borde y de tamaño normal. En el celular, uno debajo del otro.

/** El botón (o el enlace con forma de botón) del paso siguiente: 56 px de alto, a todo el ancho en el celular. */
export const BOTON_PASO = "h-14 w-full px-6 text-base sm:w-80";

export function PasoSiguiente({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">{children}</div>;
}
