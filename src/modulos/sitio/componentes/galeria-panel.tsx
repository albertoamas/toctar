"use client";

import Image from "next/image";
import { useActionState, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { CameraIcon, EyeOffIcon, PencilIcon, TrashIcon, UploadIcon, XIcon } from "lucide-react";
import { useFocoEnError } from "@/componentes/foco-en-error";
import { EstadoVacio } from "@/componentes/panel/estado-vacio";
import { avisarResultado } from "@/componentes/panel/avisos";
import { Campo, MensajeError } from "@/componentes/panel/campo";
import { AvisoFoto, GuiaFoto } from "@/componentes/panel/guia-foto";
import { VisorFotos } from "@/componentes/panel/visor-fotos";
import { ZonaFoto } from "@/componentes/panel/zona-foto";
import { Selector } from "@/componentes/panel/selector";
import { achicarFoto, medidasDeFoto } from "@/componentes/panel/subida-foto";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { avisosDeGaleria } from "@/lib/formato-fotos";
import type { EstadoFormulario } from "@/lib/formularios";
import { nombreDelTrabajo } from "../galeria";
import { cambiarVisibilidadGaleria, elegirParaPortada, eliminarGaleriaItem, guardarGaleriaItem, moverGaleriaItem, subirGaleria } from "../acciones";
import { Insignia } from "@/componentes/panel/insignia";
import { MenuMas, type AccionMas } from "@/componentes/panel/menu-mas";
import { CancelarModal, ModalFormulario, PieModal, useCerrarModal } from "@/componentes/panel/modal-formulario";
import { BarraLista } from "@/componentes/panel/barra-lista";
import { CLASE_PILDORA, CLASE_PILDORA_ACTIVA } from "@/componentes/panel/filtros";
import { cn } from "cn";

// HU-09: galería de antes y después (RF-12). Se sube un par o una foto sola, asociada a un servicio,
// y se ordena, oculta, edita o elimina. Las fotos se achican en el celular antes de subir.
// Un trabajo con antes se elige para el comparador de la portada (pedido de la demo del 24/10).

type Foto = { url: string; miniatura: string; ancho: number | null; alto: number | null };
export type ItemGaleria = {
  id: number;
  servicioId: number;
  servicio: string;
  descripcion: string;
  visible: boolean;
  /** Visible y de un servicio que se ve en el sitio: solo así puede ir a la portada. */
  enSitio: boolean;
  antes: Foto | null;
  despues: Foto;
};
type Servicio = { id: number; nombre: string };

export function GaleriaPanel({ items, servicios, portadaId }: { items: ItemGaleria[]; servicios: Servicio[]; portadaId: number | null }) {
  const [filtro, setFiltro] = useState("");
  const [subiendo, setSubiendo] = useState(false);
  const visibles = filtro ? items.filter((i) => String(i.servicioId) === filtro) : items;
  // El trabajo que se ve en grande: con las flechas se pasa a los demás de la lista a la vista (pulido 13.16)
  const [abierto, setAbierto] = useState<number | null>(null);
  const nombreDe = (item: ItemGaleria) => nombreDelTrabajo(item.descripcion, item.servicio, items.indexOf(item) + 1);

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

        </div>
      )}

      {items.length > 0 && <PortadaElegida items={items} portadaId={portadaId} nombreDe={nombreDe} />}

      {/* Barra de las listas (10/11): qué fotos se ven, en píldoras con su cuenta como los filtros de Órdenes (antes, un
          menú del sistema "Ver fotos de" a la derecha) */}
      {items.length > 0 && (
        <BarraLista
          filtros={
            <div role="group" aria-label="Ver fotos de" className="flex w-max gap-2 sm:w-auto sm:flex-wrap">
              {[{ id: "", nombre: "Todas", cuenta: items.length }, ...servicios.map((s) => ({ id: String(s.id), nombre: s.nombre, cuenta: items.filter((i) => String(i.servicioId) === String(s.id)).length }))]
                .filter((o) => o.id === "" || o.cuenta > 0)
                .map((o) => (
                  <button key={o.id} type="button" aria-pressed={filtro === o.id} onClick={() => setFiltro(o.id)} className={cn(CLASE_PILDORA, filtro === o.id && CLASE_PILDORA_ACTIVA)}>
                    {o.nombre}
                    <span className={cn("font-medium tabular-nums", filtro === o.id ? "text-fondo/75" : "text-tinta-suave")}> {o.cuenta}</span>
                  </button>
                ))}
            </div>
          }
        />
      )}

      {items.length === 0 && !subiendo && <EstadoVacio>Todavía no hay fotos. Sube la primera de un trabajo terminado.</EstadoVacio>}
      {items.length > 0 && visibles.length === 0 && <EstadoVacio>No hay fotos de ese servicio todavía.</EstadoVacio>}
      {filtro && visibles.length > 1 && <p className="text-sm text-tinta-suave">Para cambiar el orden, mira todos los servicios.</p>}

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
              alAbrir={() => setAbierto(i)}
              // Su lugar en la lista completa (no cambia al filtrar): distingue a los que no tienen descripción
              numero={items.indexOf(item) + 1}
            />
          ))}
        </ol>
      )}
      <VisorFotos
        fotos={visibles.map((item) => ({ ...item.despues, alt: nombreDe(item), leyenda: `${item.servicio}: ${nombreDe(item)}` }))}
        abierta={abierto}
        alCambiar={setAbierto}
        titulo="Galería"
        cosa="trabajo"
        contenido={(i) => <TrabajoEnGrande item={visibles[i]} nombre={nombreDe(visibles[i])} />}
      />
    </div>
  );
}

/** Un trabajo en el visor: el antes y el después lado a lado (uno sobre otro en el celular), o el resultado solo. */
function TrabajoEnGrande({ item, nombre }: { item: ItemGaleria; nombre: string }) {
  const foto = (f: Foto, alt: string, etiqueta?: string) => (
    <figure className="relative bg-superficie">
      {/* eslint-disable-next-line @next/next/no-img-element -- las fotos ya vienen en WebP, como en el resto del panel */}
      <img src={f.url} alt={alt} width={f.ancho ?? undefined} height={f.alto ?? undefined} className="mx-auto max-h-[60dvh] w-full object-contain" />
      {etiqueta && <figcaption className="absolute top-2 left-2 rounded-sm bg-negro/75 px-2 py-0.5 text-sm font-semibold text-blanco">{etiqueta}</figcaption>}
    </figure>
  );
  return item.antes ? (
    <div className="grid gap-2 sm:grid-cols-2">
      {foto(item.antes, `Antes: ${nombre}`, "Antes")}
      {foto(item.despues, `Después: ${nombre}`, "Después")}
    </div>
  ) : (
    foto(item.despues, nombre)
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

/**
 * El trabajo de la portada, en su propia sección arriba (pulido 13.17): antes, una casa más entre los íconos de cada
 * tarjeta, con un párrafo que la explicaba. "Cambiar" abre la lista de los que pueden ir: con antes y que se ven en el sitio.
 * Sin elegir, el sitio muestra el primero con antes (2B.1).
 */
function PortadaElegida({ items, portadaId, nombreDe }: { items: ItemGaleria[]; portadaId: number | null; nombreDe: (item: ItemGaleria) => string }) {
  const [abierto, setAbierto] = useState(false);
  const posibles = items.filter((i) => i.antes && i.enSitio);
  const elegida = items.find((i) => i.id === portadaId) ?? null;
  // Lo que se ve hoy en el sitio: el elegido o, sin elegir, el primero que puede ir
  const enSitio = elegida ?? posibles[0] ?? null;
  return (
    // En una fila también en el celular: la foto chica al lado del texto, para que la sección no empuje la galería
    <section aria-labelledby="portada-titulo" className="tt-tarjeta-panel flex flex-wrap items-center gap-3 p-4">
      {enSitio?.antes && (
        <span className="grid aspect-[2/1] w-28 shrink-0 grid-cols-2 gap-px overflow-hidden rounded-sm sm:w-48">
          {/* Sin etiquetas: en una miniatura tan chica no entran, y el par se entiende solo */}
          <Miniatura foto={enSitio.antes} alt="" />
          <Miniatura foto={enSitio.despues} alt="" />
        </span>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <h2 id="portada-titulo" className="tt-titulo-sub">En la portada</h2>
        {enSitio ? (
          <p className="text-sm">
            {nombreDe(enSitio)}
            {!elegida && <span className="text-tinta-suave"> (sin elegir: va el primero con antes y después)</span>}
          </p>
        ) : (
          <p className="text-sm text-tinta-suave">Para la portada hace falta un trabajo con foto de antes que se vea en el sitio.</p>
        )}
      </div>
      {posibles.length > 0 && (
        <Button type="button" variant="outline" onClick={() => setAbierto(true)} aria-label="Cambiar el trabajo de la portada">
          Cambiar
        </Button>
      )}
      <ModalFormulario titulo="El trabajo de la portada" abierto={abierto} alCambiar={setAbierto}>
        <ElegirPortada posibles={posibles} elegidaId={enSitio?.id ?? null} nombreDe={nombreDe} />
      </ModalFormulario>
    </section>
  );
}

function ElegirPortada({ posibles, elegidaId, nombreDe }: { posibles: ItemGaleria[]; elegidaId: number | null; nombreDe: (item: ItemGaleria) => string }) {
  const cerrar = useCerrarModal();
  const [pendiente, iniciar] = useTransition();
  return (
    <>
      <p className="text-sm text-tinta-suave">Arriba en la portada se compara un trabajo con antes y después. Solo los que se ven en el sitio.</p>
      <ul aria-label="Trabajos para la portada" className="flex flex-col gap-2">
        {posibles.map((item) => {
          const nombre = nombreDe(item);
          const actual = item.id === elegidaId;
          const contenido = (
            <>
              <span className="grid aspect-[2/1] w-28 shrink-0 grid-cols-2 gap-px overflow-hidden rounded-sm">
                <Miniatura foto={item.antes!} alt="" />
                <Miniatura foto={item.despues} alt="" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col text-left">
                <span className="text-xs font-semibold text-tinta-suave">{item.servicio}</span>
                <span className="line-clamp-2 text-sm">{nombre}</span>
              </span>
            </>
          );
          return (
            <li key={item.id}>
              {actual ? (
                <div className="flex items-center gap-3 rounded-lg border border-tinta p-2">
                  {contenido}
                  <Insignia tono="exito">En la portada</Insignia>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={pendiente}
                  aria-label={`Mostrar en la portada: ${nombre}`}
                  onClick={() =>
                    iniciar(async () => {
                      const r = await elegirParaPortada(item.id);
                      avisarResultado(r);
                      if (r.ok) cerrar();
                    })
                  }
                  className="flex w-full items-center gap-3 rounded-lg border border-border p-2 hover:bg-superficie focus-visible:outline-2 focus-visible:outline-[var(--foco)] disabled:opacity-60"
                >
                  {contenido}
                </button>
              )}
            </li>
          );
        })}
      </ul>
      <PieModal>
        <CancelarModal />
      </PieModal>
    </>
  );
}

function Tarjeta({
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

const sinSuscripcion = () => () => {};

function SubirFotos({ servicios, alTerminar }: { servicios: Servicio[]; alTerminar: () => void }) {
  const [despues, setDespues] = useState<File | null>(null);
  const [antes, setAntes] = useState<File | null>(null);
  // Las medidas de cada foto elegida, para avisar antes de subir. Se leen aparte: la última elegida es la que vale
  const [medidas, setMedidas] = useState<Record<"antes" | "despues", { ancho: number; alto: number } | null>>({ antes: null, despues: null });
  const ultima = useRef<Record<"antes" | "despues", File | null>>({ antes: null, despues: null });
  const [etapa, setEtapa] = useState<"preparando" | "subiendo" | null>(null);
  const [estado, setEstado] = useState<EstadoFormulario>({});
  const [, iniciar] = useTransition();
  const formulario = useRef<HTMLFormElement>(null);
  const listo = useSyncExternalStore(sinSuscripcion, () => true, () => false);
  const e = estado.errores ?? {};
  useFocoEnError(formulario, estado);

  async function elegir(lado: "antes" | "despues", archivo: File | null) {
    (lado === "antes" ? setAntes : setDespues)(archivo);
    ultima.current[lado] = archivo;
    setMedidas((m) => ({ ...m, [lado]: null }));
    const leidas = archivo ? await medidasDeFoto(archivo) : null;
    if (ultima.current[lado] === archivo) setMedidas((m) => ({ ...m, [lado]: leidas }));
  }

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
    <form ref={formulario} onSubmit={enviar} className="flex max-w-2xl flex-col gap-5 tt-tarjeta-panel p-4" noValidate aria-labelledby="subir-titulo">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 id="subir-titulo" className="tt-titulo-seccion">Subir fotos</h2>
          <p className="text-sm text-tinta-suave">Un par de antes y después, o solo la foto del resultado.</p>
        </div>
        <Button type="button" variant="ghost" size="icon" onClick={alTerminar} aria-label="Cerrar">
          <XIcon />
        </Button>
      </div>

      <GuiaFoto titulo="Cómo sacar estas fotos" consejo="El auto, al centro. Antes y después, desde el mismo lugar y la misma distancia." />

      <div className="grid grid-cols-2 gap-3">
        <ElegirFoto id="foto-antes" etiqueta="Antes (opcional)" archivo={antes} onChange={(f) => void elegir("antes", f)} error={e.antes} />
        <ElegirFoto id="foto-despues" etiqueta="Después" archivo={despues} onChange={(f) => void elegir("despues", f)} error={e.despues} />
      </div>
      {avisosDeGaleria(medidas.antes, medidas.despues).map((aviso) => (
        <AvisoFoto key={aviso}>{aviso}</AvisoFoto>
      ))}

      <Campo id="servicio" etiqueta="Servicio" error={e.servicioId}>
        <Selector id="servicio" name="servicioId" defaultValue={estado.valores?.servicioId ?? ""} aria-invalid={!!e.servicioId} aria-describedby={e.servicioId ? "servicio-error" : undefined}>
          <option value="">Elige el servicio</option>
          {servicios.map((s) => (
            <option key={s.id} value={s.id}>{s.nombre}</option>
          ))}
        </Selector>
      </Campo>
      <Campo id="descripcion" etiqueta="Descripción" opcional error={e.descripcion} ayuda='La leen Google y los lectores de pantalla, y se ve debajo de la foto si va en la portada. Ejemplo: "Pulido y nano cerámico 5 años en una Hilux".'>
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

  function cambiar(elegido: File | null) {
    onChange(elegido);
    setVista((anterior) => {
      if (anterior) URL.revokeObjectURL(anterior);
      return elegido ? URL.createObjectURL(elegido) : null;
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-semibold">{etiqueta}</span>
      <ZonaFoto
        id={id}
        entrada={entrada}
        nombreEntrada={`Archivo: ${etiqueta}`}
        etiquetaVacia={`Elegir foto: ${etiqueta}`}
        vista={vista ? { src: vista, alt: "" } : null}
        invalida={!!error}
        describedBy={error ? `${id}-error` : undefined}
        alElegir={cambiar}
      />
      {archivo && (
        <div className="flex flex-wrap gap-1">
          <Button type="button" variant="outline" data-invalido={error ? true : undefined} aria-label={`Cambiar foto: ${etiqueta}`} onClick={() => entrada.current?.click()}>
            <CameraIcon />
            Cambiar
          </Button>
          <Button
            type="button"
            variant="ghost"
            aria-label={`Quitar foto: ${etiqueta}`}
            onClick={() => {
              if (entrada.current) entrada.current.value = "";
              cambiar(null);
            }}
          >
            <TrashIcon />
            Quitar
          </Button>
        </div>
      )}
      {error && <MensajeError id={`${id}-error`}>{error}</MensajeError>}
    </div>
  );
}
