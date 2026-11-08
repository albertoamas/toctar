"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { ChevronRightIcon, PlusIcon, TrashIcon } from "lucide-react";
import { useFocoEnError } from "@/componentes/foco-en-error";
import { useHidratado } from "@/componentes/hidratado";
import { avisarResultado } from "@/componentes/panel/avisos";
import { Campo } from "@/componentes/panel/campo";
import { EstadoVacio } from "@/componentes/panel/estado-vacio";
import { Insignia } from "@/componentes/panel/insignia";
import { CancelarModal, ModalFormulario, PieModal, useCerrarModal } from "@/componentes/panel/modal-formulario";
import { OrdenarLista } from "@/componentes/panel/ordenar-lista";
import { Button } from "@/componentes/ui/button";
import { Checkbox } from "@/componentes/ui/checkbox";
import { Input } from "@/componentes/ui/input";
import { Textarea } from "@/componentes/ui/textarea";
import type { EstadoFormulario } from "@/lib/formularios";
import { cambiarVisibilidadPregunta, eliminarPregunta, guardarPregunta, moverPregunta } from "../acciones";

// HU-08: preguntas frecuentes del sitio (RF-05). Se agregan, editan, ordenan, ocultan y eliminan.
// Pulido 13.24: como la lista de servicios. Antes cada fila llevaba cinco botones de solo ícono (25 con cinco preguntas)
// y se editaba dentro de la lista, con dos botones rojos a la vez. Ahora la fila no lleva botones: tocarla abre su modal
// (pregunta, respuesta, si se muestra, y eliminar al pie); el orden va en "Cambiar orden" y agregar, arriba.

type Pregunta = { id: number; pregunta: string; respuesta: string; visible: boolean };

/** Lo de arriba de la pantalla: cambiar el orden y agregar una (la acción principal). */
export function AccionesPreguntas({ preguntas }: { preguntas: Pregunta[] }) {
  const hidratado = useHidratado();
  const [agregando, setAgregando] = useState(false);
  return (
    <div className="flex flex-wrap gap-2">
      {preguntas.length > 1 && (
        <OrdenarLista elementos={preguntas.map((p) => ({ id: p.id, nombre: p.pregunta }))} mover={moverPregunta} etiqueta="Orden de las preguntas" />
      )}
      <Button type="button" disabled={!hidratado} onClick={() => setAgregando(true)}>
        <PlusIcon />
        Agregar pregunta
      </Button>
      <ModalFormulario titulo="Nueva pregunta" abierto={agregando} alCambiar={setAgregando}>
        <FormularioPregunta />
      </ModalFormulario>
    </div>
  );
}

export function ListaPreguntas({ preguntas }: { preguntas: Pregunta[] }) {
  const [editando, setEditando] = useState<Pregunta | null>(null);

  if (preguntas.length === 0) return <EstadoVacio>Todavía no hay preguntas. Agrega las que más te hacen los clientes.</EstadoVacio>;

  return (
    <>
      <ul aria-label="Preguntas frecuentes" className="tt-tarjeta-panel flex flex-col divide-y divide-border overflow-hidden">
        {preguntas.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => setEditando(p)}
              aria-label={`Editar: ${p.pregunta}`}
              className="flex min-h-11 w-full items-center gap-3 px-4 py-3 text-left hover:bg-superficie/60 focus-visible:-outline-offset-2"
            >
              <span className={`flex min-w-0 flex-1 flex-col gap-1 ${p.visible ? "" : "text-tinta-suave"}`}>
                <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="font-semibold">{p.pregunta}</span>
                  {!p.visible && <Insignia>Oculta</Insignia>}
                </span>
                <span className="line-clamp-2 text-sm text-tinta-suave">{p.respuesta}</span>
              </span>
              <ChevronRightIcon className="size-5 shrink-0 text-tinta-suave" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
      <ModalFormulario titulo="Editar pregunta" abierto={editando !== null} alCambiar={(abrir) => !abrir && setEditando(null)}>
        {/* La key: otra pregunta, otro formulario (sin lo escrito en la anterior) */}
        {editando && <FormularioPregunta key={editando.id} pregunta={editando} alEliminar={() => setEditando(null)} />}
      </ModalFormulario>
    </>
  );
}

/** Para una nueva, sin `pregunta`. Al editar, también si se muestra en el sitio y, al pie, eliminarla. */
function FormularioPregunta({ pregunta, alEliminar }: { pregunta?: Pregunta; alEliminar?: () => void }) {
  const cerrar = useCerrarModal();
  // Si se muestra va por su propia acción: se guarda después del texto, solo si cambió
  const [visible, setVisible] = useState(pregunta?.visible ?? true);
  const [estado, accion, enviando] = useActionState<EstadoFormulario, FormData>(async (previo, datos) => {
    let r = await guardarPregunta(previo, datos);
    if (r.ok && pregunta && visible !== pregunta.visible) {
      const v = await cambiarVisibilidadPregunta({ id: pregunta.id, visible });
      if (!v.ok) r = v;
    }
    avisarResultado(r);
    if (r.ok) cerrar();
    return r;
  }, {});
  const v = estado.valores;
  const e = estado.errores ?? {};
  const prefijo = `pregunta-${pregunta?.id ?? "nueva"}`;
  const formulario = useRef<HTMLFormElement>(null);
  useFocoEnError(formulario, estado);

  return (
    <form ref={formulario} action={accion} className="flex flex-col gap-5" noValidate>
      {pregunta && <input type="hidden" name="id" value={pregunta.id} />}
      <Campo id={`${prefijo}-pregunta`} etiqueta="Pregunta" error={e.pregunta}>
        <Input
          id={`${prefijo}-pregunta`}
          name="pregunta"
          defaultValue={v?.pregunta ?? pregunta?.pregunta}
          aria-invalid={!!e.pregunta}
          aria-describedby={e.pregunta ? `${prefijo}-pregunta-error` : undefined}
        />
      </Campo>
      <Campo id={`${prefijo}-respuesta`} etiqueta="Respuesta" error={e.respuesta} ayuda="Sin precios: los da la cotización.">
        <Textarea
          id={`${prefijo}-respuesta`}
          name="respuesta"
          className="min-h-32"
          defaultValue={v?.respuesta ?? pregunta?.respuesta}
          aria-invalid={!!e.respuesta}
          aria-describedby={e.respuesta ? `${prefijo}-respuesta-error` : `${prefijo}-respuesta-ayuda`}
        />
      </Campo>
      {pregunta && (
        <label className="flex cursor-pointer items-start gap-3">
          <Checkbox checked={visible} onCheckedChange={(si) => setVisible(si === true)} className="mt-0.5" />
          <span className="flex flex-col">
            <span className="font-semibold">Mostrar en el sitio</span>
            <span className="text-sm text-tinta-suave">Si la desmarcas, no se ve en el sitio, pero no se borra.</span>
          </span>
        </label>
      )}
      <PieModal>
        <Button type="submit" disabled={enviando}>
          {enviando ? "Guardando…" : pregunta ? "Guardar pregunta" : "Agregar pregunta"}
        </Button>
        <CancelarModal />
        {pregunta && alEliminar && <EliminarPregunta pregunta={pregunta} alEliminar={alEliminar} />}
      </PieModal>
    </form>
  );
}

/** Al pie del modal de edición, aparte: no se deshace, así que pide confirmación (con el foco en "Cancelar"). */
function EliminarPregunta({ pregunta, alEliminar }: { pregunta: Pregunta; alEliminar: () => void }) {
  const [abierto, setAbierto] = useState(false);
  const [pendiente, iniciar] = useTransition();
  return (
    <>
      <Button type="button" variant="ghost" className="ml-auto text-rojo-texto" onClick={() => setAbierto(true)}>
        <TrashIcon />
        Eliminar
      </Button>
      <ModalFormulario titulo="¿Eliminar esta pregunta?" abierto={abierto} alCambiar={setAbierto}>
        <p>«{pregunta.pregunta}» se borra del sitio y no se puede deshacer. Si solo quieres que no se vea, desmarca «Mostrar en el sitio».</p>
        <PieModal>
          <Button
            type="button"
            variant="destructive"
            disabled={pendiente}
            onClick={() =>
              iniciar(async () => {
                const r = await eliminarPregunta(pregunta.id);
                avisarResultado(r);
                if (r.ok) {
                  setAbierto(false);
                  alEliminar();
                }
              })
            }
          >
            Eliminar pregunta
          </Button>
          <CancelarModal focoInicial />
        </PieModal>
      </ModalFormulario>
    </>
  );
}
