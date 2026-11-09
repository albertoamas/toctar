"use client";

import { useActionState, useRef, useState } from "react";
import { useFocoEnError } from "@/componentes/foco-en-error";
import { conAviso } from "@/componentes/panel/avisos";
import { Campo, MensajeError } from "@/componentes/panel/campo";
import { Button } from "@/componentes/ui/button";
import { Textarea } from "@/componentes/ui/textarea";
import type { EstadoFormulario } from "@/lib/formularios";
import { anularPago } from "../acciones";

// HU-32: anular un pago (D-6). No se borra: queda tachado con su motivo y deja de contar para el saldo.

export function AnularPago({ id, descripcion }: { id: number; /** "Adelanto en efectivo de 150 Bs", para el lector de pantalla. */ descripcion: string }) {
  const [abierto, setAbierto] = useState(false);
  const [estado, accion, enviando] = useActionState<EstadoFormulario, FormData>(
    conAviso(anularPago, (r) => r.ok && setAbierto(false)),
    {},
  );
  const formulario = useRef<HTMLFormElement>(null);
  useFocoEnError(formulario, estado);
  const [motivo, setMotivo] = useState("");
  const e = estado.errores ?? {};
  const base = `anular-${id}`;

  if (!abierto) {
    return (
      // Chico y sin borde (pulido final de los pagos, 09/11): se usa poco y no compite con el pago; pide su motivo al tocarlo
      <Button type="button" variant="ghost" size="sm" className="-ml-2.5 self-start text-tinta-suave" onClick={() => setAbierto(true)}>
        Anular
        <span className="sr-only"> {descripcion}</span>
      </Button>
    );
  }
  return (
    <form ref={formulario} action={accion} className="flex flex-col gap-3" noValidate aria-label={`Anular ${descripcion}`}>
      <input type="hidden" name="id" value={id} />
      {estado.mensaje && !estado.ok && <MensajeError id={`${base}-error`}>{estado.mensaje}</MensajeError>}
      <Campo id={`${base}-motivo`} etiqueta="Motivo" error={e.motivo} ayuda="El pago queda tachado con este motivo y deja de contar para el saldo.">
        <Textarea
          id={`${base}-motivo`}
          name="motivo"
          rows={2}
          value={motivo}
          onChange={(ev) => setMotivo(ev.target.value)}
          aria-invalid={!!e.motivo}
          aria-describedby={e.motivo ? `${base}-motivo-error` : `${base}-motivo-ayuda`}
        />
      </Campo>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="destructive" disabled={enviando}>
          {enviando ? "Anulando…" : "Anular pago"}
        </Button>
        <Button type="button" variant="outline" onClick={() => setAbierto(false)}>
          Volver
        </Button>
      </div>
    </form>
  );
}
