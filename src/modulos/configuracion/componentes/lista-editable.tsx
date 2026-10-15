"use client";

import { useActionState, useState, useTransition } from "react";
import { ArrowDownIcon, ArrowUpIcon, PencilIcon, PlusIcon } from "lucide-react";
import { toast } from "sonner";
import { Campo } from "@/componentes/panel/campo";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { cambiarEstadoElemento, guardarElemento, moverElemento } from "../acciones";
import type { EstadoFormulario } from "../esquemas";
import { LISTAS, type Elemento, type Lista } from "../listas";

// HU-05: lista editable de la pestaña Taller (espacios del taller o tamaños de vehículo).
// Se agrega, se renombra, se ordena y se desactiva; nunca se borra (D-6).

function avisar(r: EstadoFormulario) {
  if (r.ok && r.mensaje) toast.success(r.mensaje);
  else if (r.mensaje) toast.error(r.mensaje);
}

export function ListaEditable({ lista, elementos, descripcion }: { lista: Lista; elementos: Elemento[]; descripcion: string }) {
  const def = LISTAS[lista];
  const activos = elementos.filter((e) => e.activo);
  const inactivos = elementos.filter((e) => !e.activo);
  const [editando, setEditando] = useState<number | "nuevo" | null>(null);
  const [pendiente, iniciar] = useTransition();

  const ejecutar = (accion: () => Promise<EstadoFormulario>) => iniciar(async () => avisar(await accion()));

  return (
    <section aria-labelledby={`${lista}-titulo`} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 id={`${lista}-titulo`} className="font-heading text-2xl font-bold italic">{def.titulo}</h2>
        <p className="text-sm text-tinta-suave">{descripcion}</p>
      </div>

      {activos.length === 0 && <p className="text-sm font-semibold text-rojo-texto">Agrega al menos un {def.singular}.</p>}

      <ol className="flex flex-col divide-y divide-border rounded-sm border border-border" aria-label={`${def.titulo} activos`}>
        {activos.map((e, i) =>
          editando === e.id ? (
            <li key={e.id} className="p-3">
              <FormularioElemento lista={lista} elemento={e} alTerminar={() => setEditando(null)} />
            </li>
          ) : (
            <li key={e.id} className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1 p-3">
              <span className="flex min-w-48 flex-1 flex-col">
                <span className="font-semibold">{e.nombre}</span>
                {e.descripcion && <span className="text-sm text-tinta-suave">{e.descripcion}</span>}
              </span>
              <span className="flex shrink-0 items-center gap-0.5">
                <Button type="button" variant="ghost" size="icon" disabled={pendiente || i === 0} aria-label={`Subir ${e.nombre}`} onClick={() => ejecutar(() => moverElemento({ lista, id: e.id, direccion: "subir" }))}>
                  <ArrowUpIcon />
                </Button>
                <Button type="button" variant="ghost" size="icon" disabled={pendiente || i === activos.length - 1} aria-label={`Bajar ${e.nombre}`} onClick={() => ejecutar(() => moverElemento({ lista, id: e.id, direccion: "bajar" }))}>
                  <ArrowDownIcon />
                </Button>
                <Button type="button" variant="ghost" size="icon" aria-label={`Editar ${e.nombre}`} onClick={() => setEditando(e.id)}>
                  <PencilIcon />
                </Button>
                <Button type="button" variant="ghost" size="sm" disabled={pendiente} onClick={() => ejecutar(() => cambiarEstadoElemento({ lista, id: e.id, activo: false }))} aria-label={`Desactivar ${e.nombre}`}>
                  Desactivar
                </Button>
              </span>
            </li>
          ),
        )}
      </ol>

      {editando === "nuevo" ? (
        <div className="rounded-sm border border-border p-3">
          <FormularioElemento lista={lista} alTerminar={() => setEditando(null)} />
        </div>
      ) : (
        <div>
          <Button type="button" variant="outline" onClick={() => setEditando("nuevo")}>
            <PlusIcon />
            Agregar {def.singular}
          </Button>
        </div>
      )}

      {inactivos.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-tinta-suave">Desactivados</h3>
          <ul className="flex flex-col divide-y divide-border rounded-sm border border-dashed border-border" aria-label={`${def.titulo} desactivados`}>
            {inactivos.map((e) => (
              <li key={e.id} className="flex items-center gap-3 p-3 text-tinta-suave">
                <span className="flex-1">{e.nombre}</span>
                <Button type="button" variant="ghost" size="sm" disabled={pendiente} onClick={() => ejecutar(() => cambiarEstadoElemento({ lista, id: e.id, activo: true }))} aria-label={`Reactivar ${e.nombre}`}>
                  Reactivar
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function FormularioElemento({ lista, elemento, alTerminar }: { lista: Lista; elemento?: Elemento; alTerminar: () => void }) {
  const def = LISTAS[lista];
  const [estado, accion, enviando] = useActionState<EstadoFormulario, FormData>(async (previo, datos) => {
    const r = await guardarElemento(previo, datos);
    avisar(r);
    if (r.ok) alTerminar();
    return r;
  }, {});
  const v = estado.valores;
  const e = estado.errores ?? {};
  const prefijo = `${lista}-${elemento?.id ?? "nuevo"}`;

  return (
    <form action={accion} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="lista" value={lista} />
      {elemento && <input type="hidden" name="id" value={elemento.id} />}
      <Campo id={`${prefijo}-nombre`} etiqueta={`Nombre del ${def.singular}`} error={e.nombre}>
        <Input
          id={`${prefijo}-nombre`}
          name="nombre"
          autoFocus
          autoComplete="off"
          defaultValue={v?.nombre ?? elemento?.nombre}
          aria-invalid={!!e.nombre}
          aria-describedby={e.nombre ? `${prefijo}-nombre-error` : undefined}
        />
      </Campo>
      {def.conDescripcion && (
        <Campo id={`${prefijo}-descripcion`} etiqueta="Modelos de ejemplo" error={e.descripcion} ayuda="Ayuda a elegir el tamaño al cotizar.">
          <Input
            id={`${prefijo}-descripcion`}
            name="descripcion"
            autoComplete="off"
            placeholder="Corolla, Sentra, Honda Civic"
            defaultValue={v?.descripcion ?? elemento?.descripcion ?? ""}
            aria-describedby={e.descripcion ? `${prefijo}-descripcion-error` : `${prefijo}-descripcion-ayuda`}
          />
        </Campo>
      )}
      <div className="flex gap-2">
        <Button type="submit" disabled={enviando}>
          {enviando ? "Guardando…" : elemento ? "Guardar" : "Agregar"}
        </Button>
        <Button type="button" variant="ghost" onClick={alTerminar}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
