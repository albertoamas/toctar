"use client";

import Image from "next/image";
import { createContext, useActionState, useContext, useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import { CheckCheckIcon, CheckIcon, TriangleAlertIcon } from "lucide-react";
import { cn } from "cn";
import { useFocoEnError } from "@/componentes/foco-en-error";
import { useHidratado } from "@/componentes/hidratado";
import { avisarResultado, conAviso } from "@/componentes/panel/avisos";
import { Campo, MensajeError } from "@/componentes/panel/campo";
import { ElegirFoto } from "@/componentes/panel/elegir-foto";
import { OpcionesEnTarjetas } from "@/componentes/panel/opciones-en-tarjetas";
import { CancelarModal, ModalFormulario, PieModal, useCambioFueraDelFormulario, useCerrarModal } from "@/componentes/panel/modal-formulario";
import { CabeceraSeccion } from "@/componentes/panel/cabecera-seccion";
import { achicarFoto } from "@/componentes/panel/subida-foto";
import { VisorFotos } from "@/componentes/panel/visor-fotos";
import { BYTES_MAXIMOS_FOTO } from "@/lib/formato-fotos";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import type { EstadoFormulario } from "@/lib/formularios";
import { desmarcarParte, guardarDetalle, marcarBien, marcarRestoBien } from "../acciones";
import type { DetalleRevision } from "../consultas";
import type { EstadoRevision, TipoDetalle } from "@/db/esquema/trabajos";
import { alTocarBien, NOMBRE_DETALLE, textoAvanceChecklist, TIPOS_DE_DETALLE } from "../reglas";

// Checklist de recepción (pedido 12, P12-checklist-recepcion.md §5; pedido 26): quien recibe revisa parte por parte. Cada
// parte tiene un interruptor de dos opciones que se ve prendido o apagado: "Bien" (un toque: se prende en verde al
// momento y se guarda por detrás; otro toque lo apaga y la parte vuelve a "Sin revisar") y "Detalle" (abre el modal con
// qué tiene y la foto, y con "Otro", qué es; guardado, queda en ámbar con el tipo, y la nota y la foto se ven debajo). Arriba, el
// avance con su barra: el vehículo se recibe con todas revisadas. Solo antes de recibir: después, es prueba de cómo llegó.

type Props = { trabajoId: number; partes: { id: number; nombre: string }[]; revision: DetalleRevision[] };

/**
 * El texto de un detalle: solo con "Otro" (revisión del 13/11). Uno de otro tipo guardado antes con nota no la muestra:
 * así la lista dice lo mismo que el modal, que ya no la ofrece, y que lo que queda al volver a guardarlo.
 */
const notaDe = (d: Pick<DetalleRevision, "tipo" | "nota">) => (d.tipo === "otro" ? d.nota : null);
type Marca = { parteId: number; estado: EstadoRevision | null };

/**
 * Cuántas faltan, para "Recibir vehículo": del mismo estado que el avance del checklist (lo tocado se ve al momento), así
 * el botón y la barra no dicen cosas distintas mientras se guarda.
 */
const FaltanChecklist = createContext<{ faltan: number | null; avisar: (faltan: number) => void }>({ faltan: null, avisar: () => {} });

export function AvanceRecepcion({ children }: { children: React.ReactNode }) {
  const [faltan, setFaltan] = useState<number | null>(null);
  return <FaltanChecklist.Provider value={{ faltan, avisar: setFaltan }}>{children}</FaltanChecklist.Provider>;
}

/** Las que faltan según el checklist; antes de que se dibuje, las que dijo el servidor. */
export const useFaltanChecklist = (delServidor: number) => useContext(FaltanChecklist).faltan ?? delServidor;

export function ChecklistRecepcion({ trabajoId, partes, revision }: Props) {
  const [abierta, setAbierta] = useState<{ id: number; nombre: string } | null>(null);
  const hidratado = useHidratado();
  const [, iniciar] = useTransition();
  // Las partes que se están guardando: sus botones esperan, así dos toques rápidos no se cruzan (marcar y desmarcar)
  const [guardando, setGuardando] = useState<number[]>([]);
  // Lo tocado se ve al momento; si el servidor no lo guarda, vuelve solo a como estaba (con su aviso)
  const [marcas, marcar] = useOptimistic<Marca[], Marca>([], (actuales, nueva) => [...actuales.filter((m) => m.parteId !== nueva.parteId), nueva]);
  const de = (parteId: number) => revision.find((d) => d.parteId === parteId);
  const estadoDe = (parteId: number): EstadoRevision | null => {
    const tocada = marcas.find((m) => m.parteId === parteId);
    return tocada ? tocada.estado : (de(parteId)?.estado ?? null);
  };
  // Una parte desactivada que ya estaba revisada sigue a la vista: lo marcado no desaparece
  const sueltas = revision.filter((d) => !partes.some((p) => p.id === d.parteId)).map((d) => ({ id: d.parteId, nombre: d.parte }));
  const filas = [...partes, ...sueltas];
  const revisadas = filas.filter((p) => estadoDe(p.id) !== null).length;
  const completo = filas.length > 0 && revisadas === filas.length;
  const { avisar } = useContext(FaltanChecklist);
  const faltanAhora = partes.filter((p) => estadoDe(p.id) === null).length;
  useEffect(() => avisar(faltanAhora), [avisar, faltanAhora]);
  // Los detalles con foto, en el orden de la lista: el visor pasa de uno a otro
  const conFoto = filas.flatMap((p) => {
    const d = de(p.id);
    return estadoDe(p.id) === "detalle" && d?.estado === "detalle" && d.foto ? [d] : [];
  });
  const [fotoAbierta, setFotoAbierta] = useState<number | null>(null);

  // Las que faltan, todas bien de un toque: se ven al momento y se guardan juntas
  const [marcandoResto, setMarcandoResto] = useState(false);
  function marcarResto() {
    const faltan = filas.filter((p) => estadoDe(p.id) === null && partes.some((a) => a.id === p.id));
    if (faltan.length === 0 || marcandoResto) return;
    setMarcandoResto(true);
    iniciar(async () => {
      for (const p of faltan) marcar({ parteId: p.id, estado: "bien" });
      try {
        avisarResultado(await marcarRestoBien({ trabajoId, parteIds: faltan.map((p) => p.id) }));
      } catch {
        avisarResultado({ mensaje: "No se pudo guardar. Revisa tu conexión y vuelve a intentar." });
      } finally {
        setMarcandoResto(false);
      }
    });
  }

  function tocarBien(parteId: number) {
    if (guardando.includes(parteId)) return;
    const accion = alTocarBien(estadoDe(parteId));
    setGuardando((g) => [...g, parteId]);
    iniciar(async () => {
      marcar({ parteId, estado: accion === "marcar" ? "bien" : null });
      const r = accion === "marcar" ? await marcarBien({ trabajoId, parteId }) : await desmarcarParte({ trabajoId, parteId });
      if (!r.ok) avisarResultado(r);
      setGuardando((g) => g.filter((id) => id !== parteId));
    });
  }

  return (
    <section aria-labelledby="checklist-titulo" className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <CabeceraSeccion id="checklist" titulo="Checklist" compacta />
        <p className="text-sm text-tinta-suave">Revisa cada parte: bien, o con un detalle y su foto.</p>
      </div>
      {filas.length === 0 ? (
        <p className="text-tinta-suave">No hay partes en el checklist: se agregan en Configuración → Taller.</p>
      ) : (
        <div className="tt-tarjeta-panel overflow-hidden">
          {/* El avance: cuántas van, cuántas faltan y una barra que se llena (verde al completarse) */}
          <div className="flex flex-col gap-2 border-b border-border px-4 py-3">
            <div className="flex items-baseline justify-between gap-3">
              <p aria-live="polite" className="font-semibold tabular-nums">
                Revisadas {revisadas} de {filas.length}
              </p>
              <p className={cn("text-sm font-semibold", completo ? "text-exito" : "text-tinta-suave")}>{textoAvanceChecklist(revisadas, filas.length)}</p>
            </div>
            <div
              role="progressbar"
              aria-label="Avance del checklist"
              aria-valuemin={0}
              aria-valuemax={filas.length}
              aria-valuenow={revisadas}
              className="h-2 overflow-hidden rounded-full bg-neutro-fondo"
            >
              <div
                className={cn("h-full rounded-full transition-[width] duration-300 motion-reduce:transition-none", completo ? "bg-exito" : "bg-info")}
                style={{ width: `${(revisadas / filas.length) * 100}%` }}
              />
            </div>
            {/* Un vehículo que llega sin nada: lo que falta, bien de un toque. Lo ya revisado (un detalle) no cambia */}
            {!completo && (
              <Button type="button" variant="outline" className="self-start" disabled={!hidratado || marcandoResto || guardando.length > 0} onClick={marcarResto}>
                <CheckCheckIcon />
                {marcandoResto ? "Marcando…" : revisadas === 0 ? "Marcar todas como bien" : "Marcar el resto como bien"}
              </Button>
            )}
          </div>
          {/* Las fotos de los detalles en el visor del panel, sin salir a otra pestaña (pulido 13.16) */}
          <VisorFotos
            fotos={conFoto.map((d) => ({ ...d.foto!, alt: `Foto: ${d.parte}`, leyenda: `${d.parte}: ${d.tipo ? NOMBRE_DETALLE[d.tipo] : "Detalle"}${notaDe(d) ? `. ${notaDe(d)}` : ""}` }))}
            abierta={fotoAbierta}
            alCambiar={setFotoAbierta}
            titulo="Detalles de ingreso"
          />
          <ul aria-label="Partes del checklist" className="flex flex-col divide-y divide-border">
            {filas.map((p) => {
              const estado = estadoDe(p.id);
              // También mientras "Marcar el resto" guarda: un toque en una parte no se cruza con ese
              const ocupada = !hidratado || marcandoResto || guardando.includes(p.id);
              const d = de(p.id);
              // El detalle guardado, solo si sigue siendo detalle (un "Bien" recién tocado ya lo reemplazó)
              const detalle = estado === "detalle" && d?.estado === "detalle" ? d : null;
              return (
                <li key={p.id} className="flex flex-col gap-2 px-4 py-3">
                  {/* El nombre a la izquierda (si es largo, en dos renglones) y el interruptor siempre a la derecha: la
                      lista queda pareja también en el celular */}
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3">
                    {/* Sin revisar no lleva texto (pulido de Recibir, 09/11): lo dicen el avance y el interruptor apagado, que
                        el lector oye como "Bien, no presionado"; revisada, el interruptor prendido y, si es un detalle, debajo */}
                    <span className="min-w-0 font-semibold">{p.nombre}</span>
                    <span role="group" aria-label={p.nombre} className="flex shrink-0 overflow-hidden rounded-lg border border-border">
                      <button
                        type="button"
                        disabled={ocupada}
                        aria-pressed={estado === "bien"}
                        aria-label={`Bien: ${p.nombre}`}
                        onClick={() => tocarBien(p.id)}
                        className={cn(
                          "inline-flex min-h-11 items-center gap-1.5 px-3 text-sm font-semibold transition-colors sm:px-3.5 focus-visible:z-10 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--foco)] disabled:opacity-50",
                          estado === "bien" ? "bg-exito text-fondo" : "bg-fondo text-tinta-suave hover:bg-superficie hover:text-tinta",
                        )}
                      >
                        <CheckIcon className="size-4" aria-hidden />
                        Bien
                      </button>
                      <button
                        type="button"
                        disabled={ocupada}
                        aria-pressed={estado === "detalle"}
                        aria-label={`Detalle: ${p.nombre}`}
                        onClick={() => setAbierta(p)}
                        className={cn(
                          "inline-flex min-h-11 items-center gap-1.5 border-l border-border px-3 text-sm font-semibold transition-colors sm:px-3.5 focus-visible:z-10 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--foco)] disabled:opacity-50",
                          estado === "detalle" ? "bg-aviso-fondo text-aviso" : "bg-fondo text-tinta-suave hover:bg-superficie hover:text-tinta",
                        )}
                      >
                        <TriangleAlertIcon className="size-4" aria-hidden />
                        {detalle?.tipo ? NOMBRE_DETALLE[detalle.tipo] : "Detalle"}
                      </button>
                    </span>
                  </div>
                  {detalle && (notaDe(detalle) || detalle.foto) && (
                    <div className="flex items-center gap-3 rounded-lg bg-aviso-fondo/60 p-2">
                      {detalle.foto && (
                        <button type="button" onClick={() => setFotoAbierta(conFoto.findIndex((x) => x.parteId === p.id))} className="shrink-0 cursor-zoom-in rounded-md" aria-label={`Ver la foto: ${p.nombre}`}>
                          <Image src={detalle.foto.miniatura} alt="" width={48} height={48} unoptimized className="size-12 rounded-md object-cover" />
                        </button>
                      )}
                      {notaDe(detalle) && <span className="min-w-0 text-sm">{notaDe(detalle)}</span>}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
      <ModalFormulario titulo={abierta ? `Detalle: ${abierta.nombre}` : "Detalle"} abierto={!!abierta} alCambiar={(a) => !a && setAbierta(null)}>
        {/* Con lo que se ve: si la parte se acaba de pasar a bien, el modal empieza vacío y no con el detalle de antes */}
        {abierta && <FormularioDetalle key={abierta.id} trabajoId={trabajoId} parteId={abierta.id} detalle={estadoDe(abierta.id) === "detalle" ? (de(abierta.id) ?? null) : null} />}
      </ModalFormulario>
    </section>
  );
}

function FormularioDetalle({ trabajoId, parteId, detalle }: { trabajoId: number; parteId: number; detalle: DetalleRevision | null }) {
  const cerrar = useCerrarModal();
  // La foto vive en el estado y no en el campo: React reinicia el formulario al terminar la acción (también con un error)
  // y el archivo se perdía mientras la vista previa lo seguía mostrando
  const [archivo, setArchivo] = useState<File | null>(null);
  useCambioFueraDelFormulario(!!archivo);
  const [estado, accion, enviando] = useActionState<EstadoFormulario, FormData>(
    conAviso(async (previo: EstadoFormulario, datos: FormData) => {
      if (archivo) {
        // Achicada en el navegador, como las demás fotos del panel; si no se pudo achicar y sigue grande, se avisa aquí:
        // el servidor no recibe pedidos de más de 6 MB
        const achicada = await achicarFoto(archivo);
        if (achicada.size > BYTES_MAXIMOS_FOTO) return { errores: { foto: "La foto es muy grande: tómala de nuevo o elige otra." }, valores: previo.valores };
        datos.set("foto", achicada);
      }
      return guardarDetalle(previo, datos);
    }, (r) => r.ok && cerrar()),
    {},
  );
  const formulario = useRef<HTMLFormElement>(null);
  useFocoEnError(formulario, estado);
  const e = estado.errores ?? {};
  // Controlados, con su campo oculto: React reinicia el formulario tras un error y los radios de base-ui se vaciaban
  const [tipo, setTipo] = useState<string>(estado.valores?.tipo ?? detalle?.tipo ?? "");
  const [nota, setNota] = useState(estado.valores?.nota ?? (detalle ? notaDe(detalle) : null) ?? "");
  const [escribir, setEscribir] = useState(false);
  const [vistaPrevia, setVistaPrevia] = useState<string | null>(null);
  useEffect(() => () => void (vistaPrevia && URL.revokeObjectURL(vistaPrevia)), [vistaPrevia]);
  const elegirFoto = (elegido: File | null) => {
    setArchivo(elegido);
    setVistaPrevia(elegido ? URL.createObjectURL(elegido) : null);
  };

  const foto = vistaPrevia ?? detalle?.foto?.miniatura ?? null;
  return (
    <form ref={formulario} action={accion} className="flex flex-col gap-5" noValidate aria-label="Detalle de la parte">
      <input type="hidden" name="trabajoId" value={trabajoId} />
      <input type="hidden" name="parteId" value={parteId} />
      {estado.mensaje && !estado.ok && <MensajeError id="detalle-error">{estado.mensaje}</MensajeError>}
      {/* Qué tiene, en tarjetas que se tocan enteras (revisión del 13/11, `OpcionesEnTarjetas`). Sin nota: se elige qué tiene
          y, solo con "Otro", se escribe qué es (antes había una nota siempre, que casi nunca hacía falta). Después la foto */}
      <OpcionesEnTarjetas
        id="tipo"
        titulo="Qué tiene"
        nombre="tipo"
        valor={tipo as TipoDetalle | ""}
        cambiar={(t) => {
          setTipo(t);
          // Al elegir "Otro", directo a escribir; al abrir uno que ya era "Otro", no (no abre solo el teclado)
          setEscribir(t === "otro");
        }}
        opciones={TIPOS_DE_DETALLE.map((t) => ({ valor: t, texto: NOMBRE_DETALLE[t] }))}
        error={e.tipo}
        className="grid-cols-3 sm:grid-cols-5"
      />
      {tipo === "otro" && (
        <Campo id="nota" etiqueta="Qué es" error={e.nota}>
          <Input id="nota" name="nota" autoFocus={escribir} maxLength={300} value={nota} onChange={(ev) => setNota(ev.target.value)} placeholder="Por ejemplo: espejo flojo" aria-invalid={!!e.nota} aria-describedby={e.nota ? "nota-error" : undefined} />
        </Campo>
      )}
      <div className="flex flex-col gap-3">
        <p className="text-sm font-medium">
          Foto <span className="font-normal text-tinta-suave">(opcional)</span>
        </p>
        <ElegirFoto id="foto" de="del detalle" vista={foto} alElegir={elegirFoto} quitable={!!vistaPrevia} error={e.foto} />
      </div>
      <PieModal>
        <Button type="submit" disabled={enviando}>
          {enviando ? "Guardando…" : "Guardar detalle"}
        </Button>
        <CancelarModal />
      </PieModal>
    </form>
  );
}
