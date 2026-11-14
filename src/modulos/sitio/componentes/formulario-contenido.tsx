"use client";

import { useActionState, useRef, useState } from "react";
import { useFocoEnError } from "@/componentes/foco-en-error";
import { conAviso } from "@/componentes/panel/avisos";
import { Campo } from "@/componentes/panel/campo";
import { EditorLista } from "@/componentes/panel/editor-lista";
import { CancelarModal, PieModal, useCerrarModal } from "@/componentes/panel/modal-formulario";
import { TextoCorto } from "@/componentes/panel/texto-corto";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Textarea } from "@/componentes/ui/textarea";
import type { EstadoFormulario } from "@/lib/formularios";
import { guardarContenido, guardarSeccionContenido } from "../acciones";
import { PAGINAS, campoDeSeccion, type CampoContenido, type ContenidoPagina, type Pagina } from "../contenido";

// HU-08: textos de una página del sitio. Los campos salen del registro (src/modulos/sitio/contenido.ts).
// Pulido 13.20: va en el modal de "Editar" de su página y lo cierra al guardar; la pantalla los muestra como texto.

export function FormularioContenido({ pagina, contenido }: { pagina: Pagina; contenido: ContenidoPagina }) {
  const def = PAGINAS[pagina];
  const campos = def.campos as readonly CampoContenido[];
  const cerrar = useCerrarModal();
  const [estado, accion, enviando] = useActionState<EstadoFormulario, FormData>(
    conAviso(guardarContenido, (r) => r.ok && cerrar()),
    {},
  );
  const [listas, setListas] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(campos.filter((c) => c.tipo === "lista").map((c) => [c.clave, contenido[c.clave] as string[]])),
  );
  const v = estado.valores;
  const e = estado.errores ?? {};
  const formulario = useRef<HTMLFormElement>(null);
  useFocoEnError(formulario, estado);

  return (
    <form ref={formulario} action={accion} className="flex flex-col gap-5" noValidate aria-label={def.titulo}>
      <input type="hidden" name="pagina" value={pagina} />
      <p className="text-sm text-tinta-suave">{def.descripcion}</p>

      {campos.map((c) => {
        const id = `${pagina}-${c.clave}`;
        const describir = e[c.clave] ? `${id}-error` : c.ayuda ? `${id}-ayuda` : undefined;
        if (c.tipo === "lista") {
          return (
            <fieldset key={c.clave} className="flex flex-col gap-2">
              <legend className="mb-2 flex flex-col gap-1">
                <span className="text-sm font-semibold">{c.etiqueta}</span>
                {c.ayuda && <span className="text-sm text-tinta-suave">{c.ayuda}</span>}
              </legend>
              <EditorLista
                nombre={c.clave}
                etiqueta="Motivo"
                valor={listas[c.clave]}
                onChange={(nuevo) => setListas((l) => ({ ...l, [c.clave]: nuevo }))}
                nueva={() => ""}
                maximo={c.maxItems}
                textoAgregar={c.agregar}
                errores={e}
                fila={(texto, cambiar, i, marca) => <TextoCorto value={texto} onChange={(ev) => cambiar(ev.target.value)} aria-label={`Motivo ${i + 1}`} {...marca} />}
              />
            </fieldset>
          );
        }
        const valor = v?.[c.clave] ?? (contenido[c.clave] as string);
        return (
          <Campo key={c.clave} id={id} etiqueta={c.etiqueta} error={e[c.clave]} ayuda={c.ayuda}>
            {c.tipo === "linea" ? (
              <Input id={id} name={c.clave} defaultValue={valor} aria-invalid={!!e[c.clave]} aria-describedby={describir} />
            ) : (
              <Textarea id={id} name={c.clave} rows={c.max > 500 ? 6 : 3} defaultValue={valor} aria-invalid={!!e[c.clave]} aria-describedby={describir} />
            )}
          </Campo>
        );
      })}

      <PieModal>
        <Button type="submit" disabled={enviando}>
          {enviando ? "Guardando…" : `Guardar ${def.titulo.toLowerCase()}`}
        </Button>
        <CancelarModal />
      </PieModal>
    </form>
  );
}

/**
 * Una sección de una página que se edita por sección (la privacidad, pulido 13.60): su texto solo, con su ayuda, en el
 * modal de su "Editar". Guarda esa sección y no toca las demás (guardarSeccionContenido).
 */
export function FormularioSeccion({ pagina, clave, valor }: { pagina: Pagina; clave: string; valor: string }) {
  const campo = campoDeSeccion(pagina, clave);
  const cerrar = useCerrarModal();
  const [estado, accion, enviando] = useActionState<EstadoFormulario, FormData>(
    conAviso(guardarSeccionContenido, (r) => r.ok && cerrar()),
    {},
  );
  const formulario = useRef<HTMLFormElement>(null);
  useFocoEnError(formulario, estado);
  if (!campo) return null;
  const id = `${pagina}-${clave}`;
  const error = estado.errores?.[clave];
  return (
    <form ref={formulario} action={accion} className="flex flex-col gap-5" noValidate>
      <input type="hidden" name="pagina" value={pagina} />
      <input type="hidden" name="seccion" value={clave} />
      <Campo id={id} etiqueta={campo.etiqueta} error={error} ayuda={campo.ayuda}>
        {/* Una sola sección: el campo con lugar para leerla entera mientras se corrige */}
        <Textarea
          id={id}
          name={clave}
          rows={campo.max > 1000 ? 12 : 6}
          defaultValue={estado.valores?.[clave] ?? valor}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : campo.ayuda ? `${id}-ayuda` : undefined}
        />
      </Campo>
      <PieModal>
        <Button type="submit" disabled={enviando}>
          {enviando ? "Guardando…" : "Guardar sección"}
        </Button>
        <CancelarModal />
      </PieModal>
    </form>
  );
}

/** Los textos de una página, como se leen (en su tarjeta): la etiqueta chica arriba y el texto debajo. */
export function TextosDePagina({ pagina, contenido }: { pagina: Pagina; contenido: ContenidoPagina }) {
  const campos = PAGINAS[pagina].campos as readonly CampoContenido[];
  return (
    <dl className="flex flex-col gap-4">
      {campos.map((c) => {
        const valor = contenido[c.clave];
        return (
          <div key={c.clave} className="flex flex-col gap-1">
            <dt className="text-sm text-tinta-suave">{c.etiqueta}</dt>
            {Array.isArray(valor) ? (
              <dd>
                <ul className="flex list-disc flex-col gap-1 pl-5">
                  {valor.map((m, i) => (
                    <li key={i}>{m}</li>
                  ))}
                </ul>
              </dd>
            ) : (
              // Con sus saltos de línea, como en el sitio. Los textos largos (la historia, cómo trabajan) en cuatro líneas:
              // enteros, en su "Editar"
              <dd className={c.max > 500 ? "line-clamp-4 whitespace-pre-line" : "whitespace-pre-line"}>{valor}</dd>
            )}
          </div>
        );
      })}
    </dl>
  );
}
