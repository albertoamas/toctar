"use client";

import { useActionState, useRef, useState } from "react";
import { PlusIcon } from "lucide-react";
import { useFocoEnError } from "@/componentes/foco-en-error";
import { useHidratado } from "@/componentes/hidratado";
import { Campo } from "@/componentes/panel/campo";
import { ModalFormulario } from "@/componentes/panel/modal-formulario";
import { CancelarModal, PieModal } from "@/componentes/panel/modal-pie";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import type { EstadoFormulario } from "@/lib/formularios";
import { crearServicio } from "../acciones";

// HU-19: alta de un servicio con su nombre y su duración, en un modal desde la lista del catálogo (pulido 7.2: dos
// campos no necesitan una pantalla). Al crearlo se abre su ficha, con sus precios para cargar; su página en el sitio se
// completa en Sitio web. La duración va aquí desde el hallazgo 2 de la prueba en celulares (15/11): sin ella nacía con 1
// día, y el dueño la escribía en los precios, como la de la variante.
export function AgregarServicio() {
  const [abierto, setAbierto] = useState(false);
  const hidratado = useHidratado();
  return (
    <>
      <Button type="button" disabled={!hidratado} onClick={() => setAbierto(true)}>
        <PlusIcon />
        Nuevo servicio
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
      <Campo id="nuevo-duracion" etiqueta="Duración estimada" error={e.duracionDias} ayuda="Los días que suele ocupar un espacio del taller.">
        <div className="flex items-center gap-2">
          <Input
            id="nuevo-duracion"
            name="duracionDias"
            inputMode="numeric"
            autoComplete="off"
            defaultValue={estado.valores?.duracionDias}
            aria-invalid={!!e.duracionDias}
            aria-describedby={e.duracionDias ? "nuevo-duracion-error" : "nuevo-duracion-ayuda"}
            className="max-w-24"
          />
          <span className="text-tinta-suave">días</span>
        </div>
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
