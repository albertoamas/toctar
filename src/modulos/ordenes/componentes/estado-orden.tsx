"use client";

import { useActionState } from "react";
import { conAviso } from "@/componentes/panel/avisos";
import { Button } from "@/componentes/ui/button";
import type { EstadoTrabajo } from "@/db/esquema/trabajos";
import type { EstadoFormulario } from "@/lib/formularios";
import { cambiarEstadoOrden } from "../acciones";
import { pasosDeOrden } from "../reglas";

// HU-34: el estado de la orden (RF-41). El paso siguiente es la acción principal de la ficha y va en su encabezado (C6,
// sistema-del-panel.md §3), del alto de los botones del panel (44 px con el dedo). Los pasos a la vista son los de todo el
// trabajo (PasosTrabajo, pedido 31). Volver un paso atrás (por si se tocó sin querer) está en "Más" (pulido 11.2). Si no
// se pudo cambiar, lo dice el aviso (conAviso).

export function EstadoOrden({ id, estado, editable }: { id: number; estado: EstadoTrabajo; /** Quien mira la trabaja: puede cambiarla. */ editable: boolean }) {
  const [, accion, enviando] = useActionState<EstadoFormulario, FormData>(conAviso(cambiarEstadoOrden), {});
  const { siguiente } = pasosDeOrden(estado);
  // Lista: el paso siguiente (avisar, entregar) va aparte. Sin botón, no queda un hueco
  if (!editable || !siguiente) return null;

  return (
    <form action={accion} aria-label="Estado de la orden">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="estado" value={siguiente.estado} />
      <Button type="submit" disabled={enviando}>
        {siguiente.texto}
      </Button>
    </form>
  );
}
