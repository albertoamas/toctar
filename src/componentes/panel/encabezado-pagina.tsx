// El encabezado de una pantalla del panel (skill pantallas-panel): el título, su acción principal a la derecha (abajo en
// el celular, si no cabe) y, si hace falta, una línea de contexto. El mismo en todas las pantallas, así el título, el
// botón y el espacio hasta el contenido no cambian de una a otra. Va dentro del mismo ancho que el contenido.

export function EncabezadoPagina({ titulo, accion, children }: { titulo: string; accion?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-heading text-4xl font-extrabold italic">{titulo}</h1>
        {accion}
      </div>
      {children && <p className="text-tinta-suave">{children}</p>}
    </div>
  );
}
