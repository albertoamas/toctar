"use client";

import { useActionState, useRef, useState } from "react";
import { ClipboardCheckIcon } from "lucide-react";
import { useFocoEnError } from "@/componentes/foco-en-error";
import { Campo, MensajeError } from "@/componentes/panel/campo";
import { PieFormulario } from "@/componentes/panel/pie-formulario";
import { Selector } from "@/componentes/panel/selector";
import { Button } from "@/componentes/ui/button";
import { Textarea } from "@/componentes/ui/textarea";
import type { EstadoFormulario } from "@/lib/formularios";
import { recibirVehiculo } from "../acciones";

// HU-33: recibir el vehículo (RF-40). Cómo llegó lo dice el checklist (pedido 12), con la foto de cada detalle; aquí van
// las observaciones y el técnico. El servidor no recibe con partes del checklist sin revisar.

type Props = {
  trabajoId: number;
  tecnicos: { id: number; nombre: string }[];
  tecnicoInicial: number | null;
  /** El técnico de la reserva, si ya no está activo: se avisa en vez de soltarlo sin decir nada. */
  tecnicoInactivo: string | null;
};

export function FormularioRecepcion({ trabajoId, tecnicos, tecnicoInicial, tecnicoInactivo }: Props) {
  const [estado, accion, enviando] = useActionState<EstadoFormulario, FormData>(recibirVehiculo, {});
  const formulario = useRef<HTMLFormElement>(null);
  useFocoEnError(formulario, estado);
  const e = estado.errores ?? {};
  // Controlados: React reinicia el formulario al terminar la acción y así nada se pierde tras un error
  const [observaciones, setObservaciones] = useState("");
  const [tecnicoId, setTecnicoId] = useState(tecnicoInicial && tecnicos.some((t) => t.id === tecnicoInicial) ? String(tecnicoInicial) : "");

  return (
    <form ref={formulario} action={accion} className="tt-tarjeta-panel flex flex-col p-4 sm:p-6 gap-5" noValidate aria-label="Recibir vehículo">
      <input type="hidden" name="id" value={trabajoId} />
      {estado.mensaje && !estado.ok && <MensajeError id="recepcion-error">{estado.mensaje}</MensajeError>}
      <Campo id="observaciones" etiqueta="Observaciones" error={e.observaciones} ayuda="Lo que no está en el checklist: objetos que deja el cliente, lo que pidió…">
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
      {/* En el celular, fijo abajo: a mano aunque el teclado esté abierto en las observaciones (pulido 11.3) */}
      <PieFormulario>
        <Button type="submit" disabled={enviando}>
          <ClipboardCheckIcon />
          {enviando ? "Recibiendo…" : "Recibir vehículo"}
        </Button>
      </PieFormulario>
    </form>
  );
}
