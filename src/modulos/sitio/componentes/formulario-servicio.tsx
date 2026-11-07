"use client";

import { useActionState, useRef, useState } from "react";
import { useFocoEnError } from "@/componentes/foco-en-error";
import { conAviso } from "@/componentes/panel/avisos";
import { SeccionFormulario } from "@/componentes/panel/seccion-formulario";
import { Campo } from "@/componentes/panel/campo";
import { EditorLista } from "@/componentes/panel/editor-lista";
import { TextoCorto } from "@/componentes/panel/texto-corto";
import { BarraGuardar } from "@/componentes/panel/cambios-sin-guardar";
import { Checkbox } from "@/componentes/ui/checkbox";
import { Input } from "@/componentes/ui/input";
import { Textarea } from "@/componentes/ui/textarea";
import { IconoBeneficio } from "@/componentes/sitio/icono-beneficio";
import { Selector } from "@/componentes/panel/selector";
import type { Beneficio, Paso } from "@/db/esquema";
import type { EstadoFormulario } from "@/lib/formularios";
import { guardarServicio } from "../acciones";
import { ICONOS_BENEFICIO, iconoDe } from "../beneficios";
import { LIMITES } from "../esquemas";

// HU-07: la página del servicio en el sitio (RF-03). Sin precios (RN-10). El nombre y las variantes son del catálogo.

type Props = {
  servicio: {
    id: number;
    slug: string;
    resumen: string;
    beneficios: Beneficio[];
    pasos: Paso[];
    visible: boolean;
    opcionesEnEscalera: boolean;
  };
  /** Tiene opciones en el catálogo: si no, "Opciones" no sale en el sitio y su casilla no hace nada (pulido 13.2). */
  conOpciones: boolean;
};

const guardarConAviso = conAviso(guardarServicio);

export function FormularioServicio({ servicio: s, conOpciones }: Props) {
  const [estado, accion, enviando] = useActionState<EstadoFormulario, FormData>(guardarConAviso, {});
  // Un ícono guardado que ya no está en la lista pasa al genérico: lo que se ve en el selector es lo que se guarda
  const [beneficios, setBeneficios] = useState<Beneficio[]>(() => s.beneficios.map((b) => ({ ...b, icono: iconoDe(b.icono) })));
  const [pasos, setPasos] = useState(s.pasos);
  const v = estado.valores;
  const e = estado.errores ?? {};
  const visible = v ? v.visible === "on" : s.visible;
  const escalera = v ? v.opcionesEnEscalera === "on" : s.opcionesEnEscalera;
  // Cada campo tiene su ayuda: debajo va el error, si lo hay, o la ayuda
  const describir = (c: string) => (e[c] ? `${c}-error` : `${c}-ayuda`);
  const formulario = useRef<HTMLFormElement>(null);
  useFocoEnError(formulario, estado);

  return (
    <form ref={formulario} action={accion} className="flex flex-col gap-6" noValidate>
      <input type="hidden" name="id" value={s.id} />

      <SeccionFormulario titulo="Datos">
        <Campo id="slug" etiqueta="Dirección de la página" error={e.slug} ayuda={`Así se ve en el navegador: …/servicios/${s.slug}. Si la cambias, los enlaces viejos dejan de funcionar.`}>
          <Input id="slug" name="slug" autoComplete="off" autoCapitalize="none" spellCheck={false} defaultValue={v?.slug ?? s.slug} aria-invalid={!!e.slug} aria-describedby={describir("slug")} />
        </Campo>
        <Campo id="resumen" etiqueta="Resumen" error={e.resumen} ayuda="Una o dos frases sobre en qué consiste. Se ve arriba en la página del servicio, en su tarjeta y en Google.">
          <Textarea id="resumen" name="resumen" rows={3} defaultValue={v?.resumen ?? s.resumen} aria-invalid={!!e.resumen} aria-describedby={describir("resumen")} />
        </Campo>
        <label className="flex cursor-pointer items-start gap-3">
          <Checkbox key={String(visible)} name="visible" defaultChecked={visible} className="mt-0.5" />
          <span className="flex flex-col">
            <span className="font-semibold">Mostrar en el sitio</span>
            <span className="text-sm text-tinta-suave">Si lo desmarcas, no aparece en el sitio, pero no se borra.</span>
          </span>
        </label>
      </SeccionFormulario>

      <SeccionFormulario titulo="Beneficios" descripcion={`Lo que gana el cliente, en pocas palabras y con un ícono. Hasta ${LIMITES.beneficios}.`}>
        <EditorLista
          nombre="beneficios"
          etiqueta="Beneficio"
          valor={beneficios}
          onChange={setBeneficios}
          nueva={() => ({ texto: "", icono: "listo" })}
          maximo={LIMITES.beneficios}
          textoAgregar="Agregar beneficio"
          errores={e}
          fila={(b, cambiar, i, marca) => (
            <>
              <TextoCorto value={b.texto} onChange={(ev) => cambiar({ ...b, texto: ev.target.value })} aria-label={`Beneficio ${i + 1}`} placeholder="Repele el agua y la suciedad" {...marca} />
              <span className="flex items-center gap-2">
                <IconoBeneficio icono={b.icono} className="size-6 shrink-0 text-rojo" />
                <Selector value={b.icono} onChange={(ev) => cambiar({ ...b, icono: ev.target.value })} aria-label={`Beneficio ${i + 1}, ícono`} {...marca}>
                  {Object.entries(ICONOS_BENEFICIO).map(([clave, nombre]) => (
                    <option key={clave} value={clave}>{nombre}</option>
                  ))}
                </Selector>
              </span>
            </>
          )}
        />
      </SeccionFormulario>

      {conOpciones ? (
        <SeccionFormulario titulo="Opciones" descripcion="Las opciones y sus precios se cargan en el catálogo; aquí, cómo se ven en el sitio.">
          <label className="flex cursor-pointer items-start gap-3">
            <Checkbox key={String(escalera)} name="opcionesEnEscalera" defaultChecked={escalera} className="mt-0.5" />
            <span className="flex flex-col">
              <span className="font-semibold">Van de menor a mayor</span>
              <span className="text-sm text-tinta-suave">Por ejemplo 1, 2, 3, 5 y 10 años: el sitio las muestra como escalones, cada una con una capa más gruesa.</span>
            </span>
          </label>
        </SeccionFormulario>
      ) : (
        <SeccionFormulario titulo="Opciones" descripcion="Sin opciones en el catálogo: esta sección no sale en el sitio.">
          {/* Se conserva lo que estaba marcado, por si después se le agregan opciones */}
          {escalera && <input type="hidden" name="opcionesEnEscalera" value="on" />}
        </SeccionFormulario>
      )}

      <SeccionFormulario titulo="Proceso paso a paso" descripcion={`Cómo se hace, en orden. Hasta ${LIMITES.pasos} pasos.`}>
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
      </SeccionFormulario>

      <BarraGuardar formulario={formulario} estado={estado} texto="Guardar cambios" enviando={enviando} />
    </form>
  );
}
