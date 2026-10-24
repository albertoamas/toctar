"use client";

import { useActionState, useRef, useState } from "react";
import { useFocoEnError } from "@/componentes/foco-en-error";
import { conAviso } from "@/componentes/panel/avisos";
import { Campo, MensajeError } from "@/componentes/panel/campo";
import { Button } from "@/componentes/ui/button";
import { Textarea } from "@/componentes/ui/textarea";
import type { EstadoFormulario } from "@/lib/formularios";
import { cerrarMantenimiento } from "../acciones";

// HU-38: "No le interesa" cierra el recordatorio (no se le vuelve a avisar). Se abre aparte, como "Cancelar reserva",
// para no cerrarlo sin querer; la nota es opcional.

export function NoLeInteresa({ id }: { id: number }) {
  const [abierto, setAbierto] = useState(false);
  const [estado, accion, enviando] = useActionState<EstadoFormulario, FormData>(
    conAviso(cerrarMantenimiento, (r) => r.ok && setAbierto(false)),
    {},
  );
  const formulario = useRef<HTMLFormElement>(null);
  useFocoEnError(formulario, estado);
  const e = estado.errores ?? {};
  // Controlada: React reinicia el formulario al terminar la acción y así nada se pierde tras un error
  const [nota, setNota] = useState("");
  const campo = `nota-${id}`;

  if (!abierto) {
    return (
      <Button type="button" variant="outline" onClick={() => setAbierto(true)}>
        No le interesa
      </Button>
    );
  }
  return (
    <form ref={formulario} action={accion} className="flex w-full flex-col gap-4 rounded-sm border border-border p-4" noValidate aria-label="No le interesa">
      <input type="hidden" name="id" value={id} />
      {estado.mensaje && !estado.ok && <MensajeError id={`${campo}-mensaje`}>{estado.mensaje}</MensajeError>}
      <Campo id={campo} etiqueta="Nota (opcional)" error={e.nota} ayuda="Por qué: ya lo hace en otro lado, vendió el vehículo…">
        <Textarea id={campo} name="nota" rows={2} maxLength={300} value={nota} onChange={(ev) => setNota(ev.target.value)} aria-invalid={!!e.nota} aria-describedby={e.nota ? `${campo}-error` : `${campo}-ayuda`} />
      </Campo>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="destructive" disabled={enviando}>
          {enviando ? "Cerrando…" : "No le interesa"}
        </Button>
        <Button type="button" variant="outline" onClick={() => setAbierto(false)}>
          Volver
        </Button>
      </div>
    </form>
  );
}
