"use client";

import { useActionState } from "react";
import { conAviso } from "@/componentes/panel/avisos";
import { MensajeError } from "@/componentes/panel/campo";
import { Button } from "@/componentes/ui/button";
import type { EstadoTrabajo } from "@/db/esquema/trabajos";
import type { EstadoFormulario } from "@/lib/formularios";
import { cambiarEstadoOrden } from "../acciones";
import { pasosDeOrden } from "../reglas";

// HU-34: el estado de la orden (RF-41). Se usa de pie en el taller, con el celular: el paso siguiente como botón grande, a
// todo el ancho. Los pasos a la vista son los de todo el trabajo (PasosTrabajo, pedido 31), arriba de la orden. Volver un
// paso atrás (por si se tocó sin querer) está en "Más" (pulido 11.2).

export function EstadoOrden({ id, estado, editable }: { id: number; estado: EstadoTrabajo; /** Quien mira la trabaja: puede cambiarla. */ editable: boolean }) {
  const [resultado, accion, enviando] = useActionState<EstadoFormulario, FormData>(conAviso(cambiarEstadoOrden), {});
  const { siguiente } = pasosDeOrden(estado);
  // Lista: el paso siguiente (avisar, entregar) va aparte. Sin botón, no queda un hueco
  if (!editable || !siguiente) return null;

  return (
    <section aria-label="Estado de la orden" className="flex flex-col gap-4">
      {resultado.mensaje && !resultado.ok && <MensajeError id="estado-error">{resultado.mensaje}</MensajeError>}
      <form action={accion}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="estado" value={siguiente.estado} />
        <Button type="submit" disabled={enviando} className="h-14 w-full text-base sm:max-w-sm">
          {siguiente.texto}
        </Button>
      </form>
    </section>
  );
}
