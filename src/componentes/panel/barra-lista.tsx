// La barra de una lista del panel (inventario-pantallas.md, "Una barra para todas las listas"; 10/11): cada lista ponía
// su buscador, sus filtros y su orden a su manera y en distinto orden. Ahora todas en el mismo: debajo del encabezado y
// de las pestañas (las vistas), una fila con el buscador a la izquierda, los filtros al lado y a la derecha "Ordenar" o
// "Desactivados"; debajo, el resumen (ResumenLista) y la tabla. En el celular, el buscador a lo ancho y los filtros en
// una fila que se desliza de lado. Una lista que no necesita una pieza no la pone: nunca la cambia de lugar.
// Sin estado: se usa desde el servidor.

export function BarraLista({ buscador, filtros, derecha }: { buscador?: React.ReactNode; filtros?: React.ReactNode; derecha?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      {buscador && <div className="w-full sm:w-80">{buscador}</div>}
      {/* En el celular, a lo ancho de la pantalla y deslizable: los filtros no se parten en dos renglones */}
      {filtros && <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:overflow-visible sm:px-0">{filtros}</div>}
      {derecha && <div className="flex flex-wrap items-center gap-2 sm:ml-auto">{derecha}</div>}
    </div>
  );
}

/** El resumen de la lista, entre la barra y la tabla: "980 Bs por cobrar en 2 órdenes", "3 de 12" al buscar. */
export function ResumenLista({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-tinta-suave">{children}</p>;
}
