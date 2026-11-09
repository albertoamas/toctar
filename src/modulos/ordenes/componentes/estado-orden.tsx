"use client";

import { useActionState } from "react";
import { conAviso } from "@/componentes/panel/avisos";
import { FormularioPaso } from "@/componentes/panel/formulario-paso";
import type { EstadoTrabajo } from "@/db/esquema/trabajos";
import type { EstadoFormulario } from "@/lib/formularios";
import { cambiarEstadoOrden } from "../acciones";
import { pasosDeOrden } from "../reglas";

// HU-34: el estado de la orden (RF-41). Se usa de pie en el taller, con el celular: el paso siguiente como botón grande
// (PasoSiguiente, sistema-del-panel.md §3), y si no se pudo cambiar, el motivo queda debajo. Los pasos a la vista son los de
// todo el trabajo (PasosTrabajo, pedido 31). Volver un paso atrás (por si se tocó sin querer) está en "Más" (pulido 11.2).

export function EstadoOrden({ id, estado, editable }: { id: number; estado: EstadoTrabajo; /** Quien mira la trabaja: puede cambiarla. */ editable: boolean }) {
  const [resultado, accion, enviando] = useActionState<EstadoFormulario, FormData>(conAviso(cambiarEstadoOrden), {});
  const { siguiente } = pasosDeOrden(estado);
  // Lista: el paso siguiente (avisar, entregar) va aparte. Sin botón, no queda un hueco
  if (!editable || !siguiente) return null;

  return (
    <FormularioPaso
      etiqueta="Estado de la orden"
      accion={accion}
      ocultos={{ id, estado: siguiente.estado }}
      enviando={enviando}
      error={resultado.ok ? undefined : resultado.mensaje}
      idError="estado-error"
    >
      {siguiente.texto}
    </FormularioPaso>
  );
}
