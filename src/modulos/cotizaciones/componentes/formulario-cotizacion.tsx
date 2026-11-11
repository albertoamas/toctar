"use client";

import { useActionState, useRef } from "react";
import { useFocoEnError } from "@/componentes/foco-en-error";
import { MensajeError } from "@/componentes/panel/campo";
import { AvisoAlSalir } from "@/componentes/panel/cambios-sin-guardar";
import { PieFormulario } from "@/componentes/panel/pie-formulario";
import { Button } from "@/componentes/ui/button";
import type { EstadoFormulario } from "@/lib/formularios";
import { guardarVersion } from "../acciones";
import type { DatosNuevaVersion } from "../consultas";
import { modoDe } from "../reglas";
import { CamposPrecio, TotalEnPie, usePrecios } from "./campos-precio";

// Versión nueva de una cotización pendiente (RN-02): arranca con los servicios, precios y condiciones de la vigente, con
// la validez de hoy. El cliente y el vehículo no cambian. Guardar es enviar: la anterior queda con su PDF.

type Props = {
  datos: DatosNuevaVersion & { desde: NonNullable<DatosNuevaVersion["desde"]> };
  hoy: string;
  /** La cotización con su origen: al guardar, vuelve a donde se estaba antes de abrirla (pedido 43). */
  volver: string;
};

export function FormularioNuevaVersion({ datos, hoy, volver }: Props) {
  const [estado, accion, enviando] = useActionState<EstadoFormulario, FormData>(guardarVersion, {});
  const formulario = useRef<HTMLFormElement>(null);
  useFocoEnError(formulario, estado);
  const precios = usePrecios({ ...datos.inicial, modo: modoDe(datos.inicial.esEstimado) });

  return (
    <form ref={formulario} action={accion} className="flex flex-col gap-6" noValidate>
      <input type="hidden" name="consultaId" value={datos.consultaId} />
      <input type="hidden" name="desde" value={datos.desde.id} />
      <input type="hidden" name="volver" value={volver} />
      {estado.mensaje && !estado.ok && <MensajeError id="cotizacion-error">{estado.mensaje}</MensajeError>}
      <CamposPrecio
        precios={precios}
        opciones={datos.opciones}
        errores={estado.errores ?? {}}
        hoy={hoy}
        anterior={{ version: datos.desde.version, total: datos.desde.total, quitados: datos.quitados }}
      />
      <AvisoAlSalir formulario={formulario} estado={estado} />
      <PieFormulario>
        <div className="flex w-full flex-wrap items-center justify-between gap-x-4 gap-y-2 sm:justify-start">
          <TotalEnPie total={precios.totales.total} />
          <Button type="submit" disabled={enviando}>
            {enviando ? "Guardando y generando el PDF…" : `Guardar versión ${datos.desde.version + 1}`}
          </Button>
        </div>
      </PieFormulario>
    </form>
  );
}
