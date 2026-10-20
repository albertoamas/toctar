"use client";

import { useActionState, useRef } from "react";
import { useFocoEnError } from "@/componentes/foco-en-error";
import { conAviso } from "@/componentes/panel/avisos";
import { Button } from "@/componentes/ui/button";
import { actualizarCliente, type EstadoCliente } from "../acciones";
import { CamposCliente } from "./campos";

// HU-23: editar los datos de un cliente desde su ficha.

const actualizarConAviso = conAviso(actualizarCliente);

export function FormularioDatosCliente({ id, iniciales }: { id: number; iniciales: Record<string, string> }) {
  const [estado, accion, enviando] = useActionState<EstadoCliente, FormData>(actualizarConAviso, {});
  const formulario = useRef<HTMLFormElement>(null);
  useFocoEnError(formulario, estado);

  return (
    <form ref={formulario} action={accion} className="flex flex-col gap-6" noValidate aria-labelledby="datos-titulo">
      <h2 id="datos-titulo" className="font-heading text-2xl font-bold italic">Datos</h2>
      <input type="hidden" name="id" value={id} />
      <CamposCliente estado={estado} iniciales={iniciales} />
      <div>
        <Button type="submit" disabled={enviando}>
          {enviando ? "Guardando…" : "Guardar cambios"}
        </Button>
      </div>
    </form>
  );
}
