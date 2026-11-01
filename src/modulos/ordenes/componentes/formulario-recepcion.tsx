"use client";

import { useActionState, useRef, useState } from "react";
import { ClipboardCheckIcon } from "lucide-react";
import { useFocoEnError } from "@/componentes/foco-en-error";
import { Campo, MensajeError } from "@/componentes/panel/campo";
import { PieFormulario } from "@/componentes/panel/pie-formulario";
import { Selector } from "@/componentes/panel/selector";
import { Button } from "@/componentes/ui/button";
import { Textarea } from "@/componentes/ui/textarea";
import { recibirVehiculo, type EstadoRecepcion } from "../acciones";

// HU-33: recibir el vehículo (RF-40). Las fotos de ingreso se suben aparte, al tomarlas; aquí van las observaciones y el
// técnico. Sin fotos se puede recibir, pero se pide confirmar: son la prueba de cómo llegó el vehículo. Quién no tiene
// fotos lo dice el servidor (sinFotos), no la pantalla: una foto recién subida podía no haber llegado todavía a ella.

type Props = {
  trabajoId: number;
  tecnicos: { id: number; nombre: string }[];
  tecnicoInicial: number | null;
  /** El técnico de la reserva, si ya no está activo: se avisa en vez de soltarlo sin decir nada. */
  tecnicoInactivo: string | null;
};

export function FormularioRecepcion({ trabajoId, tecnicos, tecnicoInicial, tecnicoInactivo }: Props) {
  const [estado, accion, enviando] = useActionState<EstadoRecepcion, FormData>(recibirVehiculo, {});
  const formulario = useRef<HTMLFormElement>(null);
  useFocoEnError(formulario, estado);
  const e = estado.errores ?? {};
  // Controlados: React reinicia el formulario al terminar la acción y así nada se pierde tras un error
  const [observaciones, setObservaciones] = useState("");
  const [tecnicoId, setTecnicoId] = useState(tecnicoInicial && tecnicos.some((t) => t.id === tecnicoInicial) ? String(tecnicoInicial) : "");
  // El servidor no encontró fotos: el próximo toque confirma que se recibe sin ellas
  const confirmarSinFotos = !!estado.sinFotos;

  return (
    <form ref={formulario} action={accion} className="flex flex-col gap-5" noValidate aria-label="Recibir vehículo">
      <input type="hidden" name="id" value={trabajoId} />
      {confirmarSinFotos && <input type="hidden" name="sinFotos" value="1" />}
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
      {confirmarSinFotos && (
        <p role="alert" className="rounded-sm border border-aviso p-3 text-sm">
          Sin fotos de ingreso ni de detalles no hay cómo probar el estado en que llegó. Toma al menos una o confirma que lo recibes sin fotos.
        </p>
      )}
      {/* En el celular, fijo abajo: a mano aunque el teclado esté abierto en las observaciones (pulido 11.3) */}
      <PieFormulario>
        <Button type="submit" disabled={enviando}>
          <ClipboardCheckIcon />
          {enviando ? "Recibiendo…" : confirmarSinFotos ? "Recibir sin fotos" : "Recibir vehículo"}
        </Button>
      </PieFormulario>
    </form>
  );
}
