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
import { NOMBRE_ESTADO_TRABAJO } from "@/modulos/agenda/reglas";
import { ESTADOS_ORDEN_ABIERTA, pasosDeOrden } from "../reglas";

// HU-34: el estado de la orden (RF-41). Se usa de pie en el taller, con el celular: los tres pasos a la vista, cada uno
// con su círculo (pedido 26), y el siguiente como botón grande, a todo el ancho. Volver un paso atrás (por si se tocó sin
// querer) está en "Más" (pulido 11.2).

const PASOS = ESTADOS_ORDEN_ABIERTA.map((estado) => ({ estado, nombre: NOMBRE_ESTADO_TRABAJO[estado] }));

export function EstadoOrden({ id, estado, editable }: { id: number; estado: EstadoTrabajo; /** Quien mira la trabaja: puede cambiarla. */ editable: boolean }) {
  const [resultado, accion, enviando] = useActionState<EstadoFormulario, FormData>(conAviso(cambiarEstadoOrden), {});
  const actual = PASOS.findIndex((p) => p.estado === estado);
  const { siguiente } = pasosDeOrden(estado);

  return (
    <section aria-label="Estado de la orden" className="flex flex-col gap-4">
      {/* Pasos con su círculo (pedido 26): hecho en verde con ✓, el actual en azul, los que faltan en gris. El número sale de
          un contador CSS, así el texto de cada paso es solo su nombre */}
      <ol className="tt-tarjeta-panel grid grid-cols-3 gap-2 px-3 py-3 [counter-reset:paso] sm:px-4">
        {PASOS.map((p, i) => (
          <li
            key={p.estado}
            aria-current={i === actual ? "step" : undefined}
            className={cn(
              "flex min-h-11 min-w-0 flex-col items-center justify-center gap-1 text-center text-xs font-semibold [counter-increment:paso] sm:flex-row sm:justify-start sm:gap-2.5 sm:text-left sm:text-sm",
              i < actual && "text-tinta",
              i === actual && "text-info",
              i > actual && "text-tinta-suave",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "grid size-7 shrink-0 place-items-center rounded-full border-2 text-xs",
                i < actual && "border-exito bg-exito text-fondo",
                i === actual && "border-info bg-info-fondo before:content-[counter(paso)]",
                i > actual && "border-border bg-fondo before:content-[counter(paso)]",
              )}
            >
              {i < actual && <CheckIcon className="size-4" />}
            </span>
            {p.nombre}
            {i < actual && <span className="sr-only">, hecho</span>}
          </li>
        ))}
      </ol>
      {resultado.mensaje && !resultado.ok && <MensajeError id="estado-error">{resultado.mensaje}</MensajeError>}
      {editable && siguiente && (
        <form action={accion}>
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="estado" value={siguiente.estado} />
          <Button type="submit" disabled={enviando} className="h-14 w-full text-base sm:max-w-sm">
            {siguiente.texto}
          </Button>
        </form>
      )}
    </section>
  );
}
