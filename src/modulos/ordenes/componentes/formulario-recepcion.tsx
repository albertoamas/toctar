"use client";

import { useActionState, useRef, useState } from "react";
import { ClipboardCheckIcon } from "lucide-react";
import { useFocoEnError } from "@/componentes/foco-en-error";
import { Campo, MensajeError } from "@/componentes/panel/campo";
import { Selector } from "@/componentes/panel/selector";
import { Button } from "@/componentes/ui/button";
import { Textarea } from "@/componentes/ui/textarea";
import type { EstadoFormulario } from "@/lib/formularios";
import { recibirVehiculo } from "../acciones";

// HU-33: recibir el vehículo (RF-40). Las fotos de ingreso se suben aparte, al tomarlas; aquí van las observaciones y el
// técnico. Sin fotos se puede recibir, pero se pide confirmar: son la prueba de cómo llegó el vehículo.

type Props = {
  trabajoId: number;
  tecnicos: { id: number; nombre: string }[];
  tecnicoInicial: number | null;
  /** El técnico de la reserva, si ya no está activo: se avisa en vez de soltarlo sin decir nada. */
  tecnicoInactivo: string | null;
  conFotos: boolean;
};

export function FormularioRecepcion({ trabajoId, tecnicos, tecnicoInicial, tecnicoInactivo, conFotos }: Props) {
  const [estado, accion, enviando] = useActionState<EstadoFormulario, FormData>(recibirVehiculo, {});
  const formulario = useRef<HTMLFormElement>(null);
  useFocoEnError(formulario, estado);
  const e = estado.errores ?? {};
  // Controlados: React reinicia el formulario al terminar la acción y así nada se pierde tras un error
  const [observaciones, setObservaciones] = useState("");
  const [tecnicoId, setTecnicoId] = useState(tecnicoInicial && tecnicos.some((t) => t.id === tecnicoInicial) ? String(tecnicoInicial) : "");
  const [confirmarSinFotos, setConfirmarSinFotos] = useState(false);

  function enviar(ev: React.SyntheticEvent<HTMLFormElement, SubmitEvent>) {
    // Sin fotos, el primer toque pide confirmar; el segundo recibe
    if (!conFotos && !confirmarSinFotos) {
      ev.preventDefault();
      setConfirmarSinFotos(true);
    }
  }

  return (
    <form ref={formulario} action={accion} onSubmit={enviar} className="flex flex-col gap-5" noValidate aria-label="Recibir vehículo">
      <input type="hidden" name="id" value={trabajoId} />
      {estado.mensaje && !estado.ok && <MensajeError id="recepcion-error">{estado.mensaje}</MensajeError>}
      <Campo id="observaciones" etiqueta="Observaciones" error={e.observaciones} ayuda="Rayones, golpes, objetos que deja el cliente…">
        <Textarea
          id="observaciones"
          name="observaciones"
          rows={4}
          value={observaciones}
          onChange={(ev) => setObservaciones(ev.target.value)}
          aria-invalid={!!e.observaciones}
          aria-describedby={e.observaciones ? "observaciones-error" : "observaciones-ayuda"}
        />
      </Campo>
      <Campo id="tecnicoId" etiqueta="Técnico" error={e.tecnicoId} ayuda={tecnicoInactivo ? `${tecnicoInactivo} ya no está activo: elige otro técnico.` : undefined}>
        <Selector
          id="tecnicoId"
          name="tecnicoId"
          value={tecnicoId}
          onChange={(ev) => setTecnicoId(ev.target.value)}
          aria-invalid={!!e.tecnicoId}
          aria-describedby={e.tecnicoId ? "tecnicoId-error" : tecnicoInactivo ? "tecnicoId-ayuda" : undefined}
          className="max-w-xs"
        >
          <option value="">Sin asignar</option>
          {tecnicos.map((t) => (
            <option key={t.id} value={t.id}>{t.nombre}</option>
          ))}
        </Selector>
      </Campo>
      {confirmarSinFotos && !conFotos && (
        <p role="alert" className="rounded-sm border border-aviso p-3 text-sm">
          Sin fotos de ingreso no hay cómo probar el estado en que llegó. Toma al menos una o confirma que lo recibes sin fotos.
        </p>
      )}
      <div>
        <Button type="submit" disabled={enviando}>
          <ClipboardCheckIcon />
          {enviando ? "Recibiendo…" : confirmarSinFotos && !conFotos ? "Recibir sin fotos" : "Recibir vehículo"}
        </Button>
      </div>
    </form>
  );
}
