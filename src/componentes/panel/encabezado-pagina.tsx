import type { Route } from "next";
import { EnlaceVolver } from "@/componentes/enlace-volver";

// El encabezado de una pantalla del panel (skill pantallas-panel): el título, junto a él su estado si es una ficha (una
// insignia: "En el sitio", "Agendada"…), su acción a la derecha (debajo en el celular) y, si hace falta, una
// línea de contexto. El mismo en todas las pantallas, así el título, el botón y el espacio hasta el contenido no cambian
// de una a otra. Va dentro del mismo ancho que el contenido.

type Props = {
  titulo: string;
  estado?: React.ReactNode;
  accion?: React.ReactNode;
  /** Arriba del título, el enlace a la pantalla de la que se viene ("‹ Sitio web"): las partes de una sección. */
  volver?: { href: Route; texto: string };
  children?: React.ReactNode;
};

export function EncabezadoPagina({ titulo, estado, accion, volver, children }: Props) {
  return (
    <div className="flex flex-col gap-1">
      {volver && (
        <EnlaceVolver href={volver.href} className="-mt-2">
          {volver.texto}
        </EnlaceVolver>
      )}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-3">
        <h1 className="tt-titulo-pagina">{titulo}</h1>
        {estado}
        {accion && <div className="sm:ml-auto">{accion}</div>}
      </div>
      {children && <p className="text-sm text-tinta-suave">{children}</p>}
    </div>
  );
}
