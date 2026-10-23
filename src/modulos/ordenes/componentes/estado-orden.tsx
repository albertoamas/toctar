"use client";

import { useActionState } from "react";
import { CheckIcon } from "lucide-react";
import { cn } from "cn";
import { conAviso } from "@/componentes/panel/avisos";
import { MensajeError } from "@/componentes/panel/campo";
import { Button } from "@/componentes/ui/button";
import type { EstadoTrabajo } from "@/db/esquema/trabajos";
import type { EstadoFormulario } from "@/lib/formularios";
import { cambiarEstadoOrden } from "../acciones";
import { pasosDeOrden } from "../reglas";

// HU-34: el estado de la orden (RF-41). Se usa de pie en el taller, con el celular: los tres pasos a la vista y el
// siguiente como botón grande, a todo el ancho; volver un paso atrás (por si se tocó sin querer) queda chico y aparte.

const PASOS: { estado: EstadoTrabajo; nombre: string }[] = [
  { estado: "recibido", nombre: "Recibida" },
  { estado: "en_proceso", nombre: "En proceso" },
  { estado: "listo", nombre: "Lista" },
];

export function EstadoOrden({ id, estado, editable }: { id: number; estado: EstadoTrabajo; /** Quien mira la trabaja: puede cambiarla. */ editable: boolean }) {
  const [resultado, accion, enviando] = useActionState<EstadoFormulario, FormData>(conAviso(cambiarEstadoOrden), {});
  const actual = PASOS.findIndex((p) => p.estado === estado);
  const { siguiente, anterior } = pasosDeOrden(estado);

  return (
    <section aria-label="Estado de la orden" className="flex flex-col gap-4">
      <ol className="grid grid-cols-3 gap-1">
        {PASOS.map((p, i) => (
          <li
            key={p.estado}
            aria-current={i === actual ? "step" : undefined}
            className={cn(
              "flex min-h-11 items-center justify-center gap-1 border-b-4 px-0.5 text-center text-xs font-semibold whitespace-nowrap sm:gap-1.5 sm:text-sm",
              i < actual && "border-tinta text-tinta",
              i === actual && "border-rojo text-tinta",
              i > actual && "border-border text-tinta-suave",
            )}
          >
            {i < actual && <CheckIcon className="size-3.5 shrink-0 sm:size-4" aria-hidden />}
            {p.nombre}
            {i < actual && <span className="sr-only">, hecho</span>}
          </li>
        ))}
      </ol>
      {resultado.mensaje && !resultado.ok && <MensajeError id="estado-error">{resultado.mensaje}</MensajeError>}
      {editable && (siguiente || anterior) && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {siguiente && (
            <form action={accion} className="sm:flex-1">
              <input type="hidden" name="id" value={id} />
              <input type="hidden" name="estado" value={siguiente.estado} />
              <Button type="submit" disabled={enviando} className="h-14 w-full text-base sm:max-w-sm">
                {siguiente.texto}
              </Button>
            </form>
          )}
          {anterior && (
            <form action={accion}>
              <input type="hidden" name="id" value={id} />
              <input type="hidden" name="estado" value={anterior.estado} />
              <Button type="submit" variant="ghost" disabled={enviando}>
                {anterior.texto}
              </Button>
            </form>
          )}
        </div>
      )}
    </section>
  );
}
