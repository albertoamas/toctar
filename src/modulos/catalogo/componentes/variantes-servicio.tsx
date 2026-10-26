"use client";

import { useState } from "react";
import { ListaEditable, type ElementoLista } from "@/componentes/panel/lista-editable";
import { CancelarSeccion, PieSeccion } from "@/componentes/panel/seccion-con-editar";
import { cambiarEstadoVariante, guardarVariante, moverVariante } from "../acciones";

// HU-19: las variantes de un servicio (D-2): agregar, renombrar, ordenar y desactivar. Va en el modal de "Editar" de la
// ficha del servicio, que en lectura muestra sus nombres. Cada cambio se guarda al momento: el modal se cierra con
// "Listo", que no aparece mientras una fila está abierta para agregar o renombrar (lo escrito sin guardar se perdería).

export function VariantesServicio({ servicioId, variantes }: { servicioId: number; variantes: ElementoLista[] }) {
  const [editando, setEditando] = useState(false);
  return (
    <div className="flex flex-col gap-4">
      <ListaEditable
        id="variantes"
        titulo="Variantes"
        conEncabezado={false}
        singular="variante"
        campoDescripcion={{ etiqueta: "Descripción", ayuda: "Opcional. Se ve en la página del servicio.", ejemplo: "Capa más densa, más años de protección" }}
        camposOcultos={{ servicioId }}
        alEditar={setEditando}
        elementos={variantes}
        acciones={{
          guardar: guardarVariante,
          mover: (id, direccion) => moverVariante({ servicioId, id, direccion }),
          cambiarEstado: (id, activo) => cambiarEstadoVariante({ servicioId, id, activo }),
        }}
      />
      {!editando && (
        <PieSeccion>
          <CancelarSeccion texto="Listo" />
        </PieSeccion>
      )}
    </div>
  );
}
