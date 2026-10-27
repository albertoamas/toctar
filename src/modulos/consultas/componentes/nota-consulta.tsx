"use client";

import { useActionState, useRef } from "react";
import { useFocoEnError } from "@/componentes/foco-en-error";
import { conAviso } from "@/componentes/panel/avisos";
import { Campo } from "@/componentes/panel/campo";
import { CancelarModal, PieModal, useCerrarModal } from "@/componentes/panel/modal-formulario";
import { Button } from "@/componentes/ui/button";
import { Textarea } from "@/componentes/ui/textarea";
import type { EstadoFormulario } from "@/lib/formularios";
import { guardarNota } from "../acciones";

// HU-24: la nota de la consulta. Pulido 9.3: se lee en la página y se edita en el modal de "Editar" (SeccionConEditar),
// que se cierra al guardar. Guardarla cuenta como movimiento (RF-35).

export function FormularioNota({ id, nota }: { id: number; nota: string | null }) {
  const cerrar = useCerrarModal();
  const [estado, accion, enviando] = useActionState<EstadoFormulario, FormData>(
    conAviso(guardarNota, (r) => r.ok && cerrar()),
    {},
  );
  const formulario = useRef<HTMLFormElement>(null);
  useFocoEnError(formulario, estado);
  const error = estado.errores?.nota;

  return (
    <form ref={formulario} action={accion} className="flex flex-col gap-6" noValidate aria-label="Nota de la consulta">
      <input type="hidden" name="id" value={id} />
      {/* Su propio id: "Nueva consulta" tiene un campo "nota" y Next guarda la página anterior oculta en el documento
          (para volver atrás al instante); con el mismo id, la etiqueta se asociaba a ese campo y no a este */}
      <Campo id="editar-nota" etiqueta="Qué pidió, qué le preocupa, cuándo lo necesita" error={error}>
        <Textarea id="editar-nota" name="nota" rows={5} defaultValue={estado.valores?.nota ?? nota ?? ""} aria-invalid={!!error} aria-describedby={error ? "editar-nota-error" : undefined} />
      </Campo>
      <PieModal>
        <Button type="submit" disabled={enviando}>
          {enviando ? "Guardando…" : "Guardar nota"}
        </Button>
        <CancelarModal />
      </PieModal>
    </form>
  );
}
