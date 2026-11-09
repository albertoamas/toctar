"use client";

import { useActionState, useRef, useState } from "react";
import { ClipboardCheckIcon } from "lucide-react";
import { useFocoEnError } from "@/componentes/foco-en-error";
import { Campo, MensajeError } from "@/componentes/panel/campo";
import { AvisoAlSalir } from "@/componentes/panel/cambios-sin-guardar";
import { PieFormulario } from "@/componentes/panel/pie-formulario";
import { BOTON_PASO } from "@/componentes/panel/paso-siguiente";
import { Button } from "@/componentes/ui/button";
import { Textarea } from "@/componentes/ui/textarea";
import type { EstadoFormulario } from "@/lib/formularios";
import { recibirVehiculo } from "../acciones";
import { useFaltanChecklist } from "./checklist-recepcion";

// HU-33: recibir el vehículo (RF-40). Cómo llegó lo dice el checklist (pedido 12), con la foto de cada detalle; aquí van
// las observaciones (pedido 32: sin técnico asignado). El servidor no recibe con partes del checklist sin revisar.

export function FormularioRecepcion({ trabajoId, faltan }: { trabajoId: number; /** Partes del checklist sin revisar. */ faltan: number }) {
  const [estado, accion, enviando] = useActionState<EstadoFormulario, FormData>(recibirVehiculo, {});
  const formulario = useRef<HTMLFormElement>(null);
  useFocoEnError(formulario, estado);
  const e = estado.errores ?? {};
  const faltanAhora = useFaltanChecklist(faltan);
  // Controlado: React reinicia el formulario al terminar la acción y así lo escrito no se pierde tras un error
  const [observaciones, setObservaciones] = useState("");

  return (
    <form ref={formulario} action={accion} className="tt-formulario-panel flex flex-col gap-5" noValidate aria-label="Recibir vehículo">
      <input type="hidden" name="id" value={trabajoId} />
      {estado.mensaje && !estado.ok && <MensajeError id="recepcion-error">{estado.mensaje}</MensajeError>}
      <Campo id="observaciones" etiqueta="Observaciones" opcional error={e.observaciones} ayuda="Lo que no está en el checklist: objetos que deja el cliente, lo que pidió…">
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
      {/* En el celular, fijo abajo: a mano aunque el teclado esté abierto en las observaciones (pulido 11.3) */}
      <AvisoAlSalir formulario={formulario} estado={estado} />
      <PieFormulario>
        {/* El paso que cierra el flujo, grande como el paso siguiente de Reserva y Orden (pulido de Recibir, 09/11). No se
            desactiva: tocado antes, el servidor dice qué falta; al lado, cuántas quedan */}
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          <Button type="submit" size="paso" disabled={enviando} className={BOTON_PASO}>
            <ClipboardCheckIcon />
            {enviando ? "Recibiendo…" : "Recibir vehículo"}
          </Button>
          {faltanAhora > 0 && (
            <p className="text-sm text-tinta-suave">
              {faltanAhora === 1 ? "Falta 1 parte del checklist" : `Faltan ${faltanAhora} partes del checklist`}
            </p>
          )}
        </div>
      </PieFormulario>
    </form>
  );
}
