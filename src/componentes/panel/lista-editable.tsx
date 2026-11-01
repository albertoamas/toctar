import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { ArrowDownIcon, ArrowUpIcon, PencilIcon, PlusIcon } from "lucide-react";
import { useFocoEnError } from "@/componentes/foco-en-error";
import { avisarResultado } from "@/componentes/panel/avisos";
import { Campo } from "@/componentes/panel/campo";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import type { EstadoFormulario } from "@/lib/formularios";
import type { Direccion } from "@/lib/orden";

// Componente de cliente: se usa dentro de otros componentes de cliente (recibe funciones como props).
// Lista editable del panel: agregar, renombrar, subir y bajar, desactivar y reactivar; nunca se borra (D-6).
// La usan los espacios del taller, los tamaños de vehículo (HU-05) y las variantes de un servicio (HU-19, en el catálogo).

export type ElementoLista = { id: number; nombre: string; descripcion: string | null; orden: number; activo: boolean };


type AccionesLista = {
  /** Agrega (sin "id") o renombra (con "id"). Recibe "nombre", "descripcion" y los campos ocultos. */
  guardar: (previo: EstadoFormulario, datos: FormData) => Promise<EstadoFormulario>;
  mover: (id: number, direccion: Direccion) => Promise<EstadoFormulario>;
  cambiarEstado: (id: number, activo: boolean) => Promise<EstadoFormulario>;
};

type Props = {
  id: string;
  titulo: string;
  /** "espacio", "tamaño", "variante": para los botones y la etiqueta del nombre. */
  singular: string;
  /** El singular es femenino ("parte"): "Agrega al menos una parte", "Nombre de la parte". */
  femenino?: boolean;
  /** Si tiene un segundo campo (por ejemplo, los modelos de ejemplo de un tamaño). */
  campoDescripcion?: { etiqueta: string; ayuda: string; ejemplo: string };
  /** Campos que viajan en cada formulario (por ejemplo, la lista o el servicio). */
  camposOcultos: Record<string, string | number>;
  elementos: ElementoLista[];
  acciones: AccionesLista;
  /** Título de nivel 2 o 3, según dónde va la lista. */
  nivel?: 2 | 3;
  /** Avisa si hay una fila abierta para agregar o renombrar (la sección que la contiene no se cierra mientras tanto). */
  alEditar?: (editando: boolean) => void;
} & (
  | { conEncabezado?: true; descripcion: string }
  /** Sin título, descripción ni región propia: ya los pone la sección que la contiene (una SeccionEditable). */
  | { conEncabezado: false; descripcion?: never }
);

export function ListaEditable(props: Props) {
  const { id, titulo, singular, femenino, elementos, acciones } = props;
  const activos = elementos.filter((e) => e.activo);
  const inactivos = elementos.filter((e) => !e.activo);
  const [editando, setEditando] = useState<number | "nuevo" | null>(null);
  const { alEditar } = props;
  useEffect(() => alEditar?.(editando !== null), [alEditar, editando]);
  const [pendiente, iniciar] = useTransition();
  const Titulo = props.nivel === 3 ? "h3" : "h2";
  const conEncabezado = props.conEncabezado !== false;
  const Contenedor = conEncabezado ? "section" : "div";

  const ejecutar = (accion: () => Promise<EstadoFormulario>) => iniciar(async () => avisarResultado(await accion()));

  return (
    <Contenedor {...(conEncabezado ? { "aria-labelledby": `${id}-titulo` } : {})} className="flex flex-col gap-4">
      {conEncabezado && (
        <div className="flex flex-col gap-1">
          <Titulo id={`${id}-titulo`} className="font-heading text-2xl font-bold italic">{titulo}</Titulo>
          <p className="text-sm text-tinta-suave">{props.descripcion}</p>
        </div>
      )}

      {activos.length === 0 && <p className="text-sm font-semibold text-rojo-texto">Agrega al menos {femenino ? "una" : "un"} {singular}.</p>}

      <ol className="flex flex-col divide-y divide-border rounded-sm border border-border" aria-label={`${titulo} activos`}>
        {activos.map((e, i) =>
          editando === e.id ? (
            <li key={e.id} className="p-3">
              <FormularioElemento {...props} elemento={e} alTerminar={() => setEditando(null)} />
            </li>
          ) : (
            // Un solo renglón: el nombre (que se parte si es largo) y ↑ ↓ ✎. "Desactivar" va dentro de la edición: se usa poco y
            // con él en la fila, el nombre no cabía al lado y cada fila ocupaba dos renglones (pulido 6.2)
            <li key={e.id} className="flex items-center gap-3 p-3">
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="font-semibold">{e.nombre}</span>
                {e.descripcion && <span className="text-sm text-tinta-suave">{e.descripcion}</span>}
              </span>
              <span className="flex shrink-0 items-center gap-0.5">
                <Button type="button" variant="ghost" size="icon" disabled={pendiente || i === 0} aria-label={`Subir ${e.nombre}`} onClick={() => ejecutar(() => acciones.mover(e.id, "subir"))}>
                  <ArrowUpIcon />
                </Button>
                <Button type="button" variant="ghost" size="icon" disabled={pendiente || i === activos.length - 1} aria-label={`Bajar ${e.nombre}`} onClick={() => ejecutar(() => acciones.mover(e.id, "bajar"))}>
                  <ArrowDownIcon />
                </Button>
                <Button type="button" variant="ghost" size="icon" aria-label={`Editar ${e.nombre}`} onClick={() => setEditando(e.id)}>
                  <PencilIcon />
                </Button>
              </span>
            </li>
          ),
        )}
      </ol>

      {editando === "nuevo" ? (
        <div className="rounded-sm border border-border p-3">
          <FormularioElemento {...props} alTerminar={() => setEditando(null)} />
        </div>
      ) : (
        <div>
          <Button type="button" variant="outline" onClick={() => setEditando("nuevo")}>
            <PlusIcon />
            Agregar {singular}
          </Button>
        </div>
      )}

      {inactivos.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-tinta-suave">Desactivados</p>
          <ul className="flex flex-col divide-y divide-border rounded-sm border border-dashed border-border" aria-label={`${titulo} desactivados`}>
            {inactivos.map((e) => (
              <li key={e.id} className="flex items-center gap-3 p-3 text-tinta-suave">
                <span className="flex-1">{e.nombre}</span>
                <Button type="button" variant="ghost" disabled={pendiente} onClick={() => ejecutar(() => acciones.cambiarEstado(e.id, true))} aria-label={`Reactivar ${e.nombre}`}>
                  Reactivar
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Contenedor>
  );
}

function FormularioElemento(props: Props & { elemento?: ElementoLista; alTerminar: () => void }) {
  const { id, singular, femenino, campoDescripcion, camposOcultos, elemento, alTerminar } = props;
  const [estado, accion, enviando] = useActionState<EstadoFormulario, FormData>(async (previo, datos) => {
    const r = await props.acciones.guardar(previo, datos);
    avisarResultado(r);
    if (r.ok) alTerminar();
    return r;
  }, {});
  const v = estado.valores;
  const e = estado.errores ?? {};
  const prefijo = `${id}-${elemento?.id ?? "nuevo"}`;
  const formulario = useRef<HTMLFormElement>(null);
  useFocoEnError(formulario, estado);
  const [desactivando, iniciar] = useTransition();
  const desactivar = (el: ElementoLista) =>
    iniciar(async () => {
      const r = await props.acciones.cambiarEstado(el.id, false);
      avisarResultado(r);
      if (r.ok) alTerminar();
    });

  return (
    <form ref={formulario} action={accion} className="flex flex-col gap-4" noValidate>
      {Object.entries(camposOcultos).map(([nombre, valor]) => (
        <input key={nombre} type="hidden" name={nombre} value={valor} />
      ))}
      {elemento && <input type="hidden" name="id" value={elemento.id} />}
      <Campo id={`${prefijo}-nombre`} etiqueta={`Nombre ${femenino ? "de la" : "del"} ${singular}`} error={e.nombre}>
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
      {campoDescripcion && (
        <Campo id={`${prefijo}-descripcion`} etiqueta={campoDescripcion.etiqueta} error={e.descripcion} ayuda={campoDescripcion.ayuda}>
          <Input
            id={`${prefijo}-descripcion`}
            name="descripcion"
            autoComplete="off"
            placeholder={campoDescripcion.ejemplo}
            defaultValue={v?.descripcion ?? elemento?.descripcion ?? ""}
            aria-describedby={e.descripcion ? `${prefijo}-descripcion-error` : `${prefijo}-descripcion-ayuda`}
          />
        </Campo>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={enviando}>
          {enviando ? "Guardando…" : elemento ? "Guardar" : "Agregar"}
        </Button>
        <Button type="button" variant="outline" onClick={alTerminar}>
          Cancelar
        </Button>
        {elemento && (
          <Button type="button" variant="outline" className="ml-auto" disabled={desactivando} onClick={() => desactivar(elemento)} aria-label={`Desactivar ${elemento.nombre}`}>
            Desactivar
          </Button>
        )}
      </div>
    </form>
  );
}
