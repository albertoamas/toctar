"use client";

import { OrdenarLista } from "@/componentes/panel/ordenar-lista";
import { moverServicio } from "../acciones";

// HU-07: el orden en que salen los servicios en el sitio (pulido 13.21), con el modal común de "Cambiar orden".

export function OrdenarServicios({ servicios }: { servicios: { id: number; nombre: string }[] }) {
  return <OrdenarLista elementos={servicios} mover={moverServicio} etiqueta="Orden de los servicios" />;
}
