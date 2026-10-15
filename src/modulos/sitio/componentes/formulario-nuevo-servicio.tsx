"use client";

import { useActionState } from "react";
import { Campo } from "@/componentes/panel/campo";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Textarea } from "@/componentes/ui/textarea";
import type { EstadoFormulario } from "@/lib/formularios";
import { crearServicio } from "../acciones";
import { LIMITES } from "../esquemas";

// HU-07: alta de un servicio con lo mínimo. Al crearlo se abre la edición completa.
export function FormularioNuevoServicio() {
  const [estado, accion, enviando] = useActionState<EstadoFormulario, FormData>(crearServicio, {});
  const v = estado.valores;
  const e = estado.errores ?? {};
  return (
    <form action={accion} className="flex max-w-xl flex-col gap-6" noValidate>
      <Campo id="nombre" etiqueta="Nombre del servicio" error={e.nombre}>
        <Input id="nombre" name="nombre" autoComplete="off" defaultValue={v?.nombre} aria-invalid={!!e.nombre} aria-describedby={e.nombre ? "nombre-error" : undefined} />
      </Campo>
      <Campo id="resumen" etiqueta="Resumen" error={e.resumen} ayuda="Una o dos frases. Se ve en la tarjeta del servicio y en Google.">
        <Textarea id="resumen" name="resumen" rows={3} maxLength={LIMITES.resumen + 40} defaultValue={v?.resumen} aria-invalid={!!e.resumen} aria-describedby={e.resumen ? "resumen-error" : "resumen-ayuda"} />
      </Campo>
      <div>
        <Button type="submit" disabled={enviando}>
          {enviando ? "Creando…" : "Crear servicio"}
        </Button>
      </div>
    </form>
  );
}
