"use client";

import { useActionState, useRef, useState } from "react";
import { PlusIcon } from "lucide-react";
import { useFocoEnError } from "@/componentes/foco-en-error";
import { useHidratado } from "@/componentes/hidratado";
import { Campo } from "@/componentes/panel/campo";
import { CancelarModal, ModalFormulario, PieModal } from "@/componentes/panel/modal-formulario";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import type { EstadoFormulario } from "@/lib/formularios";
import { crearServicio } from "../acciones";

// HU-19: alta de un servicio con su nombre, en un modal desde la lista del catálogo (pulido 7.2: un solo campo no
// necesita una pantalla). Al crearlo se abre su ficha, con sus precios para cargar; su página en el sitio se completa en
// Sitio web.
export function AgregarServicio() {
  const [abierto, setAbierto] = useState(false);
  const hidratado = useHidratado();
  return (
    <>
      <Button type="button" disabled={!hidratado} onClick={() => setAbierto(true)}>
        <PlusIcon />
        Agregar servicio
      </Button>
      <ModalFormulario titulo="Nuevo servicio" abierto={abierto} alCambiar={setAbierto}>
        <FormularioNuevoServicio />
      </ModalFormulario>
    </>
  );
}

function FormularioNuevoServicio() {
  const [estado, accion, enviando] = useActionState<EstadoFormulario, FormData>(crearServicio, {});
  const e = estado.errores ?? {};
  const formulario = useRef<HTMLFormElement>(null);
  useFocoEnError(formulario, estado);
  return (
    <form ref={formulario} action={accion} className="flex flex-col gap-6" noValidate>
      <Campo id="nuevo-nombre" etiqueta="Nombre del servicio" error={e.nombre} ayuda="Como lo conocen los clientes.">
        <Input
          id="nuevo-nombre"
          name="nombre"
          autoComplete="off"
          defaultValue={estado.valores?.nombre}
          aria-invalid={!!e.nombre}
          aria-describedby={e.nombre ? "nuevo-nombre-error" : "nuevo-nombre-ayuda"}
        />
      </Campo>
      <PieModal>
        <Button type="submit" disabled={enviando}>
          {enviando ? "Creando…" : "Crear servicio"}
        </Button>
        <CancelarModal />
      </PieModal>
    </form>
  );
}
