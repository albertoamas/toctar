"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { EyeOffIcon, PencilIcon } from "lucide-react";
import { useFocoEnError } from "@/componentes/foco-en-error";
import { avisarResultado } from "@/componentes/panel/avisos";
import { Campo } from "@/componentes/panel/campo";
import { Selector } from "@/componentes/panel/selector";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import type { EstadoFormulario } from "@/lib/formularios";
import { nombreDelTrabajo } from "../galeria";
import { cambiarVisibilidadGaleria, eliminarGaleriaItem, guardarGaleriaItem, moverGaleriaItem } from "../acciones";
import { Insignia } from "@/componentes/panel/insignia";
import { MenuMas, type AccionMas } from "@/componentes/panel/menu-mas";
import { CancelarModal, ModalFormulario, PieModal, useCerrarModal } from "@/componentes/panel/modal-formulario";
import { ItemGaleria, Miniatura, Servicio } from "./galeria-comun";

// Galería (HU-09): la tarjeta de cada trabajo, con editar, ordenar, ocultar y eliminar.

export function Tarjeta({
  item,
  servicios,
  primero,
  ultimo,
  ordenable,
  enPortada,
  numero,
  alAbrir,
}: {
  item: ItemGaleria;
  servicios: Servicio[];
  primero: boolean;
  ultimo: boolean;
  ordenable: boolean;
  enPortada: boolean;
  numero: number;
  alAbrir: () => void;
}) {
  const nombre = nombreDelTrabajo(item.descripcion, item.servicio, numero);
  const [editando, setEditando] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [pendiente, iniciar] = useTransition();
  const ejecutar = (accion: () => Promise<EstadoFormulario>) => iniciar(async () => avisarResultado(await accion()));
  // Lo que se usa poco, en "Más" (skill pantallas-panel, §3): ordenar, ocultar y eliminar (pulido 13.17)
  const acciones: AccionMas[] = [
    ...(ordenable && !primero ? [{ texto: "Mover antes", alElegir: () => ejecutar(() => moverGaleriaItem({ id: item.id, direccion: "subir" })) }] : []),
    ...(ordenable && !ultimo ? [{ texto: "Mover después", alElegir: () => ejecutar(() => moverGaleriaItem({ id: item.id, direccion: "bajar" })) }] : []),
    {
      texto: item.visible ? "Ocultar del sitio" : "Mostrar en el sitio",
      alElegir: () => ejecutar(() => cambiarVisibilidadGaleria({ id: item.id, visible: !item.visible })),
    },
    { texto: "Eliminar foto", alElegir: () => setEliminando(true) },
  ];

  return (
    <li className={`flex flex-col overflow-hidden tt-tarjeta-panel ${item.visible ? "" : "opacity-70"}`}>
      {/* Mismo recuadro (2:1) con par o con foto sola: las tarjetas quedan parejas. La sola se recorta solo aquí. Se toca
          para verla en grande */}
      <span className="relative">
        <button
          type="button"
          onClick={alAbrir}
          aria-label={`Ver en grande: ${nombre}`}
          className={`grid aspect-[2/1] w-full cursor-zoom-in focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--foco)] ${item.antes ? "grid-cols-2 gap-px" : ""}`}
        >
          {item.antes && <Miniatura foto={item.antes} alt={`Antes: ${nombre}`} etiqueta="Antes" />}
          <Miniatura foto={item.despues} alt={item.antes ? `Después: ${nombre}` : nombre} etiqueta={item.antes ? "Después" : undefined} />
        </button>
        {/* Lo que no se ve en el sitio, sobre la foto: se nota de un vistazo */}
        {!item.visible && (
          <span className="pointer-events-none absolute top-1.5 right-1.5 flex items-center gap-1 rounded-sm bg-negro/80 px-1.5 py-0.5 text-xs font-semibold text-blanco">
            <EyeOffIcon className="size-3.5" aria-hidden />
            Oculta
          </span>
        )}
      </span>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <span className="flex flex-wrap items-center gap-1 text-xs font-semibold text-tinta-suave">
          {item.servicio}
          {enPortada && <Insignia tono="exito">En la portada</Insignia>}
        </span>
        <span className="line-clamp-2 text-sm">{item.descripcion || <span className="text-tinta-suave">Sin descripción (n.º {numero})</span>}</span>
        <span className="mt-auto flex flex-wrap items-center gap-2 pt-1">
          <Button type="button" variant="outline" aria-label={`Editar: ${nombre}`} onClick={() => setEditando(true)}>
            <PencilIcon />
            Editar
          </Button>
          <MenuMas acciones={acciones} deshabilitado={pendiente} etiqueta={`Más: ${nombre}`} />
        </span>
      </div>
      <ModalFormulario titulo="Editar trabajo" abierto={editando} alCambiar={setEditando}>
        <EditarItem item={item} servicios={servicios} />
      </ModalFormulario>
      <ModalFormulario titulo="¿Eliminar esta foto?" abierto={eliminando} alCambiar={setEliminando}>
        <EliminarItem itemId={item.id} />
      </ModalFormulario>
    </li>
  );
}

function EditarItem({ item, servicios }: { item: ItemGaleria; servicios: Servicio[] }) {
  const cerrar = useCerrarModal();
  const [estado, accion, enviando] = useActionState<EstadoFormulario, FormData>(async (previo, datos) => {
    const r = await guardarGaleriaItem(previo, datos);
    avisarResultado(r);
    if (r.ok) cerrar();
    return r;
  }, {});
  const e = estado.errores ?? {};
  const prefijo = `galeria-${item.id}`;
  const formulario = useRef<HTMLFormElement>(null);
  useFocoEnError(formulario, estado);
  return (
    <form ref={formulario} action={accion} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="id" value={item.id} />
      <Campo id={`${prefijo}-servicio`} etiqueta="Servicio" error={e.servicioId}>
        {/* La key: React reinicia el formulario tras la acción y un <select> volvería al servicio con el que se montó */}
        <Selector
          key={estado.valores?.servicioId ?? item.servicioId}
          id={`${prefijo}-servicio`}
          name="servicioId"
          defaultValue={estado.valores?.servicioId ?? item.servicioId}
          aria-invalid={!!e.servicioId}
          aria-describedby={e.servicioId ? `${prefijo}-servicio-error` : undefined}
        >
          {servicios.map((s) => (
            <option key={s.id} value={s.id}>{s.nombre}</option>
          ))}
        </Selector>
      </Campo>
      <Campo id={`${prefijo}-descripcion`} etiqueta="Descripción" opcional error={e.descripcion} ayuda='La leen Google y los lectores de pantalla, y se ve debajo de la foto si va en la portada.'>
        <Input
          id={`${prefijo}-descripcion`}
          name="descripcion"
          autoComplete="off"
          defaultValue={estado.valores?.descripcion ?? item.descripcion}
          aria-invalid={!!e.descripcion}
          aria-describedby={e.descripcion ? `${prefijo}-descripcion-error` : `${prefijo}-descripcion-ayuda`}
        />
      </Campo>
      <PieModal>
        <Button type="submit" disabled={enviando}>{enviando ? "Guardando…" : "Guardar trabajo"}</Button>
        <CancelarModal />
      </PieModal>
    </form>
  );
}

function EliminarItem({ itemId }: { itemId: number }) {
  const cerrar = useCerrarModal();
  const [pendiente, iniciar] = useTransition();
  return (
    <>
      <p>No se puede deshacer. Si solo quieres que no se vea en el sitio, ocúltala.</p>
      <PieModal>
        <Button
          type="button"
          variant="destructive"
          disabled={pendiente}
          onClick={() =>
            iniciar(async () => {
              const r = await eliminarGaleriaItem(itemId);
              avisarResultado(r);
              if (r.ok) cerrar();
            })
          }
        >
          {pendiente ? "Eliminando…" : "Eliminar foto"}
        </Button>
        <CancelarModal focoInicial />
      </PieModal>
    </>
  );
}
