"use client";

import { ListaEditable as ListaGenerica, type ElementoLista } from "@/componentes/panel/lista-editable";
import { cambiarEstadoElemento, guardarElemento, moverElemento } from "../acciones";
import { LISTAS, type Lista } from "../listas";

// HU-05: listas de la pestaña Taller (espacios del taller o tamaños de vehículo).

export function ListaEditable({ lista, elementos, descripcion }: { lista: Lista; elementos: ElementoLista[]; descripcion: string }) {
  const def = LISTAS[lista];
  return (
    <ListaGenerica
      id={lista}
      titulo={def.titulo}
      descripcion={descripcion}
      singular={def.singular}
      campoDescripcion={
        def.conDescripcion
          ? { etiqueta: "Modelos de ejemplo", ayuda: "Ayuda a elegir el tamaño al cotizar.", ejemplo: "Corolla, Sentra, Honda Civic" }
          : undefined
      }
      camposOcultos={{ lista }}
      elementos={elementos}
      acciones={{
        guardar: guardarElemento,
        mover: (id, direccion) => moverElemento({ lista, id, direccion }),
        cambiarEstado: (id, activo) => cambiarEstadoElemento({ lista, id, activo }),
      }}
    />
  );
}
