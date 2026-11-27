import type { Route } from "next";
import { cn } from "cn";
import { BotonVolver } from "@/componentes/panel/boton-volver";

// El encabezado de una pantalla del panel (skill pantallas-panel): el título, junto a él su estado si es una ficha (una
// insignia: "En el sitio", "Agendada"…), su acción a la derecha (con texto corto en el celular, `TextoAccion`) y, si hace falta, una
// línea de contexto. El mismo en todas las pantallas, así el título, el botón y el espacio hasta el contenido no cambian
// de una a otra. Va dentro del mismo ancho que el contenido.
// `volver` (pulido 13.18): el botón de volver a la izquierda del título. Todas las pantallas que vuelven a otra lo hacen
// desde aquí, así queda siempre en el mismo lugar.

type Props = {
  titulo: string;
  estado?: React.ReactNode;
  accion?: React.ReactNode;
  /** La pantalla de la que se viene: "Clientes", "Orden". */
  volver?: { href: Route; texto: string };
  /**
   * Debajo del título, un dato que sirve (C7, 18/11): el WhatsApp del cliente, el vehículo y su dueño.
   */
  subtitulo?: React.ReactNode;
  /** A la izquierda del título, una foto que dice qué es: la del vehículo en su ficha (pedido 58). */
  imagen?: React.ReactNode;
  children?: React.ReactNode;
};

export function EncabezadoPagina({ titulo, estado, accion, volver, subtitulo, imagen, children }: Props) {
  return (
    <div className="flex flex-col gap-1">
      {/* El botón principal, a la derecha del título, también en el celular (10/11: bajaba a otra fila cuando el título era
          largo, como en Catálogo y precios): el título se parte en dos renglones antes que moverlo. Solo si las acciones no
          entran ni así (dos botones, como en un reclamo), bajan a su fila, a la derecha */}
      <div className="flex flex-wrap items-center gap-3">
        {/* El botón va con el título y su contexto, no con las acciones: en el celular, ellas bajan a su fila */}
        <div className="flex min-w-0 flex-1 basis-40 items-center gap-3">
          {volver && <BotonVolver href={volver.href} texto={volver.texto} />}
          {imagen}
          <div className="flex min-w-0 flex-col">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <h1 className="tt-titulo-pagina">{titulo}</h1>
              {estado}
            </div>
            {/* 21/11: sin repetir de dónde se viene ("Clientes") cuando no hay otro dato: no decía nada nuevo y sumaba una línea.
                El botón de volver lo sigue diciendo para el lector de pantalla */}
            {subtitulo && <p className="text-sm text-tinta-suave">{subtitulo}</p>}
          </div>
        </div>
        {/* Sin ml-auto: en el mismo renglón queda a la derecha (el título ocupa el resto) y, si baja al suyo, a la izquierda,
            debajo del título, y no suelto a la derecha (22/11) */}
        {accion && <div className="max-w-full">{accion}</div>}
      </div>
      {/* Con el botón de volver, alineada con el título (no debajo del botón) */}
      {children && <p className={cn("text-sm text-tinta-suave", volver && "pl-[2.875rem]")}>{children}</p>}
    </div>
  );
}
