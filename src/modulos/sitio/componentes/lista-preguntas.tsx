"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { ArrowDownIcon, ArrowUpIcon, EyeIcon, EyeOffIcon, PencilIcon, PlusIcon, TrashIcon } from "lucide-react";
import { useFocoEnError } from "@/componentes/foco-en-error";
import { EstadoVacio } from "@/componentes/panel/estado-vacio";
import { avisarResultado } from "@/componentes/panel/avisos";
import { Campo } from "@/componentes/panel/campo";
import { Button } from "@/componentes/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/componentes/ui/dialog";
import { Input } from "@/componentes/ui/input";
import { Textarea } from "@/componentes/ui/textarea";
import type { EstadoFormulario } from "@/lib/formularios";
import { cambiarVisibilidadPregunta, eliminarPregunta, guardarPregunta, moverPregunta } from "../acciones";

// HU-08: preguntas frecuentes del sitio (RF-05). Se agregan, editan, ordenan, ocultan y eliminan.

type Pregunta = { id: number; pregunta: string; respuesta: string; visible: boolean };

export function ListaPreguntas({ preguntas }: { preguntas: Pregunta[] }) {
  const [editando, setEditando] = useState<number | "nueva" | null>(null);
  const [pendiente, iniciar] = useTransition();
  const ejecutar = (accion: () => Promise<EstadoFormulario>) => iniciar(async () => avisarResultado(await accion()));

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      {/* La acción principal arriba y en rojo, como "Agregar servicio" (pulido 4.6) */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-tinta-suave">Se abren y cierran una por una en el sitio. Sin precios.</p>
        {editando !== "nueva" && (
          <Button type="button" onClick={() => setEditando("nueva")}>
            <PlusIcon />
            Agregar pregunta
          </Button>
        )}
      </div>
      {editando === "nueva" && (
        <div className="tt-tarjeta-panel p-3">
          <FormularioPregunta alTerminar={() => setEditando(null)} />
        </div>
      )}
      {preguntas.length === 0 && <EstadoVacio>Todavía no hay preguntas. Agrega las que más te hacen los clientes.</EstadoVacio>}

      {preguntas.length > 0 && (
        <ol aria-label="Preguntas frecuentes" className="flex flex-col divide-y divide-border tt-tarjeta-panel">
          {preguntas.map((p, i) =>
            editando === p.id ? (
              <li key={p.id} className="p-3">
                <FormularioPregunta pregunta={p} alTerminar={() => setEditando(null)} />
              </li>
            ) : (
              <li key={p.id} className={`flex flex-wrap items-start justify-end gap-x-3 gap-y-1 p-3 ${p.visible ? "" : "text-tinta-suave"}`}>
                {/* Tocar el texto abre la edición, como en Servicios (pulido 4.6). Con teclado y lector de pantalla, el lápiz. */}
                <div className="group flex min-w-60 flex-1 cursor-pointer flex-col gap-1" onClick={() => setEditando(p.id)}>
                  <span className="flex flex-wrap items-center gap-2 font-semibold group-hover:underline">
                    {p.pregunta}
                    {!p.visible && <span className="tt-estado">Oculta</span>}
                  </span>
                  <span className="line-clamp-2 text-sm text-tinta-suave">{p.respuesta}</span>
                </div>
                <span className="flex shrink-0 items-center gap-0.5">
                  <Button type="button" variant="ghost" size="icon" disabled={pendiente || i === 0} aria-label={`Subir: ${p.pregunta}`} onClick={() => ejecutar(() => moverPregunta({ id: p.id, direccion: "subir" }))}>
                    <ArrowUpIcon />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" disabled={pendiente || i === preguntas.length - 1} aria-label={`Bajar: ${p.pregunta}`} onClick={() => ejecutar(() => moverPregunta({ id: p.id, direccion: "bajar" }))}>
                    <ArrowDownIcon />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" aria-label={`Editar: ${p.pregunta}`} onClick={() => setEditando(p.id)}>
                    <PencilIcon />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={pendiente}
                    aria-label={`${p.visible ? "Ocultar" : "Mostrar"}: ${p.pregunta}`}
                    onClick={() => ejecutar(() => cambiarVisibilidadPregunta({ id: p.id, visible: !p.visible }))}
                  >
                    {p.visible ? <EyeOffIcon /> : <EyeIcon />}
                  </Button>
                  <Eliminar pregunta={p} />
                </span>
              </li>
            ),
          )}
        </ol>
      )}

    </div>
  );
}

function FormularioPregunta({ pregunta, alTerminar }: { pregunta?: Pregunta; alTerminar: () => void }) {
  const [estado, accion, enviando] = useActionState<EstadoFormulario, FormData>(async (previo, datos) => {
    const r = await guardarPregunta(previo, datos);
    avisarResultado(r);
    if (r.ok) alTerminar();
    return r;
  }, {});
  const v = estado.valores;
  const e = estado.errores ?? {};
  const prefijo = `pregunta-${pregunta?.id ?? "nueva"}`;
  const formulario = useRef<HTMLFormElement>(null);
  useFocoEnError(formulario, estado);

  return (
    <form ref={formulario} action={accion} className="flex flex-col gap-4" noValidate>
      {pregunta && <input type="hidden" name="id" value={pregunta.id} />}
      <Campo id={`${prefijo}-pregunta`} etiqueta="Pregunta" error={e.pregunta}>
        <Input id={`${prefijo}-pregunta`} name="pregunta" autoFocus defaultValue={v?.pregunta ?? pregunta?.pregunta} aria-invalid={!!e.pregunta} aria-describedby={e.pregunta ? `${prefijo}-pregunta-error` : undefined} />
      </Campo>
      <Campo id={`${prefijo}-respuesta`} etiqueta="Respuesta" error={e.respuesta}>
        <Textarea id={`${prefijo}-respuesta`} name="respuesta" className="min-h-32" defaultValue={v?.respuesta ?? pregunta?.respuesta} aria-invalid={!!e.respuesta} aria-describedby={e.respuesta ? `${prefijo}-respuesta-error` : undefined} />
      </Campo>
      <div className="flex gap-2">
        <Button type="submit" disabled={enviando}>
          {enviando ? "Guardando…" : pregunta ? "Guardar" : "Agregar"}
        </Button>
        <Button type="button" variant="outline" onClick={alTerminar}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

function Eliminar({ pregunta }: { pregunta: Pregunta }) {
  const [abierto, setAbierto] = useState(false);
  const [pendiente, iniciar] = useTransition();
  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger render={<Button type="button" variant="ghost" size="icon" aria-label={`Eliminar: ${pregunta.pregunta}`} />}>
        <TrashIcon />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>¿Eliminar esta pregunta?</DialogTitle>
          <DialogDescription>«{pregunta.pregunta}» se borra del sitio y no se puede deshacer. Si solo quieres que no se vea, ocúltala.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>Cancelar</DialogClose>
          <Button
            type="button"
            variant="destructive"
            disabled={pendiente}
            onClick={() =>
              iniciar(async () => {
                const r = await eliminarPregunta(pregunta.id);
                avisarResultado(r);
                if (r.ok) setAbierto(false);
              })
            }
          >
            Eliminar pregunta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
