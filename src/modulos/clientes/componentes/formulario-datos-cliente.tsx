"use client";

import { useActionState, useRef } from "react";
import { useFocoEnError } from "@/componentes/foco-en-error";
import { conAviso } from "@/componentes/panel/avisos";
import { CancelarModal, PieModal, useCerrarModal } from "@/componentes/panel/modal-formulario";
import { Button } from "@/componentes/ui/button";
import { actualizarCliente, type EstadoCliente } from "../acciones";
import { CamposCliente } from "./campos";

// HU-23: editar los datos de un cliente. Va en el modal de "Editar" de su ficha (pulido 8.3) y lo cierra al guardar.

export function FormularioDatosCliente({ id, iniciales }: { id: number; iniciales: Record<string, string> }) {
  const cerrar = useCerrarModal();
  const [estado, accion, enviando] = useActionState<EstadoCliente, FormData>(
    conAviso(actualizarCliente, (r) => r.ok && cerrar()),
    {},
  );
  const formulario = useRef<HTMLFormElement>(null);
  useFocoEnError(formulario, estado);

  return (
    <form ref={formulario} action={accion} className="flex flex-col gap-6" noValidate aria-label="Datos del cliente">
      <input type="hidden" name="id" value={id} />
      <CamposCliente estado={estado} iniciales={iniciales} />
      <PieModal>
        <Button type="submit" disabled={enviando}>
          {enviando ? "Guardando…" : "Guardar datos"}
        </Button>
        <CancelarModal />
      </PieModal>
    </form>
  );
}
