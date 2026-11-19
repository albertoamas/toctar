"use client";

import { useActionState, useRef } from "react";
import { useFocoEnError } from "@/componentes/foco-en-error";
import { AvisoAlSalir } from "@/componentes/panel/cambios-sin-guardar";
import { PieFormulario } from "@/componentes/panel/pie-formulario";
import { SeccionFormulario } from "@/componentes/panel/seccion-formulario";
import { Button } from "@/componentes/ui/button";
import type { Tamano } from "@/modulos/configuracion/consultas";
import { crearCliente, type EstadoCliente } from "../acciones";
import { CamposCliente, CamposVehiculo } from "./campos";
import type { CatalogoVehiculos } from "@/modulos/clientes/catalogo-vehiculos";

// HU-21: alta de un cliente con, opcional, su primer vehículo (lo normal es registrarlo con su auto). Pulido 8.2: a la
// vista, lo del caso común (nombre y WhatsApp; placa y tamaño); el resto, plegado detrás de "Agregar …".
// 17/11: dos tarjetas con título, "Cliente" y "Vehículo", como las secciones de la reserva y la cotización. Con espacio,
// lado a lado y con los títulos a la misma altura; adentro, una columna de campos.

export function FormularioNuevoCliente({ tamanos, catalogo }: { tamanos: Tamano[]; catalogo: CatalogoVehiculos }) {
  const [estado, accion, enviando] = useActionState<EstadoCliente, FormData>(crearCliente, {});
  const formulario = useRef<HTMLFormElement>(null);
  useFocoEnError(formulario, estado);

  return (
    <form ref={formulario} action={accion} className="flex flex-col gap-6" noValidate>
      <div className="grid items-start gap-6 @6xl:grid-cols-2">
        <SeccionFormulario titulo="Cliente" claseContenido="gap-6">
          <CamposCliente estado={estado} plegar />
        </SeccionFormulario>
        <SeccionFormulario titulo="Vehículo (opcional)" claseContenido="gap-6">
          <CamposVehiculo estado={estado} prefijo="vehiculo-" tamanos={tamanos} catalogo={catalogo} plegar />
        </SeccionFormulario>
      </div>
      <AvisoAlSalir formulario={formulario} estado={estado} />
      <PieFormulario>
        <Button type="submit" disabled={enviando}>
          {enviando ? "Creando…" : "Crear cliente"}
        </Button>
      </PieFormulario>
    </form>
  );
}
