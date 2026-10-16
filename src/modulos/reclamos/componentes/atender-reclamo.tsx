"use client";

import { useActionState } from "react";
import { conAviso } from "@/componentes/panel/avisos";
import { Campo } from "@/componentes/panel/campo";
import { Button } from "@/componentes/ui/button";
import { Textarea } from "@/componentes/ui/textarea";
import type { EstadoFormulario } from "@/lib/formularios";
import { marcarAtendido } from "../acciones";

// HU-17: marcar un reclamo como atendido, con la nota de qué se hizo.
// El aviso sale desde la acción: al guardar, la página se recarga y este bloque desaparece.

const marcarConAviso = conAviso(marcarAtendido);

export function AtenderReclamo({ id }: { id: number }) {
  const [estado, accion, enviando] = useActionState<EstadoFormulario, FormData>(marcarConAviso, {});
  const error = estado.errores?.nota;

  return (
    <form action={accion} className="flex flex-col items-start gap-4 rounded-sm border border-border bg-superficie p-4">
      <input type="hidden" name="id" value={id} />
      <div className="w-full">
        <Campo id="nota" etiqueta="Qué se hizo" error={error} ayuda="Queda en el registro del reclamo.">
          <Textarea id="nota" name="nota" rows={3} defaultValue={estado.valores?.nota} aria-invalid={!!error} aria-describedby={error ? "nota-error" : "nota-ayuda"} />
        </Campo>
      </div>
      <Button type="submit" disabled={enviando}>{enviando ? "Guardando…" : "Marcar como atendido"}</Button>
    </form>
  );
}
