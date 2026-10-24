"use client";

import Image from "next/image";
import { useActionState, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { ArrowDownIcon, ArrowUpIcon, CameraIcon, EyeIcon, EyeOffIcon, HouseIcon, PencilIcon, TrashIcon, UploadIcon, XIcon } from "lucide-react";
import { useFocoEnError } from "@/componentes/foco-en-error";
import { EstadoVacio } from "@/componentes/panel/estado-vacio";
import { avisarResultado } from "@/componentes/panel/avisos";
import { Campo, MensajeError } from "@/componentes/panel/campo";
import { Selector } from "@/componentes/panel/selector";
import { achicarFoto } from "@/componentes/panel/subida-foto";
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
import type { EstadoFormulario } from "@/lib/formularios";
import { cambiarVisibilidadGaleria, elegirParaPortada, eliminarGaleriaItem, guardarGaleriaItem, moverGaleriaItem, subirGaleria } from "../acciones";

// HU-09: galería de antes y después (RF-12). Se sube un par o una foto sola, asociada a un servicio,
// y se ordena, oculta, edita o elimina. Las fotos se achican en el celular antes de subir.
// Un trabajo con antes se elige para el comparador de la portada (pedido de la demo del 24/10).

type Foto = { miniatura: string; ancho: number | null; alto: number | null };
export type ItemGaleria = { id: number; servicioId: number; servicio: string; descripcion: string; visible: boolean; antes: Foto | null; despues: Foto };
type Servicio = { id: number; nombre: string };

export function GaleriaPanel({ items, servicios, portadaId }: { items: ItemGaleria[]; servicios: Servicio[]; portadaId: number | null }) {
  const [filtro, setFiltro] = useState("");
  const [subiendo, setSubiendo] = useState(false);
  const visibles = filtro ? items.filter((i) => String(i.servicioId) === filtro) : items;

  return (
    <div className="flex flex-col gap-6">
      {subiendo ? (
        <SubirFotos servicios={servicios} alTerminar={() => setSubiendo(false)} />
      ) : (
        <div className="flex flex-wrap items-end justify-between gap-4">
          <Button type="button" onClick={() => setSubiendo(true)}>
            <UploadIcon />
            Subir fotos
          </Button>
          {items.length > 0 && (
            <div className="flex w-full max-w-xs flex-col gap-1 sm:w-auto">
              <label htmlFor="filtro-servicio" className="text-sm font-semibold">Ver fotos de</label>
              <Selector id="filtro-servicio" value={filtro} onChange={(e) => setFiltro(e.target.value)}>
                <option value="">Todos los servicios</option>
                {servicios.map((s) => (
                  <option key={s.id} value={s.id}>{s.nombre}</option>
                ))}
              </Selector>
            </div>
          )}
        </div>
      )}

      {items.length === 0 && !subiendo && <EstadoVacio>Todavía no hay fotos. Sube la primera de un trabajo terminado.</EstadoVacio>}
      {items.length > 0 && visibles.length === 0 && <EstadoVacio>No hay fotos de ese servicio todavía.</EstadoVacio>}
      {filtro && visibles.length > 1 && <p className="text-sm text-tinta-suave">Para cambiar el orden, mira todos los servicios.</p>}
      {items.some((i) => i.antes) && (
        <p className="flex items-center gap-2 text-sm text-tinta-suave">
          <HouseIcon aria-hidden className="size-4 shrink-0" />
          Arriba en la portada se compara el trabajo marcado &quot;En la portada&quot;. Para cambiarlo, toca la casa en otro con foto de antes.
        </p>
      )}

      {/* En el celular, una por renglón: así entran los 5 íconos y editar tiene lugar (pulido 4.7) */}
      {visibles.length > 0 && (
        <ol aria-label="Fotos de la galería" className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          {visibles.map((item, i) => (
            <Tarjeta
              key={item.id}
              item={item}
              servicios={servicios}
              primero={i === 0}
              ultimo={i === visibles.length - 1}
              ordenable={!filtro}
              enPortada={item.id === portadaId}
            />
          ))}
        </ol>
      )}
    </div>
  );
}

function Miniatura({ foto, alt, etiqueta }: { foto: Foto; alt: string; etiqueta?: string }) {
  return (
    <span className="relative block overflow-hidden bg-superficie">
      <Image src={foto.miniatura} alt={alt} width={foto.ancho ?? 640} height={foto.alto ?? 640} unoptimized className="absolute inset-0 size-full object-cover" />
      {etiqueta && <span className="absolute bottom-1 left-1 rounded-sm bg-negro/70 px-1.5 py-0.5 text-xs font-semibold text-blanco">{etiqueta}</span>}
    </span>
  );
}

function Tarjeta({
  item,
  servicios,
  primero,
  ultimo,
  ordenable,
  enPortada,
}: {
  item: ItemGaleria;
  servicios: Servicio[];
  primero: boolean;
  ultimo: boolean;
  ordenable: boolean;
  enPortada: boolean;
}) {
  const [editando, setEditando] = useState(false);
  const [pendiente, iniciar] = useTransition();
  const ejecutar = (accion: () => Promise<EstadoFormulario>) => iniciar(async () => avisarResultado(await accion()));

  return (
    <li className={`flex flex-col overflow-hidden rounded-sm border border-border ${item.visible ? "" : "opacity-70"}`}>
      {/* Mismo recuadro (2:1) con par o con foto sola: las tarjetas quedan parejas. La sola se recorta solo aquí. */}
      <div className={`grid aspect-[2/1] ${item.antes ? "grid-cols-2 gap-px" : ""}`}>
        {item.antes && <Miniatura foto={item.antes} alt={`Antes: ${item.descripcion}`} etiqueta="Antes" />}
        <Miniatura foto={item.despues} alt={item.antes ? `Después: ${item.descripcion}` : item.descripcion} etiqueta={item.antes ? "Después" : undefined} />
      </div>
      <div className="flex flex-1 flex-col gap-2 p-2">
        {editando ? (
          <EditarItem item={item} servicios={servicios} alTerminar={() => setEditando(false)} />
        ) : (
          <>
            <span className="flex flex-wrap items-center gap-1 text-xs font-semibold text-tinta-suave">
              {item.servicio}
              {!item.visible && <span className="tt-insignia">Oculta</span>}
              {enPortada && <span className="tt-insignia">En la portada</span>}
            </span>
            <span className="line-clamp-2 text-sm">{item.descripcion}</span>
            <span className="-mx-2 mt-auto flex flex-wrap justify-end">
              {ordenable && (
                <>
                  <Button type="button" variant="ghost" size="icon" disabled={pendiente || primero} aria-label={`Subir: ${item.descripcion}`} onClick={() => ejecutar(() => moverGaleriaItem({ id: item.id, direccion: "subir" }))}>
                    <ArrowUpIcon />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" disabled={pendiente || ultimo} aria-label={`Bajar: ${item.descripcion}`} onClick={() => ejecutar(() => moverGaleriaItem({ id: item.id, direccion: "bajar" }))}>
                    <ArrowDownIcon />
                  </Button>
                </>
              )}
              {/* Solo un trabajo visible con antes puede ir a la portada; el que ya está no muestra el botón */}
              {item.antes && item.visible && !enPortada && (
                <Button type="button" variant="ghost" size="icon" disabled={pendiente} aria-label={`Mostrar en la portada: ${item.descripcion}`} onClick={() => ejecutar(() => elegirParaPortada(item.id))}>
                  <HouseIcon />
                </Button>
              )}
              <Button type="button" variant="ghost" size="icon" aria-label={`Editar: ${item.descripcion}`} onClick={() => setEditando(true)}>
                <PencilIcon />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={pendiente}
                aria-label={`${item.visible ? "Ocultar" : "Mostrar"}: ${item.descripcion}`}
                onClick={() => ejecutar(() => cambiarVisibilidadGaleria({ id: item.id, visible: !item.visible }))}
              >
                {item.visible ? <EyeOffIcon /> : <EyeIcon />}
              </Button>
              <Eliminar item={item} />
            </span>
          </>
        )}
      </div>
    </li>
  );
}

function EditarItem({ item, servicios, alTerminar }: { item: ItemGaleria; servicios: Servicio[]; alTerminar: () => void }) {
  const [estado, accion, enviando] = useActionState<EstadoFormulario, FormData>(async (previo, datos) => {
    const r = await guardarGaleriaItem(previo, datos);
    avisarResultado(r);
    if (r.ok) alTerminar();
    return r;
  }, {});
  const e = estado.errores ?? {};
  const prefijo = `galeria-${item.id}`;
  const formulario = useRef<HTMLFormElement>(null);
  useFocoEnError(formulario, estado);
  return (
    <form ref={formulario} action={accion} className="flex flex-col gap-3" noValidate>
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
      <Campo id={`${prefijo}-descripcion`} etiqueta="Descripción" error={e.descripcion}>
        <Input id={`${prefijo}-descripcion`} name="descripcion" defaultValue={estado.valores?.descripcion ?? item.descripcion} aria-invalid={!!e.descripcion} aria-describedby={e.descripcion ? `${prefijo}-descripcion-error` : undefined} />
      </Campo>
      <div className="flex gap-2">
        <Button type="submit" disabled={enviando}>{enviando ? "Guardando…" : "Guardar"}</Button>
        <Button type="button" variant="outline" onClick={alTerminar}>Cancelar</Button>
      </div>
    </form>
  );
}

function Eliminar({ item }: { item: ItemGaleria }) {
  const [abierto, setAbierto] = useState(false);
  const [pendiente, iniciar] = useTransition();
  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger render={<Button type="button" variant="ghost" size="icon" aria-label={`Eliminar: ${item.descripcion}`} />}>
        <TrashIcon />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>¿Eliminar esta foto?</DialogTitle>
          <DialogDescription>No se puede deshacer. Si solo quieres que no se vea en el sitio, ocúltala.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>Cancelar</DialogClose>
          <Button
            type="button"
            variant="destructive"
            disabled={pendiente}
            onClick={() =>
              iniciar(async () => {
                const r = await eliminarGaleriaItem(item.id);
                avisarResultado(r);
                if (r.ok) setAbierto(false);
              })
            }
          >
            Eliminar foto
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const sinSuscripcion = () => () => {};

function SubirFotos({ servicios, alTerminar }: { servicios: Servicio[]; alTerminar: () => void }) {
  const [despues, setDespues] = useState<File | null>(null);
  const [antes, setAntes] = useState<File | null>(null);
  const [etapa, setEtapa] = useState<"preparando" | "subiendo" | null>(null);
  const [estado, setEstado] = useState<EstadoFormulario>({});
  const [, iniciar] = useTransition();
  const formulario = useRef<HTMLFormElement>(null);
  const listo = useSyncExternalStore(sinSuscripcion, () => true, () => false);
  const e = estado.errores ?? {};
  useFocoEnError(formulario, estado);

  async function enviar(evento: React.SyntheticEvent<HTMLFormElement, SubmitEvent>) {
    evento.preventDefault();
    const datos = new FormData(evento.currentTarget);
    setEtapa("preparando");
    datos.set("despues", despues ? await achicarFoto(despues) : new File([], ""));
    if (antes) datos.set("antes", await achicarFoto(antes));
    setEtapa("subiendo");
    iniciar(async () => {
      try {
        const r = await subirGaleria({}, datos);
        setEstado(r);
        avisarResultado(r);
        if (r.ok) alTerminar();
      } catch {
        setEstado({ mensaje: "No se pudieron subir las fotos. Revisa tu conexión y vuelve a intentar." });
      } finally {
        setEtapa(null);
      }
    });
  }

  return (
    <form ref={formulario} onSubmit={enviar} className="flex max-w-2xl flex-col gap-5 rounded-sm border border-border p-4" noValidate aria-labelledby="subir-titulo">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 id="subir-titulo" className="font-heading text-2xl font-bold italic">Subir fotos</h2>
          <p className="text-sm text-tinta-suave">Un par de antes y después, o solo la foto del resultado.</p>
        </div>
        <Button type="button" variant="ghost" size="icon" onClick={alTerminar} aria-label="Cerrar">
          <XIcon />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <ElegirFoto id="foto-antes" etiqueta="Antes (opcional)" archivo={antes} onChange={setAntes} error={e.antes} />
        <ElegirFoto id="foto-despues" etiqueta="Después" archivo={despues} onChange={setDespues} error={e.despues} />
      </div>

      <Campo id="servicio" etiqueta="Servicio" error={e.servicioId}>
        <Selector id="servicio" name="servicioId" defaultValue={estado.valores?.servicioId ?? ""} aria-invalid={!!e.servicioId} aria-describedby={e.servicioId ? "servicio-error" : undefined}>
          <option value="">Elige el servicio</option>
          {servicios.map((s) => (
            <option key={s.id} value={s.id}>{s.nombre}</option>
          ))}
        </Selector>
      </Campo>
      <Campo id="descripcion" etiqueta="Descripción" error={e.descripcion} ayuda='Ejemplo: "Pulido y nano cerámico 5 años en una Hilux".'>
        <Input id="descripcion" name="descripcion" autoComplete="off" defaultValue={estado.valores?.descripcion} aria-invalid={!!e.descripcion} aria-describedby={e.descripcion ? "descripcion-error" : "descripcion-ayuda"} />
      </Campo>

      {estado.mensaje && !estado.ok && <MensajeError id="subir-error">{estado.mensaje}</MensajeError>}
      <div>
        <Button type="submit" disabled={!listo || etapa !== null}>
          {etapa === "preparando" ? "Preparando fotos…" : etapa === "subiendo" ? "Subiendo…" : "Guardar en la galería"}
        </Button>
      </div>
    </form>
  );
}

function ElegirFoto({ id, etiqueta, archivo, onChange, error }: { id: string; etiqueta: string; archivo: File | null; onChange: (f: File | null) => void; error?: string }) {
  const [vista, setVista] = useState<string | null>(null);
  const entrada = useRef<HTMLInputElement>(null);
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-semibold">{etiqueta}</span>
      <button
        type="button"
        onClick={() => entrada.current?.click()}
        className="flex aspect-square items-center justify-center overflow-hidden rounded-sm border border-dashed border-border bg-superficie data-invalido:border-solid data-invalido:border-destructive text-sm text-tinta-suave focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        aria-label={`${archivo ? "Cambiar" : "Elegir"} foto: ${etiqueta}`}
        data-invalido={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- vista previa local (blob:), no pasa por next/image */}
        {vista ? <img src={vista} alt="" className="size-full object-cover" /> : <span className="flex flex-col items-center gap-1"><CameraIcon className="size-6" aria-hidden />Elegir foto</span>}
      </button>
      <input
        ref={entrada}
        id={id}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        aria-label={`Archivo: ${etiqueta}`}
        onChange={(ev) => {
          const elegido = ev.currentTarget.files?.[0] ?? null;
          onChange(elegido);
          setVista((anterior) => {
            if (anterior) URL.revokeObjectURL(anterior);
            return elegido ? URL.createObjectURL(elegido) : null;
          });
        }}
      />
      {error && <MensajeError id={`${id}-error`}>{error}</MensajeError>}
    </div>
  );
}
