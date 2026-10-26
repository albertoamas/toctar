"use client";

import { useActionState, useRef } from "react";
import { useFocoEnError } from "@/componentes/foco-en-error";
import { Campo } from "@/componentes/panel/campo";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import type { EstadoFormulario } from "@/lib/formularios";
import { crearServicio } from "../acciones";

// HU-19: alta de un servicio con su nombre. Al crearlo se abre su ficha del catálogo (variantes y precios); su página
// en el sitio se completa en Sitio web.
// Los id llevan "nuevo-": Next deja la pantalla anterior oculta en la página y no deben repetirse con los de la ficha.
export function FormularioNuevoServicio() {
  const [estado, accion, enviando] = useActionState<EstadoFormulario, FormData>(crearServicio, {});
  const e = estado.errores ?? {};
  const formulario = useRef<HTMLFormElement>(null);
  useFocoEnError(formulario, estado);
  return (
    <form ref={formulario} action={accion} className="flex max-w-xl flex-col gap-6" noValidate>
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
      <div>
        <Button type="submit" disabled={enviando}>
          {enviando ? "Creando…" : "Crear servicio"}
        </Button>
      </div>
    </form>
  );
}
