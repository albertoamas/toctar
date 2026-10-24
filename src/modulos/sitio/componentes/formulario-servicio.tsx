"use client";

import { useActionState, useRef, useState } from "react";
import { useFocoEnError } from "@/componentes/foco-en-error";
import { conAviso } from "@/componentes/panel/avisos";
import { Campo } from "@/componentes/panel/campo";
import { EditorLista } from "@/componentes/panel/editor-lista";
import { TextoCorto } from "@/componentes/panel/texto-corto";
import { Button } from "@/componentes/ui/button";
import { Checkbox } from "@/componentes/ui/checkbox";
import { Input } from "@/componentes/ui/input";
import { Textarea } from "@/componentes/ui/textarea";
import type { Paso } from "@/db/esquema";
import type { EstadoFormulario } from "@/lib/formularios";
import { guardarServicio } from "../acciones";
import { LIMITES } from "../esquemas";

// HU-07: la página del servicio en el sitio (RF-03). Sin precios (RN-10). El nombre y las variantes son del catálogo.

type Props = {
  servicio: { id: number; slug: string; resumen: string; descripcion: string; beneficios: string[]; pasos: Paso[]; visible: boolean };
};

const guardarConAviso = conAviso(guardarServicio);

export function FormularioServicio({ servicio: s }: Props) {
  const [estado, accion, enviando] = useActionState<EstadoFormulario, FormData>(guardarConAviso, {});
  const [beneficios, setBeneficios] = useState(s.beneficios);
  const [pasos, setPasos] = useState(s.pasos);
  const v = estado.valores;
  const e = estado.errores ?? {};
  const visible = v ? v.visible === "on" : s.visible;
  // Cada campo tiene su ayuda: debajo va el error, si lo hay, o la ayuda
  const describir = (c: string) => (e[c] ? `${c}-error` : `${c}-ayuda`);
  const formulario = useRef<HTMLFormElement>(null);
  useFocoEnError(formulario, estado);

  return (
    <form ref={formulario} action={accion} className="flex flex-col gap-10" noValidate>
      <input type="hidden" name="id" value={s.id} />

      <Seccion titulo="Datos">
        <Campo id="slug" etiqueta="Dirección de la página" error={e.slug} ayuda={`Así se ve en el navegador: …/servicios/${s.slug}. Si la cambias, los enlaces viejos dejan de funcionar.`}>
          <Input id="slug" name="slug" autoComplete="off" autoCapitalize="none" spellCheck={false} defaultValue={v?.slug ?? s.slug} aria-invalid={!!e.slug} aria-describedby={describir("slug")} />
        </Campo>
        <Campo id="resumen" etiqueta="Resumen" error={e.resumen} ayuda="Una o dos frases. Se ve en la tarjeta del servicio y en Google.">
          <Textarea id="resumen" name="resumen" rows={3} defaultValue={v?.resumen ?? s.resumen} aria-invalid={!!e.resumen} aria-describedby={describir("resumen")} />
        </Campo>
        <Campo id="descripcion" etiqueta="Descripción" error={e.descripcion} ayuda="En qué consiste el servicio y para qué sirve. Sin precios.">
          <Textarea id="descripcion" name="descripcion" className="min-h-32" defaultValue={v?.descripcion ?? s.descripcion} aria-invalid={!!e.descripcion} aria-describedby={describir("descripcion")} />
        </Campo>
        <label className="flex cursor-pointer items-start gap-3">
          <Checkbox key={String(visible)} name="visible" defaultChecked={visible} className="mt-0.5" />
          <span className="flex flex-col">
            <span className="font-semibold">Mostrar en el sitio</span>
            <span className="text-sm text-tinta-suave">Si lo desmarcas, no aparece en el sitio, pero no se borra.</span>
          </span>
        </label>
      </Seccion>

      <Seccion titulo="Beneficios" descripcion={`Lo que gana el cliente. Hasta ${LIMITES.beneficios}.`}>
        <EditorLista
          nombre="beneficios"
          etiqueta="Beneficio"
          valor={beneficios}
          onChange={setBeneficios}
          nueva={() => ""}
          maximo={LIMITES.beneficios}
          textoAgregar="Agregar beneficio"
          errores={e}
          fila={(texto, cambiar, i, marca) => (
            <TextoCorto value={texto} onChange={(ev) => cambiar(ev.target.value)} aria-label={`Beneficio ${i + 1}`} placeholder="Brillo que dura años" {...marca} />
          )}
        />
      </Seccion>

      <Seccion titulo="Proceso paso a paso" descripcion={`Cómo se hace, en orden. Hasta ${LIMITES.pasos} pasos.`}>
        <EditorLista
          nombre="pasos"
          etiqueta="Paso"
          valor={pasos}
          onChange={setPasos}
          nueva={() => ({ titulo: "", detalle: "" })}
          maximo={LIMITES.pasos}
          textoAgregar="Agregar paso"
          errores={e}
          fila={(paso, cambiar, i, marca) => (
            <>
              <Input value={paso.titulo} onChange={(ev) => cambiar({ ...paso, titulo: ev.target.value })} aria-label={`Paso ${i + 1}, título`} placeholder="Lavado técnico" {...marca} />
              <Textarea value={paso.detalle} onChange={(ev) => cambiar({ ...paso, detalle: ev.target.value })} aria-label={`Paso ${i + 1}, detalle`} rows={2} placeholder="Qué se hace en este paso (opcional)" {...marca} />
            </>
          )}
        />
      </Seccion>

      <div>
        <Button type="submit" disabled={enviando}>
          {enviando ? "Guardando…" : "Guardar cambios"}
        </Button>
      </div>
    </form>
  );
}

function Seccion(props: { titulo: string; descripcion?: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-5">
      <legend className="mb-5 flex flex-col gap-1">
        <span className="font-heading text-2xl font-bold italic">{props.titulo}</span>
        {props.descripcion && <span className="text-sm text-tinta-suave">{props.descripcion}</span>}
      </legend>
      {props.children}
    </fieldset>
  );
}
