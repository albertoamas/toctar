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
import { BYTES_MAXIMOS_FOTO } from "@/lib/formato-fotos";
import { Button } from "@/componentes/ui/button";
import { RadioGroup, RadioGroupItem } from "@/componentes/ui/radio-group";
import { Textarea } from "@/componentes/ui/textarea";
import type { EstadoFormulario } from "@/lib/formularios";
import { guardarDetalle, marcarBien } from "../acciones";
import type { DetalleRevision } from "../consultas";
import { NOMBRE_DETALLE, TIPOS_DE_DETALLE } from "../reglas";
import { Insignia } from "@/componentes/panel/insignia";

// Checklist de recepción (pedido 12, P12-checklist-recepcion.md §5): quien recibe revisa parte por parte y marca cada
// una "Bien" (un toque, se guarda al momento) o "Detalle" (un modal con qué tiene, una nota y la foto). Arriba, cuántas
// lleva revisadas: el vehículo se recibe con todas revisadas. Solo antes de recibir: después, es prueba de cómo llegó.

type Props = { trabajoId: number; partes: { id: number; nombre: string }[]; revision: DetalleRevision[] };

export function ChecklistRecepcion({ trabajoId, partes, revision }: Props) {
  const [abierta, setAbierta] = useState<{ id: number; nombre: string } | null>(null);
  const hidratado = useHidratado();
  const [marcando, setMarcando] = useState<number | null>(null);
  const [, iniciar] = useTransition();
  const de = (parteId: number) => revision.find((d) => d.parteId === parteId);
  // Una parte desactivada que ya estaba revisada sigue a la vista: lo marcado no desaparece
  const sueltas = revision.filter((d) => !partes.some((p) => p.id === d.parteId)).map((d) => ({ id: d.parteId, nombre: d.parte }));
  const filas = [...partes, ...sueltas];
  const revisadas = filas.filter((p) => de(p.id)).length;

  function bien(parteId: number) {
    setMarcando(parteId);
    iniciar(async () => {
      const r = await marcarBien({ trabajoId, parteId });
      if (!r.ok) avisarResultado(r);
      setMarcando(null);
    });
  }

  return (
    <section aria-labelledby="checklist-titulo" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
        <div className="flex flex-col gap-1">
          <h2 id="checklist-titulo" className="tt-titulo-seccion">Checklist</h2>
          <p className="text-sm text-tinta-suave">Revisa cada parte: bien, o con un detalle y su foto.</p>
        </div>
        {filas.length > 0 && (
          <p aria-live="polite" className={revisadas === filas.length ? "font-semibold" : "text-tinta-suave"}>
            Revisadas {revisadas} de {filas.length}
          </p>
        )}
      </div>
      {filas.length === 0 ? (
        <p className="text-tinta-suave">No hay partes en el checklist: se agregan en Configuración → Taller.</p>
      ) : (
        <ul aria-label="Partes del checklist" className="flex flex-col divide-y divide-border tt-tarjeta-panel">
          {filas.map((p) => {
            const d = de(p.id);
            const ocupado = !hidratado || marcando === p.id;
            return (
              <li key={p.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2">
                {d?.foto && (
                  <a href={d.foto.url} target="_blank" rel="noreferrer" className="shrink-0" aria-label={`Ver la foto: ${p.nombre}`}>
                    <Image src={d.foto.miniatura} alt="" width={48} height={48} unoptimized className="size-12 rounded-sm object-cover" />
                  </a>
                )}
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="font-semibold">{p.nombre}</span>
                  {/* El estado de la parte en una insignia, como en el resto del panel (pedido 26) */}
                  {!d ? (
                    <span>
                      <Insignia>Sin revisar</Insignia>
                    </span>
                  ) : d.estado === "bien" ? (
                    <span>
                      <Insignia tono="exito">Bien</Insignia>
                    </span>
                  ) : (
                    <span className="text-sm">
                      <Insignia tono="aviso" className="mr-2">{d.tipo && NOMBRE_DETALLE[d.tipo]}</Insignia>
                      {d.nota}
                    </span>
                  )}
                </span>
                <span className="flex gap-2">
                  {!d && (
                    <Button type="button" variant="outline" disabled={ocupado} onClick={() => bien(p.id)} aria-label={`Bien: ${p.nombre}`}>
                      <CheckIcon />
                      Bien
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant={d ? "ghost" : "outline"}
                    disabled={ocupado}
                    onClick={() => setAbierta(p)}
                    aria-label={`${d ? "Cambiar" : "Detalle"}: ${p.nombre}`}
                  >
                    {d ? "Cambiar" : "Detalle"}
                  </Button>
                </span>
              </li>
            );
          })}
        </ul>
      )}
      <ModalFormulario titulo={abierta ? abierta.nombre : "Parte"} abierto={!!abierta} alCambiar={(a) => !a && setAbierta(null)}>
        {abierta && <FormularioDetalle key={abierta.id} trabajoId={trabajoId} parteId={abierta.id} detalle={de(abierta.id) ?? null} />}
      </ModalFormulario>
    </section>
  );
}

function FormularioDetalle({ trabajoId, parteId, detalle }: { trabajoId: number; parteId: number; detalle: DetalleRevision | null }) {
  const cerrar = useCerrarModal();
  // La foto vive en el estado y no en el campo: React reinicia el formulario al terminar la acción (también con un error)
  // y el archivo se perdía mientras la vista previa lo seguía mostrando
  const [archivo, setArchivo] = useState<File | null>(null);
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
  const [nota, setNota] = useState(estado.valores?.nota ?? detalle?.nota ?? "");
  const [vistaPrevia, setVistaPrevia] = useState<string | null>(null);
  const camara = useRef<HTMLInputElement>(null);
  const [quitando, iniciar] = useTransition();
  useEffect(() => () => void (vistaPrevia && URL.revokeObjectURL(vistaPrevia)), [vistaPrevia]);

  // "Está bien": la parte queda bien (si tenía un detalle, se borran su nota y su foto)
  function quitar() {
    iniciar(async () => {
      const r = await marcarBien({ trabajoId, parteId });
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
            <label key={t} htmlFor={`tipo-${t}`} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-border bg-fondo px-3 py-2 has-data-checked:border-tinta">
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
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          aria-label="Cámara para la foto del detalle"
          onChange={(ev) => {
            const elegido = ev.target.files?.[0] ?? null;
            setArchivo(elegido);
            setVistaPrevia(elegido ? URL.createObjectURL(elegido) : null);
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
        {detalle?.estado === "detalle" && (
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
