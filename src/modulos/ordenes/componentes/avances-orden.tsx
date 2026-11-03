"use client";

import { useActionState, useRef, useState } from "react";
import { useFocoEnError } from "@/componentes/foco-en-error";
import { conAviso } from "@/componentes/panel/avisos";
import { Campo, MensajeError } from "@/componentes/panel/campo";
import { Button } from "@/componentes/ui/button";
import { Textarea } from "@/componentes/ui/textarea";
import type { EstadoFormulario } from "@/lib/formularios";
import { agregarAvance } from "../acciones";

// HU-34: la historia de la orden (RF-42): los avances que se escriben y los cambios de estado, la más nueva arriba.

type Avance = { id: number; nota: string; autor: string; cuando: string };

export function AvancesOrden({ id, avances, editable }: { id: number; avances: Avance[]; /** La orden está abierta y quien mira la trabaja. */ editable: boolean }) {
  const [nota, setNota] = useState("");
  const [estado, accion, enviando] = useActionState<EstadoFormulario, FormData>(
    conAviso(agregarAvance, (r) => r.ok && setNota("")),
    {},
  );
  const formulario = useRef<HTMLFormElement>(null);
  useFocoEnError(formulario, estado);
  const e = estado.errores ?? {};

  return (
    <section aria-labelledby="avances-titulo" className="tt-tarjeta-panel flex flex-col gap-4 p-4">
      <h2 id="avances-titulo" className="tt-titulo-seccion">Avances</h2>
      {editable && (
        <form ref={formulario} action={accion} className="flex flex-col gap-3" noValidate>
          <input type="hidden" name="id" value={id} />
          {estado.mensaje && !estado.ok && <MensajeError id="avance-error">{estado.mensaje}</MensajeError>}
          <Campo id="nota" etiqueta="Escribir un avance" error={e.nota}>
            <Textarea id="nota" name="nota" rows={2} value={nota} onChange={(ev) => setNota(ev.target.value)} aria-invalid={!!e.nota} aria-describedby={e.nota ? "nota-error" : undefined} />
          </Campo>
          <div>
            <Button type="submit" variant="outline" disabled={enviando}>
              {enviando ? "Guardando…" : "Guardar avance"}
            </Button>
          </div>
        </form>
      )}
      {avances.length === 0 ? (
        <p className="text-tinta-suave">Todavía no hay avances.</p>
      ) : (
        <ol aria-label="Historia de la orden" className="flex flex-col border-l-2 border-border">
          {avances.map((a) => (
            <li key={a.id} className="flex flex-col gap-0.5 py-2 pl-4">
              <span className="whitespace-pre-line">{a.nota}</span>
              <span className="text-sm text-tinta-suave">
                {a.cuando}, {a.autor}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
