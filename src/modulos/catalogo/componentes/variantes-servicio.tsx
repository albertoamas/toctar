"use client";

import { useState } from "react";
import { PencilIcon } from "lucide-react";
import { useHidratado } from "@/componentes/hidratado";
import { ListaEditable, type ElementoLista } from "@/componentes/panel/lista-editable";
import { CancelarModal, ModalFormulario, PieModal } from "@/componentes/panel/modal-formulario";
import { Button } from "@/componentes/ui/button";
import { cambiarEstadoVariante, guardarVariante, moverVariante } from "../acciones";

// HU-19: las variantes de un servicio (D-2): agregar, renombrar, ordenar y desactivar. Va en el modal de "Editar variantes",
// en el título de Precios de la ficha del servicio: en lectura, cada variante es una tarjeta de precios con su nombre
// (inventario-pantallas.md, cambio 4b: una tarjeta aparte repetía esos nombres). Cada cambio se guarda al momento: el modal se cierra con
// "Listo", que no aparece mientras está abierto el modal de agregar o renombrar una (lo escrito sin guardar se perdería).

/** "Editar variantes", en el título de Precios, y su modal. */
export function EditarVariantes({ servicioId, variantes }: { servicioId: number; variantes: ElementoLista[] }) {
  const hidratado = useHidratado();
  const [abierto, setAbierto] = useState(false);
  return (
    <>
      <Button type="button" variant="ghost" disabled={!hidratado} onClick={() => setAbierto(true)}>
        <PencilIcon />
        Editar variantes
      </Button>
      <ModalFormulario titulo="Variantes" abierto={abierto} alCambiar={setAbierto}>
        <VariantesServicio servicioId={servicioId} variantes={variantes} />
      </ModalFormulario>
    </>
  );
}

function VariantesServicio({ servicioId, variantes }: { servicioId: number; variantes: ElementoLista[] }) {
  const [editando, setEditando] = useState(false);
  return (
    <div className="flex flex-col gap-4">
      <ListaEditable
        id="variantes"
        titulo="Variantes"
        conEncabezado={false}
        singular="variante"
        femenino
        campoDescripcion={{ etiqueta: "Descripción", ayuda: "Se ve en la página del servicio.", ejemplo: "Capa más densa, más años de protección" }}
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
        <PieModal>
          <CancelarModal texto="Listo" />
        </PieModal>
      )}
    </div>
  );
}
