"use client";

import { useActionState } from "react";
import { ArrowRightLeftIcon } from "lucide-react";
import { conAviso } from "@/componentes/panel/avisos";
import { MensajeError } from "@/componentes/panel/campo";
import { Button } from "@/componentes/ui/button";
import type { EstadoFormulario } from "@/lib/formularios";
import { cambiarDuenoVehiculo } from "../acciones";

// Confirmar el cambio de dueño de un vehículo (pedido 37): un formulario con los tres ids y un botón que dice a quién
// pasa. Al terminar, la acción lleva a la ficha del nuevo dueño.

type Props = { vehiculoId: number; clienteActualId: number; clienteNuevoId: number; nuevo: string };

export function ConfirmarCambioDueno({ vehiculoId, clienteActualId, clienteNuevoId, nuevo }: Props) {
  const [resultado, accion, enviando] = useActionState<EstadoFormulario, FormData>(conAviso(cambiarDuenoVehiculo), {});
  return (
    <form action={accion} className="flex flex-col gap-4" aria-label="Cambiar de dueño">
      <input type="hidden" name="vehiculoId" value={vehiculoId} />
      <input type="hidden" name="clienteActualId" value={clienteActualId} />
      <input type="hidden" name="clienteNuevoId" value={clienteNuevoId} />
      {resultado.mensaje && !resultado.ok && <MensajeError id="cambio-dueno-error">{resultado.mensaje}</MensajeError>}
      <Button type="submit" disabled={enviando} className="self-start">
        <ArrowRightLeftIcon />
        {enviando ? "Pasando…" : `Pasar a ${nuevo}`}
      </Button>
    </form>
  );
}
