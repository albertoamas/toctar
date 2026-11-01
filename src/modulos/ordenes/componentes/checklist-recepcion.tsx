"use client";

import Image from "next/image";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { CameraIcon, CheckIcon } from "lucide-react";
import { useFocoEnError } from "@/componentes/foco-en-error";
import { useHidratado } from "@/componentes/hidratado";
import { avisarResultado, conAviso } from "@/componentes/panel/avisos";
import { Campo, MensajeError } from "@/componentes/panel/campo";
import { CancelarModal, ModalFormulario, PieModal, useCerrarModal } from "@/componentes/panel/modal-formulario";
import { achicarFoto } from "@/componentes/panel/subida-foto";
import { Button } from "@/componentes/ui/button";
import { RadioGroup, RadioGroupItem } from "@/componentes/ui/radio-group";
import { Textarea } from "@/componentes/ui/textarea";
import type { EstadoFormulario } from "@/lib/formularios";
import { guardarDetalle, quitarDetalle } from "../acciones";
import type { DetalleRevision } from "../consultas";
import { NOMBRE_DETALLE, TIPOS_DE_DETALLE } from "../reglas";

// Checklist de recepción (pedido 12, P12-checklist-recepcion.md §5): una fila por parte, "Bien" si no se marca nada.
// "Marcar detalle" abre un modal con qué tiene, una nota y la foto (la cámara del celular); se guarda al momento, como
// las fotos de ingreso. Solo antes de recibir: después, el detalle es prueba de cómo llegó.

type Props = { trabajoId: number; partes: { id: number; nombre: string }[]; detalles: DetalleRevision[] };

export function ChecklistRecepcion({ trabajoId, partes, detalles }: Props) {
  const [abierta, setAbierta] = useState<{ id: number; nombre: string } | null>(null);
  const hidratado = useHidratado();
  const detalleDe = (parteId: number) => detalles.find((d) => d.parteId === parteId);
  // Una parte desactivada que ya tenía un detalle sigue a la vista: lo marcado no desaparece
  const sueltos = detalles.filter((d) => !partes.some((p) => p.id === d.parteId)).map((d) => ({ id: d.parteId, nombre: d.parte }));
  const filas = [...partes, ...sueltos];

  return (
    <section aria-labelledby="checklist-titulo" className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 id="checklist-titulo" className="font-heading text-2xl font-bold italic">Checklist</h2>
        <p className="text-sm text-tinta-suave">Marca solo lo que llegó con un detalle: lo demás queda bien.</p>
      </div>
      {filas.length === 0 ? (
        <p className="text-tinta-suave">No hay partes en el checklist: se agregan en Configuración → Taller.</p>
      ) : (
        <ul aria-label="Partes del checklist" className="flex flex-col divide-y divide-border rounded-sm border border-border">
          {filas.map((p) => {
            const d = detalleDe(p.id);
            return (
              <li key={p.id} className="flex items-center gap-3 px-3 py-2">
                {d?.foto && (
                  <a href={d.foto.url} target="_blank" rel="noreferrer" className="shrink-0" aria-label={`Ver la foto: ${p.nombre}`}>
                    <Image src={d.foto.miniatura} alt="" width={48} height={48} unoptimized className="size-12 rounded-sm object-cover" />
                  </a>
                )}
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="font-semibold">{p.nombre}</span>
                  {d ? (
                    <span className="text-sm">
                      <span className="tt-insignia tt-insignia--aviso mr-2">{NOMBRE_DETALLE[d.tipo]}</span>
                      {d.nota}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-sm text-tinta-suave">
                      <CheckIcon className="size-4" aria-hidden />
                      Bien
                    </span>
                  )}
                </span>
                <Button type="button" variant={d ? "ghost" : "outline"} disabled={!hidratado} onClick={() => setAbierta(p)} aria-label={`${d ? "Cambiar" : "Marcar detalle"}: ${p.nombre}`}>
                  {d ? "Cambiar" : "Marcar detalle"}
                </Button>
              </li>
            );
          })}
        </ul>
      )}
      <ModalFormulario titulo={abierta ? `Detalle: ${abierta.nombre}` : "Detalle"} abierto={!!abierta} alCambiar={(a) => !a && setAbierta(null)}>
        {abierta && <FormularioDetalle key={abierta.id} trabajoId={trabajoId} parteId={abierta.id} detalle={detalleDe(abierta.id) ?? null} />}
      </ModalFormulario>
    </section>
  );
}

/** La acción con la foto achicada en el navegador antes de subirla (como las demás fotos del panel). */
async function guardarConFotoAchicada(previo: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const foto = datos.get("foto");
  if (foto instanceof File && foto.size > 0) datos.set("foto", await achicarFoto(foto));
  return guardarDetalle(previo, datos);
}

function FormularioDetalle({ trabajoId, parteId, detalle }: { trabajoId: number; parteId: number; detalle: DetalleRevision | null }) {
  const cerrar = useCerrarModal();
  const [estado, accion, enviando] = useActionState<EstadoFormulario, FormData>(
    conAviso(guardarConFotoAchicada, (r) => r.ok && cerrar()),
    {},
  );
  const formulario = useRef<HTMLFormElement>(null);
  useFocoEnError(formulario, estado);
  const e = estado.errores ?? {};
  // Controlados, con su campo oculto: React reinicia el formulario tras un error y los radios de base-ui se vaciaban
  const [tipo, setTipo] = useState<string>(estado.valores?.tipo ?? detalle?.tipo ?? "");
  const [nota, setNota] = useState(estado.valores?.nota ?? detalle?.nota ?? "");
  const [vistaPrevia, setVistaPrevia] = useState<string | null>(null);
  const camara = useRef<HTMLInputElement>(null);
  const [quitando, iniciar] = useTransition();
  useEffect(() => () => void (vistaPrevia && URL.revokeObjectURL(vistaPrevia)), [vistaPrevia]);

  function quitar() {
    iniciar(async () => {
      const r = await quitarDetalle({ trabajoId, parteId });
      avisarResultado(r);
      if (r.ok) cerrar();
    });
  }

  const foto = vistaPrevia ?? detalle?.foto?.miniatura ?? null;
  return (
    <form ref={formulario} action={accion} className="flex flex-col gap-5" noValidate aria-label="Detalle de la parte">
      <input type="hidden" name="trabajoId" value={trabajoId} />
      <input type="hidden" name="parteId" value={parteId} />
      {estado.mensaje && !estado.ok && <MensajeError id="detalle-error">{estado.mensaje}</MensajeError>}
      <div className="flex flex-col gap-3">
        <p id="tipo-titulo" className="text-sm font-medium">Qué tiene</p>
        <input type="hidden" name="tipo" value={tipo} />
        <RadioGroup value={tipo} onValueChange={(v) => setTipo(String(v))} aria-labelledby="tipo-titulo" aria-describedby={e.tipo ? "tipo-error" : undefined} className="flex flex-wrap gap-2">
          {TIPOS_DE_DETALLE.map((t, i) => (
            <label key={t} htmlFor={`tipo-${t}`} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-sm border border-border px-3 py-2 has-data-checked:border-tinta">
              <RadioGroupItem id={`tipo-${t}`} value={t} data-invalido={(!!e.tipo && i === 0) || undefined} />
              <span className="font-semibold">{NOMBRE_DETALLE[t]}</span>
            </label>
          ))}
        </RadioGroup>
        {e.tipo && <MensajeError id="tipo-error">{e.tipo}</MensajeError>}
      </div>
      <Campo id="nota" etiqueta="Nota" error={e.nota} ayuda={tipo === "otro" ? "Con «Otro», cuenta qué es." : "Dónde y cómo es. Opcional."}>
        <Textarea id="nota" name="nota" rows={2} value={nota} onChange={(ev) => setNota(ev.target.value)} aria-invalid={!!e.nota} aria-describedby={e.nota ? "nota-error" : "nota-ayuda"} />
      </Campo>
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">Foto</p>
        {foto && <Image src={foto} alt="Foto del detalle" width={160} height={160} unoptimized className="size-40 rounded-sm object-cover" />}
        <input
          ref={camara}
          id="foto"
          name="foto"
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          aria-label="Cámara para la foto del detalle"
          onChange={(ev) => {
            const archivo = ev.target.files?.[0];
            setVistaPrevia(archivo ? URL.createObjectURL(archivo) : null);
          }}
        />
        <Button type="button" variant="outline" className="self-start" onClick={() => camara.current?.click()}>
          <CameraIcon />
          {foto ? "Tomar otra foto" : "Tomar foto"}
        </Button>
        {e.foto && <MensajeError id="foto-error">{e.foto}</MensajeError>}
      </div>
      <PieModal>
        <Button type="submit" disabled={enviando || quitando}>
          {enviando ? "Guardando…" : "Guardar detalle"}
        </Button>
        {detalle && (
          <Button type="button" variant="outline" disabled={enviando || quitando} onClick={quitar}>
            <CheckIcon />
            {quitando ? "Guardando…" : "Está bien"}
          </Button>
        )}
        <CancelarModal />
      </PieModal>
    </form>
  );
}
