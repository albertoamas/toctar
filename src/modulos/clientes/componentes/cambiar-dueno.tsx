"use client";

import type { Route } from "next";
import Link from "next/link";
import { useActionState } from "react";
import { cn } from "cn";
import { ArrowRightLeftIcon } from "lucide-react";
import { conAviso } from "@/componentes/panel/avisos";
import { MensajeError } from "@/componentes/panel/campo";
import { PieFormulario } from "@/componentes/panel/pie-formulario";
import { Button, buttonVariants } from "@/componentes/ui/button";
import type { EstadoFormulario } from "@/lib/formularios";
import { cambiarDuenoVehiculo } from "../acciones";

// Confirmar el cambio de dueño de un vehículo (pedido 37): un formulario con los tres ids y su pie, fijo abajo en el
// celular como en Recibir. Al terminar, la acción lleva a la ficha del nuevo dueño.

type Props = { vehiculoId: number; clienteActualId: number; clienteNuevoId: number; /** A dónde vuelve "Cancelar". */ cancelar: Route };

export function ConfirmarCambioDueno({ vehiculoId, clienteActualId, clienteNuevoId, cancelar }: Props) {
  const [resultado, accion, enviando] = useActionState<EstadoFormulario, FormData>(conAviso(cambiarDuenoVehiculo), {});
  return (
    <form action={accion} className="flex flex-col gap-4" aria-label="Cambiar de dueño">
      <input type="hidden" name="vehiculoId" value={vehiculoId} />
      <input type="hidden" name="clienteActualId" value={clienteActualId} />
      <input type="hidden" name="clienteNuevoId" value={clienteNuevoId} />
      {resultado.mensaje && !resultado.ok && <MensajeError id="cambio-dueno-error">{resultado.mensaje}</MensajeError>}
      <PieFormulario>
        <Button type="submit" disabled={enviando}>
          <ArrowRightLeftIcon />
          {enviando ? "Cambiando…" : "Cambiar de dueño"}
        </Button>
        <Link href={cancelar} className={cn(buttonVariants({ variant: "outline" }))}>
          Cancelar
        </Link>
      </PieFormulario>
    </form>
  );
}
