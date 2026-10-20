"use client";

import { useActionState, useRef } from "react";
import { useFocoEnError } from "@/componentes/foco-en-error";
import { conAviso } from "@/componentes/panel/avisos";
import { Campo } from "@/componentes/panel/campo";
import { Button } from "@/componentes/ui/button";
import { Textarea } from "@/componentes/ui/textarea";
import type { EstadoFormulario } from "@/lib/formularios";
import { guardarNota } from "../acciones";

// HU-24: la nota de la consulta, editable. Guardarla cuenta como movimiento (RF-35).

const guardarConAviso = conAviso(guardarNota);

export function NotaConsulta({ id, nota }: { id: number; nota: string | null }) {
  const [estado, accion, enviando] = useActionState<EstadoFormulario, FormData>(guardarConAviso, {});
  const formulario = useRef<HTMLFormElement>(null);
  useFocoEnError(formulario, estado);
  const error = estado.errores?.nota;

  return (
    <form ref={formulario} action={accion} className="flex flex-col gap-4" noValidate aria-labelledby="nota-titulo">
      <h2 id="nota-titulo" className="font-heading text-2xl font-bold italic">Nota</h2>
      <input type="hidden" name="id" value={id} />
      <Campo id="nota" etiqueta="Qué pidió, qué le preocupa, cuándo lo necesita" error={error}>
        <Textarea id="nota" name="nota" rows={4} defaultValue={estado.valores?.nota ?? nota ?? ""} aria-invalid={!!error} aria-describedby={error ? "nota-error" : undefined} />
      </Campo>
      <div>
        <Button type="submit" disabled={enviando}>
          {enviando ? "Guardando…" : "Guardar nota"}
        </Button>
      </div>
    </form>
  );
}
