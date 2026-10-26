"use client";

import { useActionState, useRef } from "react";
import { useFocoEnError } from "@/componentes/foco-en-error";
import { conAviso } from "@/componentes/panel/avisos";
import { Campo } from "@/componentes/panel/campo";
import { CancelarSeccion, useCerrarSeccion } from "@/componentes/panel/seccion-editable";
import { Button } from "@/componentes/ui/button";
import { Checkbox } from "@/componentes/ui/checkbox";
import { Input } from "@/componentes/ui/input";
import type { EstadoFormulario } from "@/lib/formularios";
import { guardarDatosCatalogo } from "../acciones";

// HU-19: nombre, duración, mantenimiento y si el servicio está activo en el catálogo. Se abre con "Editar" desde la
// ficha del servicio y se cierra al guardar.

type Props = { servicio: { id: number; nombre: string; duracionDias: number; generaMantenimiento: boolean; activo: boolean } };

export function FormularioDatosCatalogo({ servicio: s }: Props) {
  const cerrar = useCerrarSeccion();
  const [estado, accion, enviando] = useActionState<EstadoFormulario, FormData>(
    conAviso(guardarDatosCatalogo, (r) => r.ok && cerrar()),
    {},
  );
  const formulario = useRef<HTMLFormElement>(null);
  useFocoEnError(formulario, estado);
  const v = estado.valores;
  const e = estado.errores ?? {};
  const generaMantenimiento = v ? v.generaMantenimiento === "on" : s.generaMantenimiento;
  const activo = v ? v.activo === "on" : s.activo;

  return (
    <form ref={formulario} action={accion} className="flex max-w-2xl flex-col gap-6" noValidate aria-label="Datos del servicio">
      <input type="hidden" name="id" value={s.id} />
      <Campo id="nombre" etiqueta="Nombre del servicio" error={e.nombre}>
        <Input
          id="nombre"
          name="nombre"
          autoComplete="off"
          defaultValue={v?.nombre ?? s.nombre}
          aria-invalid={!!e.nombre}
          aria-describedby={e.nombre ? "nombre-error" : undefined}
          className="max-w-md"
        />
      </Campo>
      <Campo
        id="duracionDias"
        etiqueta="Duración estimada"
        error={e.duracionDias}
        ayuda="Los días que suele ocupar un espacio. Solo sugiere la entrega al agendar."
      >
        <div className="flex items-center gap-2">
          <Input
            id="duracionDias"
            name="duracionDias"
            inputMode="numeric"
            autoComplete="off"
            defaultValue={v?.duracionDias ?? s.duracionDias}
            aria-invalid={!!e.duracionDias}
            aria-describedby={e.duracionDias ? "duracionDias-error" : "duracionDias-ayuda"}
            className="max-w-24"
          />
          <span className="text-tinta-suave">días</span>
        </div>
      </Campo>
      <Casilla
        nombre="generaMantenimiento"
        marcada={generaMantenimiento}
        etiqueta="Genera recordatorio de mantenimiento"
        ayuda="Al entregarlo, se programa el aviso."
      />
      <Casilla nombre="activo" marcada={activo} etiqueta="Activo en el catálogo" ayuda="Inactivo, no se cotiza ni sale en el sitio. No se borra nada." />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={enviando}>
          {enviando ? "Guardando…" : "Guardar datos"}
        </Button>
        <CancelarSeccion />
      </div>
    </form>
  );
}

function Casilla({ nombre, marcada, etiqueta, ayuda }: { nombre: string; marcada: boolean; etiqueta: string; ayuda: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      {/* La key reinicia la casilla si el servidor devuelve otro valor */}
      <Checkbox key={String(marcada)} name={nombre} defaultChecked={marcada} className="mt-0.5" />
      <span className="flex flex-col">
        <span className="font-semibold">{etiqueta}</span>
        <span className="text-sm text-tinta-suave">{ayuda}</span>
      </span>
    </label>
  );
}
