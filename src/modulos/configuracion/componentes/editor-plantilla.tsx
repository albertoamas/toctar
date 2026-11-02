"use client";

import { useActionState, useRef, useState } from "react";
import { useFocoEnError } from "@/componentes/foco-en-error";
import { useHidratado } from "@/componentes/hidratado";
import { conAviso } from "@/componentes/panel/avisos";
import { Campo } from "@/componentes/panel/campo";
import { Button } from "@/componentes/ui/button";
import { Textarea } from "@/componentes/ui/textarea";
import type { EstadoFormulario } from "@/lib/formularios";
import { mensajeDeEjemplo } from "@/modulos/ordenes/mensajes";
import { guardarPlantilla, restaurarPlantilla } from "../acciones";
import { camposDe, PLANTILLAS, unirSaltos, type ClavePlantilla } from "../plantillas";

type Props = { clave: ClavePlantilla; guardado: string; negocio: string };

// HU-40: un mensaje de WhatsApp, en su tarjeta (pedido 26). El texto, los campos que admite (tocar uno lo agrega donde
// está el cursor), cómo le llega al cliente con datos de ejemplo y, debajo, guardar o volver al original. En el celular
// va todo en una columna; en la computadora, la vista previa a la derecha, a la altura del texto. "Guardar mensaje" es
// el botón principal (rojo) solo cuando ese mensaje tiene cambios: con tres mensajes en la pantalla, nunca compiten
// tres rojos.
export function EditorPlantilla({ clave, guardado: inicial, negocio }: Props) {
  const { titulo, cuando, original } = PLANTILLAS[clave];
  const [texto, setTexto] = useState(inicial);
  const [guardado, setGuardado] = useState(inicial);
  // Lo que quedó en la base pasa al editor: el texto ya limpio, o el original al restaurar
  const alTerminar = (r: EstadoFormulario) => {
    if (r.ok && r.valores?.texto !== undefined) {
      setTexto(r.valores.texto);
      setGuardado(r.valores.texto);
    }
  };
  const [estado, guardar, guardando] = useActionState<EstadoFormulario, FormData>(conAviso(guardarPlantilla, alTerminar), {});
  const [, restaurar, restaurando] = useActionState<EstadoFormulario, FormData>(conAviso(restaurarPlantilla, alTerminar), {});
  const formulario = useRef<HTMLFormElement>(null);
  const area = useRef<HTMLTextAreaElement>(null);
  // El texto empieza con el cursor al principio: hasta que la persona lo toque, ese cursor no es "donde está el cursor"
  const conCursor = useRef(false);
  useFocoEnError(formulario, estado);
  const hidratado = useHidratado();

  const id = `mensaje-${clave}`;
  // El error es del texto que se envió (el formulario manda los saltos como \r\n): si se cambió o se restauró, ya no vale
  const error = estado.valores && unirSaltos(estado.valores.texto) === texto ? estado.errores?.texto : undefined;
  const enviando = guardando || restaurando;
  const sinGuardar = texto !== guardado;

  function agregarCampo(campo: string) {
    const el = area.current;
    if (!el) return;
    // Sin cursor todavía (no se tocó el texto), al final, separado por un espacio
    const sinCursor = !conCursor.current;
    const insertado = sinCursor && texto && !/\s$/.test(texto) ? ` {${campo}}` : `{${campo}}`;
    const [desde, hasta] = sinCursor ? [texto.length, texto.length] : [el.selectionStart, el.selectionEnd];
    conCursor.current = true;
    setTexto(texto.slice(0, desde) + insertado + texto.slice(hasta));
    // Después de que React escriba el texto nuevo, el cursor queda justo después del campo
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(desde + insertado.length, desde + insertado.length);
    });
  }

  return (
    <section aria-labelledby={`${id}-titulo`} className="tt-tarjeta-panel flex flex-col overflow-hidden">
      <div className="flex flex-col gap-1 border-b border-border px-4 py-3 sm:px-5">
        <h2 id={`${id}-titulo`} className="tt-titulo-seccion">
          {titulo}
        </h2>
        <p className="text-sm text-tinta-suave">{cuando}</p>
      </div>

      <form
        ref={formulario}
        action={guardar}
        noValidate
        className="grid grid-cols-[minmax(0,1fr)] gap-6 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:gap-x-10"
      >
        <input type="hidden" name="clave" value={clave} />
        <Campo id={id} etiqueta="Mensaje" error={error}>
          <Textarea
            ref={area}
            id={id}
            name="texto"
            rows={4}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onFocus={() => (conCursor.current = true)}
            aria-invalid={!!error}
            aria-describedby={error ? `${id}-error` : undefined}
            className="min-h-28"
          />
        </Campo>

        <div className="flex flex-col gap-3">
          <h3 className="tt-titulo-sub">Campos</h3>
          <dl className="flex flex-col gap-2">
            {camposDe(clave).map(({ campo, significa }) => (
              <div key={campo} className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <dt>
                  <button
                    type="button"
                    disabled={!hidratado}
                    onClick={() => agregarCampo(campo)}
                    aria-label={`Agregar {${campo}} al mensaje`}
                    className="tt-area-toque rounded-md border border-border bg-neutro-fondo px-2 py-0.5 text-sm font-semibold hover:border-tinta-suave focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:opacity-60"
                  >
                    {`{${campo}}`}
                  </button>
                </dt>
                <dd className="min-w-0 flex-1 basis-48 text-sm text-tinta-suave">{significa}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* En la computadora, a la derecha y desde arriba: se lee junto al texto que se escribe */}
        <figure className="flex flex-col gap-2 lg:col-start-2 lg:row-span-3 lg:row-start-1">
          <figcaption className="tt-titulo-sub">Así le llega</figcaption>
          {/* Como en un chat: la burbuja del mensaje que llega, sobre el fondo de la conversación */}
          <div className="rounded-lg bg-neutro-fondo p-4">
            <p className="max-w-[34ch] rounded-xl rounded-tl-sm bg-fondo px-3 py-2 text-sm leading-relaxed break-words whitespace-pre-wrap shadow-[var(--sombra-tarjeta)]">
              {mensajeDeEjemplo(clave, texto, negocio) || <span className="text-tinta-suave">El mensaje está vacío.</span>}
            </p>
          </div>
          <p className="text-sm text-tinta-suave">Con los datos de un cliente de ejemplo.</p>
        </figure>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <Button type="submit" variant={sinGuardar ? "default" : "outline"} disabled={enviando || !sinGuardar}>
            {guardando ? "Guardando…" : "Guardar mensaje"}
          </Button>
          <Button type="submit" variant="outline" formAction={restaurar} disabled={enviando || (texto === original && guardado === original)}>
            {restaurando ? "Volviendo…" : "Volver al texto original"}
          </Button>
          {sinGuardar && <p className="text-sm font-semibold text-aviso">Hay cambios sin guardar.</p>}
        </div>
      </form>
    </section>
  );
}
