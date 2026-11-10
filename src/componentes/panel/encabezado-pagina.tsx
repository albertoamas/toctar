import type { Route } from "next";
import { BotonVolver } from "@/componentes/panel/boton-volver";

// El encabezado de una pantalla del panel (skill pantallas-panel): el título, junto a él su estado si es una ficha (una
// insignia: "En el sitio", "Agendada"…), su acción a la derecha (debajo en el celular) y, si hace falta, una
// línea de contexto. El mismo en todas las pantallas, así el título, el botón y el espacio hasta el contenido no cambian
// de una a otra. Va dentro del mismo ancho que el contenido.
// `volver` (pulido 13.18): el botón de volver a la izquierda del título y, debajo en chico, de dónde se viene. Todas las
// pantallas que vuelven a otra lo hacen desde aquí, así queda siempre en el mismo lugar.

type Props = {
  titulo: string;
  estado?: React.ReactNode;
  accion?: React.ReactNode;
  /** La pantalla de la que se viene: "Clientes", "Orden". */
  volver?: { href: Route; texto: string };
  children?: React.ReactNode;
};

export function EncabezadoPagina({ titulo, estado, accion, volver, children }: Props) {
  return (
    <div className="flex flex-col gap-1">
      {/* El botón principal, a la derecha del título, también en el celular (10/11: bajaba a otra fila cuando el título era
          largo, como en Catálogo y precios): el título se parte en dos renglones antes que moverlo. Solo si las acciones no
          entran ni así (dos botones, como en un reclamo), bajan a su fila, a la derecha */}
      <div className="flex flex-wrap items-center gap-3">
        {/* El botón va con el título y su contexto, no con las acciones: en el celular, ellas bajan a su fila */}
        <div className="flex min-w-0 flex-1 basis-40 items-center gap-3">
          {volver && <BotonVolver href={volver.href} texto={volver.texto} />}
          <div className="flex min-w-0 flex-col">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <h1 className="tt-titulo-pagina">{titulo}</h1>
              {estado}
            </div>
            {volver && <p className="text-sm text-tinta-suave">{volver.texto}</p>}
          </div>
        </div>
        {accion && <div className="ml-auto max-w-full">{accion}</div>}
      </div>
      {children && <p className="text-sm text-tinta-suave">{children}</p>}
    </div>
  );
}
