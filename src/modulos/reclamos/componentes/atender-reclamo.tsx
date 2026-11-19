"use client";

import { useState } from "react";
import { useHidratado } from "@/componentes/hidratado";
import { Campo } from "@/componentes/panel/campo";
import { useFormularioEnModal } from "@/componentes/panel/modal-contexto";
import { ModalFormulario } from "@/componentes/panel/modal-formulario";
import { PieGuardar } from "@/componentes/panel/modal-pie";
import { Button } from "@/componentes/ui/button";
import { Textarea } from "@/componentes/ui/textarea";
import { marcarAtendido } from "../acciones";
import { BOTON_PASO } from "@/componentes/panel/paso-siguiente";

// HU-17: marcar un reclamo como atendido, con la nota de qué se hizo. C6: es la acción principal de la ficha y va en su
// encabezado; la nota se escribe en un modal (pregunta antes de perderla). Al guardar, la página se renueva y el botón ya
// no está: el reclamo muestra su "Atención".

export function AtenderReclamo({ id, grande }: { id: number; /** El botón del paso siguiente, grande (la ficha del reclamo). */ grande?: boolean }) {
  const [abierto, setAbierto] = useState(false);
  const hidratado = useHidratado();
  return (
    <>
      <Button type="button" size={grande ? "paso" : "default"} disabled={!hidratado} onClick={() => setAbierto(true)} className={grande ? BOTON_PASO : undefined}>
        Marcar como atendido
      </Button>
      <ModalFormulario titulo="Marcar como atendido" abierto={abierto} alCambiar={setAbierto}>
        <Formulario id={id} />
      </ModalFormulario>
    </>
  );
}

function Formulario({ id }: { id: number }) {
  const { accion, enviando, formulario, e, v } = useFormularioEnModal(marcarAtendido);
  return (
    <form ref={formulario} action={accion} className="flex flex-col gap-5" noValidate>
      <input type="hidden" name="id" value={id} />
      {/* Si otra persona lo atendió mientras tanto, lo dice el aviso y la página ya muestra su atención: este modal se va */}
      <Campo id="nota" etiqueta="Qué se hizo" error={e.nota} ayuda="Queda en el registro del reclamo.">
        <Textarea id="nota" name="nota" rows={3} defaultValue={v?.nota} aria-invalid={!!e.nota} aria-describedby={e.nota ? "nota-error" : "nota-ayuda"} />
      </Campo>
      <PieGuardar texto="Marcar como atendido" enviando={enviando} />
    </form>
  );
}
