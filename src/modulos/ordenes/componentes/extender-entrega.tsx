"use client";

import { useActionState, useRef, useState } from "react";
import { useFocoEnError } from "@/componentes/foco-en-error";
import { conAviso } from "@/componentes/panel/avisos";
import { Campo, MensajeError } from "@/componentes/panel/campo";
import { useCerrarModal } from "@/componentes/panel/modal-contexto";
import { CancelarModal, PieModal } from "@/componentes/panel/modal-pie";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { sumarDias } from "@/lib/fechas";
import type { EstadoFormulario } from "@/lib/formularios";
import { DIAS_MAXIMOS_TRABAJO } from "@/modulos/agenda/reglas";
import { extenderEntrega } from "../acciones/estado";
import { ANCHO_DATO } from "@/componentes/panel/anchos";

// HU-34: extender la entrega de una orden que se atrasa (decisión del 20/10). Pedido 55: solo la nueva fecha, sin espacio
// ni lugares que contar: el auto ya está en el taller. Si un día queda con más autos que lugares, la Agenda lo marca.

type Props = { id: number; fechaInicio: string; fechaFin: string; hoy: string };

/** El formulario, dentro del modal de "Más" (pulido 11.2): al extender, se cierra. */
export function ExtenderEntrega({ id, fechaInicio, fechaFin: finActual, hoy }: Props) {
  const cerrar = useCerrarModal();
  const [estado, accion, enviando] = useActionState<EstadoFormulario, FormData>(
    conAviso(extenderEntrega, (r) => r.ok && cerrar()),
    {},
  );
  const formulario = useRef<HTMLFormElement>(null);
  useFocoEnError(formulario, estado);
  const e = estado.errores ?? {};
  // Después de la actual y, si ya está atrasada, desde hoy: una fecha que ya pasó no sirve
  const minima = sumarDias(finActual, 1) > hoy ? sumarDias(finActual, 1) : hoy;
  const [fechaFin, setFechaFin] = useState(minima);

  return (
    <form ref={formulario} action={accion} className="flex flex-col gap-5" noValidate aria-label="Extender entrega">
      <input type="hidden" name="id" value={id} />
      {estado.mensaje && !estado.ok && <MensajeError id="extender-error">{estado.mensaje}</MensajeError>}
      <Campo id="fechaFin" etiqueta="Nueva entrega" error={e.fechaFin}>
        <Input
          id="fechaFin"
          name="fechaFin"
          type="date"
          min={minima}
          max={sumarDias(fechaInicio, DIAS_MAXIMOS_TRABAJO)}
          value={fechaFin}
          onChange={(ev) => setFechaFin(ev.target.value)}
          className={ANCHO_DATO.fecha}
          aria-invalid={!!e.fechaFin}
          aria-describedby={e.fechaFin ? "fechaFin-error" : undefined}
        />
      </Campo>
      <PieModal>
        <Button type="submit" disabled={enviando}>
          {enviando ? "Guardando…" : "Extender entrega"}
        </Button>
        <CancelarModal />
      </PieModal>
    </form>
  );
}
