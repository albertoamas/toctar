"use client";

import { useActionState, useRef, useState } from "react";
import { useFocoEnError } from "@/componentes/foco-en-error";
import { conAviso } from "@/componentes/panel/avisos";
import { Campo, MensajeError } from "@/componentes/panel/campo";
import { Button } from "@/componentes/ui/button";
import { RadioGroup, RadioGroupItem } from "@/componentes/ui/radio-group";
import { Textarea } from "@/componentes/ui/textarea";
import type { EstadoConsulta, MotivoPerdida } from "@/db/esquema/consultas";
import type { EstadoFormulario } from "@/lib/formularios";
import { cambiarEstadoConsulta } from "../acciones";
import { NOMBRE_MOTIVO } from "../reglas";

// HU-28: marcar la consulta como perdida (con motivo) o reabrirla (RF-30). Se marca desde un formulario que se abre
// aparte, como "Desactivar" en otras pantallas: no se toca sin querer. Reabrir no pierde nada: es un botón.

// Del texto de cada motivo, no del esquema de la base: así este componente no arrastra Drizzle al navegador
const MOTIVOS = Object.keys(NOMBRE_MOTIVO) as MotivoPerdida[];

type Props = { id: number; estado: EstadoConsulta; motivo: MotivoPerdida | null; detalle: string | null };

export function EstadoConsulta({ id, estado, motivo, detalle }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [resultado, accion, enviando] = useActionState<EstadoFormulario, FormData>(
    conAviso(cambiarEstadoConsulta, (r) => r.ok && setAbierto(false)),
    {},
  );
  const formulario = useRef<HTMLFormElement>(null);
  useFocoEnError(formulario, resultado);
  const v = resultado.valores ?? {};
  const e = resultado.errores ?? {};
  // Controlado, con su campo oculto: React reinicia el formulario tras un error y los radios de base-ui se vaciaban
  const [elegido, setElegido] = useState(v.motivo ?? "");

  if (estado === "confirmado") return null;

  if (estado === "perdido") {
    return (
      <section aria-labelledby="estado-titulo" className="flex flex-col gap-3 rounded-sm border border-border p-4">
        <h2 id="estado-titulo" className="font-heading text-2xl font-bold italic">Perdida</h2>
        {motivo && (
          <p>
            <span className="font-semibold">{NOMBRE_MOTIVO[motivo]}</span>
            {detalle && <span className="text-tinta-suave">: {detalle}</span>}
          </p>
        )}
        <form action={accion}>
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="accion" value="reabrir" />
          <Button type="submit" variant="outline" disabled={enviando}>
            {enviando ? "Reabriendo…" : "Reabrir"}
          </Button>
        </form>
      </section>
    );
  }

  if (!abierto) {
    return (
      <div>
        <Button type="button" variant="outline" onClick={() => setAbierto(true)}>
          Marcar como perdida
        </Button>
      </div>
    );
  }

  return (
    <form ref={formulario} action={accion} className="flex flex-col gap-5 rounded-sm border border-border p-4" noValidate aria-labelledby="perder-titulo">
      <h2 id="perder-titulo" className="font-heading text-2xl font-bold italic">Marcar como perdida</h2>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="accion" value="perder" />
      <div className="flex flex-col gap-3">
        <p id="motivo-titulo" className="text-sm font-medium">Motivo</p>
        <input type="hidden" name="motivo" value={elegido} />
        <RadioGroup
          value={elegido}
          onValueChange={(valor) => setElegido(String(valor))}
          aria-labelledby="motivo-titulo"
          aria-describedby={e.motivo ? "motivo-error" : undefined}
          className="flex flex-wrap gap-2"
        >
          {MOTIVOS.map((m, i) => (
            <label key={m} htmlFor={`motivo-${m}`} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-sm border border-border px-3 py-2 has-data-checked:border-tinta">
              <RadioGroupItem id={`motivo-${m}`} value={m} data-invalido={(!!e.motivo && i === 0) || undefined} />
              <span className="font-semibold">{NOMBRE_MOTIVO[m]}</span>
            </label>
          ))}
        </RadioGroup>
        {e.motivo && <MensajeError id="motivo-error">{e.motivo}</MensajeError>}
      </div>
      <Campo id="detalle" etiqueta="Detalle" error={e.detalle} ayuda={elegido === "otro" ? "Con «Otro», escribe qué pasó." : "Opcional."}>
        <Textarea id="detalle" name="detalle" rows={2} defaultValue={v.detalle} aria-invalid={!!e.detalle} aria-describedby={e.detalle ? "detalle-error" : "detalle-ayuda"} />
      </Campo>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={enviando}>
          {enviando ? "Guardando…" : "Marcar como perdida"}
        </Button>
        <Button type="button" variant="outline" onClick={() => setAbierto(false)}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
