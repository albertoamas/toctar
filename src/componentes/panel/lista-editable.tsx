import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { ChevronRightIcon, PlusIcon } from "lucide-react";
import { useFocoEnError } from "@/componentes/foco-en-error";
import { avisarResultado } from "@/componentes/panel/avisos";
import { Campo } from "@/componentes/panel/campo";
import { CancelarModal, ModalFormulario, PieModal } from "@/componentes/panel/modal-formulario";
import { Flecha, OrdenarLista } from "@/componentes/panel/ordenar-lista";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import type { EstadoFormulario } from "@/lib/formularios";
import type { Direccion } from "@/lib/orden";

// Componente de cliente: se usa dentro de otros componentes de cliente (recibe funciones como props).
// Lista editable del panel: agregar, renombrar, ordenar, desactivar y reactivar; nunca se borra (D-6).
// La usan los espacios del taller, los tamaños de vehículo, las partes del checklist (HU-05, pedido 12) y las variantes
// de un servicio (HU-19, en el catálogo).
// Pulido 13.27: como Preguntas frecuentes. La fila no lleva botones: tocarla abre su modal ("Editar espacio": el nombre,
// "Guardar espacio" y, al pie y aparte, "Desactivar"); "Agregar" abre el mismo modal vacío. Antes cada fila llevaba
// subir, bajar y un lápiz que la volvía formulario dentro de la lista. Con encabezado (una página, como Taller), el orden
// va en "Cambiar orden"; sin él (las variantes, que ya van dentro de un modal), en flechas discretas en la fila, para no
// abrir un modal sobre otro.

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
  /** Avisa si hay un modal abierto para agregar o renombrar (la sección que la contiene no se cierra mientras tanto). */
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
  // El que se edita queda guardado aparte de si el modal está abierto: el formulario sigue a la vista mientras se cierra
  const [editando, setEditando] = useState<ElementoLista | "nuevo" | null>(null);
  const [abierto, setAbierto] = useState(false);
  const { alEditar } = props;
  useEffect(() => alEditar?.(abierto), [alEditar, abierto]);
  const [pendiente, iniciar] = useTransition();
  const Titulo = props.nivel === 3 ? "h3" : "h2";
  const conEncabezado = props.conEncabezado !== false;
  const Contenedor = conEncabezado ? "section" : "div";
  const abrir = (e: ElementoLista | "nuevo") => {
    setEditando(e);
    setAbierto(true);
  };
  const moverEnFila = (e: ElementoLista, direccion: Direccion) => {
    if (pendiente) return;
    iniciar(async () => {
      const r = await acciones.mover(e.id, direccion);
      if (!r.ok) avisarResultado(r);
    });
  };
  const agregar = (
    <Button type="button" variant="outline" onClick={() => abrir("nuevo")}>
      <PlusIcon />
      Agregar {singular}
    </Button>
  );

  return (
    <Contenedor {...(conEncabezado ? { "aria-labelledby": `${id}-titulo` } : {})} className="flex flex-col gap-3">
      {conEncabezado && (
        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
          <div className="flex min-w-0 flex-col gap-1">
            <Titulo id={`${id}-titulo`} className="tt-titulo-seccion">
              {titulo}
            </Titulo>
            <p className="text-sm text-tinta-suave">{props.descripcion}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {activos.length > 1 && (
              <OrdenarLista
                elementos={activos.map((e) => ({ id: e.id, nombre: e.nombre }))}
                mover={(d) => acciones.mover(d.id, d.direccion)}
                etiqueta={`Orden: ${titulo}`}
                titulo={`Orden: ${titulo}`}
                descripcion="En este orden aparecen en el panel."
              />
            )}
            {agregar}
          </div>
        </div>
      )}

      {activos.length === 0 && <p className="text-sm font-semibold text-rojo-texto">Agrega al menos {femenino ? "una" : "un"} {singular}.</p>}

      {activos.length > 0 && (
        <ol className="tt-tarjeta-panel flex flex-col divide-y divide-border overflow-hidden" aria-label={`${titulo} activos`}>
          {activos.map((e, i) => (
            <li key={e.id} className="flex items-center">
              <button
                type="button"
                onClick={() => abrir(e)}
                aria-label={`Editar ${e.nombre}`}
                className="flex min-h-11 min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left hover:bg-superficie/60 focus-visible:-outline-offset-2"
              >
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="font-semibold">{e.nombre}</span>
                  {e.descripcion && <span className="text-sm text-tinta-suave">{e.descripcion}</span>}
                </span>
                {conEncabezado && <ChevronRightIcon className="size-5 shrink-0 text-tinta-suave" aria-hidden />}
              </button>
              {/* Sin encabezado (dentro de un modal): el orden en la fila, sin abrir otro modal encima */}
              {!conEncabezado && activos.length > 1 && (
                <span className="flex shrink-0 pr-1 text-tinta-suave">
                  <Flecha nombre={e.nombre} direccion="subir" tope={i === 0} alTocar={() => moverEnFila(e, "subir")} />
                  <Flecha nombre={e.nombre} direccion="bajar" tope={i === activos.length - 1} alTocar={() => moverEnFila(e, "bajar")} />
                </span>
              )}
            </li>
          ))}
        </ol>
      )}

      {!conEncabezado && <div>{agregar}</div>}

      {inactivos.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-tinta-suave">Desactivados</p>
          <ul className="flex flex-col divide-y divide-border rounded-sm border border-dashed border-border" aria-label={`${titulo} desactivados`}>
            {inactivos.map((e) => (
              <li key={e.id} className="flex items-center gap-3 p-3 text-tinta-suave">
                <span className="flex-1">{e.nombre}</span>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={pendiente}
                  onClick={() => iniciar(async () => avisarResultado(await acciones.cambiarEstado(e.id, true)))}
                  aria-label={`Reactivar ${e.nombre}`}
                >
                  Reactivar
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <ModalFormulario
        titulo={editando === "nuevo" ? `${femenino ? "Nueva" : "Nuevo"} ${singular}` : `Editar ${singular}`}
        abierto={abierto}
        alCambiar={setAbierto}
      >
        {/* La key: otro elemento, otro formulario (sin lo escrito en el anterior) */}
        {editando && (
          <FormularioElemento key={editando === "nuevo" ? "nuevo" : editando.id} {...props} elemento={editando === "nuevo" ? undefined : editando} alTerminar={() => setAbierto(false)} />
        )}
      </ModalFormulario>
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
    <form ref={formulario} action={accion} className="flex flex-col gap-5" noValidate>
      {Object.entries(camposOcultos).map(([nombre, valor]) => (
        <input key={nombre} type="hidden" name={nombre} value={valor} />
      ))}
      {elemento && <input type="hidden" name="id" value={elemento.id} />}
      <Campo id={`${prefijo}-nombre`} etiqueta={`Nombre ${femenino ? "de la" : "del"} ${singular}`} error={e.nombre}>
        <Input id={`${prefijo}-nombre`} name="nombre" autoComplete="off" defaultValue={v?.nombre ?? elemento?.nombre} aria-invalid={!!e.nombre} />
      </Campo>
      {campoDescripcion && (
        <Campo id={`${prefijo}-descripcion`} etiqueta={campoDescripcion.etiqueta} opcional error={e.descripcion} ayuda={campoDescripcion.ayuda}>
          <Input
            id={`${prefijo}-descripcion`}
            name="descripcion"
            autoComplete="off"
            placeholder={campoDescripcion.ejemplo}
            defaultValue={v?.descripcion ?? elemento?.descripcion ?? ""}
            aria-invalid={!!e.descripcion}
          />
        </Campo>
      )}
      <PieModal>
        <Button type="submit" disabled={enviando}>
          {enviando ? "Guardando…" : `${elemento ? "Guardar" : "Agregar"} ${singular}`}
        </Button>
        <CancelarModal />
        {/* Se usa poco y no borra nada (D-6): al pie, aparte, sin rojo; lo desactivado se reactiva debajo de la lista */}
        {elemento && (
          <Button type="button" variant="ghost" className="ml-auto" disabled={desactivando} onClick={() => desactivar(elemento)} aria-label={`Desactivar ${elemento.nombre}`}>
            Desactivar
          </Button>
        )}
      </PieModal>
    </form>
  );
}
