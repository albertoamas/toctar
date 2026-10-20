"use client";

import { useActionState, useRef } from "react";
import { useFocoEnError } from "@/componentes/foco-en-error";
import { conAviso } from "@/componentes/panel/avisos";
import { Campo } from "@/componentes/panel/campo";
import { Button } from "@/componentes/ui/button";
import { Checkbox } from "@/componentes/ui/checkbox";
import { Input } from "@/componentes/ui/input";
import type { EstadoFormulario } from "@/lib/formularios";
import { guardarDatosCatalogo } from "../acciones";

// HU-19: duración, mantenimiento y si el servicio está activo en el catálogo.

const guardarConAviso = conAviso(guardarDatosCatalogo);

type Props = { servicio: { id: number; duracionDias: number; generaMantenimiento: boolean; activo: boolean } };

export function FormularioDatosCatalogo({ servicio: s }: Props) {
  const [estado, accion, enviando] = useActionState<EstadoFormulario, FormData>(guardarConAviso, {});
  const formulario = useRef<HTMLFormElement>(null);
  useFocoEnError(formulario, estado);
  const v = estado.valores;
  const e = estado.errores ?? {};
  const generaMantenimiento = v ? v.generaMantenimiento === "on" : s.generaMantenimiento;
  const activo = v ? v.activo === "on" : s.activo;

  return (
    <form ref={formulario} action={accion} className="flex flex-col gap-6" noValidate aria-labelledby="datos-catalogo-titulo">
      <h2 id="datos-catalogo-titulo" className="font-heading text-2xl font-bold italic">Datos del catálogo</h2>
      <input type="hidden" name="id" value={s.id} />
      <Campo id="duracionDias" etiqueta="Duración" error={e.duracionDias} ayuda="Días que ocupa un espacio del taller. La agenda la usa para sugerir la fecha de entrega.">
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
        ayuda="Al entregar, se programa el aviso según el intervalo de Configuración."
      />
      <Casilla nombre="activo" marcada={activo} etiqueta="Activo en el catálogo" ayuda="Si lo desmarcas, no se cotiza ni sale en el sitio. No se borra nada." />
      <div>
        <Button type="submit" disabled={enviando}>
          {enviando ? "Guardando…" : "Guardar"}
        </Button>
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
