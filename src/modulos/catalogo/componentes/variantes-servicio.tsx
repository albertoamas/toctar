"use client";

import { ListaEditable, type ElementoLista } from "@/componentes/panel/lista-editable";
import { cambiarEstadoVariante, guardarVariante, moverVariante } from "../acciones";

// HU-19: las variantes de un servicio (D-2): agregar, renombrar, ordenar y desactivar. Sus precios, más arriba en la
// misma ficha.

export function VariantesServicio({ servicioId, variantes }: { servicioId: number; variantes: ElementoLista[] }) {
  return (
    <ListaEditable
      id="variantes"
      titulo="Variantes"
      descripcion="Las opciones que eligen los clientes, como los años del cerámico. Una variante nueva necesita sus precios. Se guardan al momento."
      singular="variante"
      campoDescripcion={{ etiqueta: "Descripción", ayuda: "Opcional. Se ve en la página del servicio.", ejemplo: "Capa más densa, más años de protección" }}
      camposOcultos={{ servicioId }}
      elementos={variantes}
      acciones={{
        guardar: guardarVariante,
        mover: (id, direccion) => moverVariante({ servicioId, id, direccion }),
        cambiarEstado: (id, activo) => cambiarEstadoVariante({ servicioId, id, activo }),
      }}
    />
  );
}
