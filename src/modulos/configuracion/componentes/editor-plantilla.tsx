"use client";

import { useActionState, useRef, useState } from "react";
import { PreguntarAlSalir } from "@/componentes/panel/cambios-sin-guardar";
import { useFocoEnError } from "@/componentes/foco-en-error";
import { useHidratado } from "@/componentes/hidratado";
import { conAviso } from "@/componentes/panel/avisos";
import { CancelarModal, PieModal, useCerrarModal } from "@/componentes/panel/modal-formulario";
import { Campo } from "@/componentes/panel/campo";
import { Button } from "@/componentes/ui/button";
import { Textarea } from "@/componentes/ui/textarea";
import type { EstadoFormulario } from "@/lib/formularios";
import { mensajeDeEjemplo } from "@/modulos/ordenes/mensajes";
import { guardarPlantilla, restaurarPlantilla } from "../acciones";
import { camposDe, PLANTILLAS, unirSaltos, type ClavePlantilla } from "../plantillas";
import { BurbujaMensaje } from "./burbuja-mensaje";

type Props = { clave: ClavePlantilla; guardado: string; negocio: string };

// HU-40: un mensaje de WhatsApp. El texto, los campos que admite (tocar uno lo agrega donde está el cursor), cómo le
// llega al cliente con datos de ejemplo y, al pie, guardar o volver al original. Pulido 13.28: va en el modal de "Editar"
// de su mensaje (la ficha lo muestra como le llega); antes eran tres editores abiertos uno debajo de otro. Guardar cierra
// el modal; volver al original lo deja abierto, con el original a la vista.
export function EditorPlantilla({ clave, guardado: inicial, negocio }: Props) {
  const { original } = PLANTILLAS[clave];
  const cerrar = useCerrarModal();
  const [texto, setTexto] = useState(inicial);
  const [guardado, setGuardado] = useState(inicial);
  // Lo que quedó en la base pasa al editor: el texto ya limpio, o el original al restaurar
  const alTerminar = (r: EstadoFormulario) => {
    if (r.ok && r.valores?.texto !== undefined) {
      setTexto(r.valores.texto);
      setGuardado(r.valores.texto);
    }
  };
  const [estado, guardar, guardando] = useActionState<EstadoFormulario, FormData>(
    conAviso(guardarPlantilla, (r) => {
      alTerminar(r);
      if (r.ok) cerrar();
    }),
    {},
  );
  const [, restaurar, restaurando] = useActionState<EstadoFormulario, FormData>(conAviso(restaurarPlantilla, alTerminar), {});
  const formulario = useRef<HTMLFormElement>(null);
  const area = useRef<HTMLTextAreaElement>(null);
  // El texto empieza con el cursor al principio: hasta que la persona lo toque, ese cursor no es "donde está el cursor".
  // No cuenta el foco: el modal lo pone en el texto al abrirse, sin que la persona haya elegido un lugar
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
    <>
      <PreguntarAlSalir hay={sinGuardar} />
      <form ref={formulario} action={guardar} noValidate className="flex flex-col gap-5">
        <input type="hidden" name="clave" value={clave} />
        <Campo id={id} etiqueta="Mensaje" error={error}>
          <Textarea
            ref={area}
            id={id}
            name="texto"
            rows={4}
            value={texto}
            onChange={(e) => {
              conCursor.current = true;
              setTexto(e.target.value);
            }}
            onPointerUp={() => (conCursor.current = true)}
            onKeyUp={() => (conCursor.current = true)}
            aria-invalid={!!error}
            className="min-h-28"
          />
        </Campo>

        <div className="flex flex-col gap-2">
          <h3 className="tt-titulo-sub">Campos</h3>
          <p className="text-sm text-tinta-suave">Cada campo entre llaves se cambia por el dato de ese cliente. Tócalo para agregarlo donde está el cursor.</p>
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

        <figure className="flex flex-col gap-2">
          <figcaption className="tt-titulo-sub">Así le llega</figcaption>
          <BurbujaMensaje texto={mensajeDeEjemplo(clave, texto, negocio)} />
          <p className="text-sm text-tinta-suave">Con los datos de un cliente de ejemplo.</p>
        </figure>

        {sinGuardar && <p className="text-sm font-semibold text-aviso">Hay cambios sin guardar.</p>}
        <PieModal>
          <Button type="submit" disabled={enviando || !sinGuardar}>
            {guardando ? "Guardando…" : "Guardar mensaje"}
          </Button>
          <CancelarModal />
          <Button type="submit" variant="ghost" className="ml-auto" formAction={restaurar} disabled={enviando || (texto === original && guardado === original)}>
            {restaurando ? "Volviendo…" : "Volver al texto original"}
          </Button>
        </PieModal>
      </form>
    </>
  );
}
