"use client";

import { useActionState, useRef } from "react";
import { useFocoEnError } from "@/componentes/foco-en-error";
import { PieFormulario } from "@/componentes/panel/pie-formulario";
import { Button } from "@/componentes/ui/button";
import type { Tamano } from "@/modulos/configuracion/consultas";
import { crearCliente, type EstadoCliente } from "../acciones";
import { CamposCliente, CamposVehiculo } from "./campos";

// HU-21: alta de un cliente con, opcional, su primer vehículo (lo normal es registrarlo con su auto). Pulido 8.2: a la
// vista, lo del caso común (nombre y WhatsApp; placa y tamaño); el resto, plegado detrás de "Agregar …".

export function FormularioNuevoCliente({ tamanos }: { tamanos: Tamano[] }) {
  const [estado, accion, enviando] = useActionState<EstadoCliente, FormData>(crearCliente, {});
  const formulario = useRef<HTMLFormElement>(null);
  useFocoEnError(formulario, estado);

  return (
    <form ref={formulario} action={accion} className="flex max-w-2xl flex-col gap-6" noValidate>
      <CamposCliente estado={estado} plegar />
      {/* La línea va afuera: en el borde de un fieldset, la legend lo corta */}
      <div className="border-t border-border pt-8">
        <fieldset className="flex flex-col gap-6">
          <legend className="mb-5 flex flex-col gap-1">
            <span className="font-heading text-2xl font-bold italic">Primer vehículo</span>
            <span className="text-sm text-tinta-suave">Opcional. Más vehículos, desde su ficha.</span>
          </legend>
          <CamposVehiculo estado={estado} prefijo="vehiculo-" tamanos={tamanos} plegar />
        </fieldset>
      </div>
      <PieFormulario>
        <Button type="submit" disabled={enviando}>
          {enviando ? "Creando…" : "Crear cliente"}
        </Button>
      </PieFormulario>
    </form>
  );
}
