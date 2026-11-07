"use client";

import { useEffect, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { CheckCircle2Icon, XIcon } from "lucide-react";
import { useFocoEnError } from "@/componentes/foco-en-error";
import { Campo, MensajeError } from "@/componentes/panel/campo";
import { AvisoFoto } from "@/componentes/panel/guia-foto";
import { Selector } from "@/componentes/panel/selector";
import { achicarFoto } from "@/componentes/panel/subida-foto";
import { ZonaFoto } from "@/componentes/panel/zona-foto";
import { Input } from "@/componentes/ui/input";
import { Textarea } from "@/componentes/ui/textarea";
import type { EstadoFormulario } from "@/lib/formularios";
import { enviarReclamo } from "../acciones";
import { MAXIMO_FOTOS } from "../esquemas";

// HU-16: formulario público de garantía y reclamos. Las fotos se achican antes de subir (RNF-07).
// Anti-spam: campo trampa invisible ("sitio_web") y la hora en que se abrió el formulario.

type Foto = { archivo: File; vista: string };
const sinSuscripcion = () => () => {};
/** Campos de 44 px de alto: en el sitio se llenan con el dedo (pulido 2.8). */
const CAMPO = "h-11";

export function FormularioReclamo({ servicios }: { servicios: { id: number; nombre: string }[] }) {
  const [estado, setEstado] = useState<EstadoFormulario>({});
  const [fotos, setFotos] = useState<Foto[]>([]);
  // Las que no entraron en la última elección: se dice, no se pierden en silencio
  const [fotosDeMas, setFotosDeMas] = useState(0);
  const [etapa, setEtapa] = useState<"preparando" | "enviando" | null>(null);
  const [, iniciar] = useTransition();
  const abiertoEn = useRef<number | null>(null);
  const entradaFotos = useRef<HTMLInputElement>(null);
  const formulario = useRef<HTMLFormElement>(null);
  const confirmacion = useRef<HTMLDivElement>(null);
  const listo = useSyncExternalStore(sinSuscripcion, () => true, () => false);
  const e = estado.errores ?? {};
  const v = estado.valores;

  useEffect(() => {
    abiertoEn.current = Date.now();
  }, []);

  // Después de enviar, la pantalla va al resultado y el foco también, para que lo anuncie el lector de pantalla
  // (pulido 2.8): antes el foco quedaba en la página y la confirmación salía tapada por el encabezado.
  useEffect(() => {
    if (!estado.ok) return;
    confirmacion.current?.scrollIntoView({ block: "start" });
    confirmacion.current?.focus({ preventScroll: true });
  }, [estado]);
  useFocoEnError(formulario, estado);

  if (estado.ok) {
    return (
      <div ref={confirmacion} role="status" tabIndex={-1} className="flex scroll-mt-24 flex-col items-start gap-4 bg-superficie p-8 outline-none">
        <CheckCircle2Icon className="size-10 text-exito" aria-hidden />
        <h2 className="font-heading text-[28px] leading-8 font-bold italic">Recibimos tu reclamo</h2>
        <p className="max-w-prose text-tinta-suave">Te escribiremos al WhatsApp que dejaste.</p>
      </div>
    );
  }

  function agregarFotos(lista: File[]) {
    const lugares = MAXIMO_FOTOS - fotos.length;
    setFotosDeMas(Math.max(0, lista.length - lugares));
    const nuevas = lista.slice(0, lugares).map((archivo) => ({ archivo, vista: URL.createObjectURL(archivo) }));
    setFotos((f) => [...f, ...nuevas]);
    if (entradaFotos.current) entradaFotos.current.value = "";
  }

  async function enviar(evento: React.SyntheticEvent<HTMLFormElement, SubmitEvent>) {
    evento.preventDefault();
    const datos = new FormData(evento.currentTarget);
    datos.delete("fotos");
    datos.set("abierto_en", String(abiertoEn.current ?? ""));
    setEtapa("preparando");
    for (const f of fotos) datos.append("fotos", await achicarFoto(f.archivo));
    setEtapa("enviando");
    iniciar(async () => {
      try {
        setEstado(await enviarReclamo({}, datos));
      } catch {
        setEstado({ mensaje: "No se pudo enviar. Revisa tu conexión y vuelve a intentar.", valores: estado.valores });
      } finally {
        setEtapa(null);
      }
    });
  }

  const describir = (c: string, ayuda = false) => (e[c] ? `${c}-error` : ayuda ? `${c}-ayuda` : undefined);

  return (
    <form ref={formulario} onSubmit={enviar} className="flex max-w-2xl flex-col gap-6" noValidate aria-label="Garantía y reclamos">
      {/* Trampa para robots: una persona no la ve ni la llena. */}
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor="sitio_web">No completar</label>
        <input id="sitio_web" name="sitio_web" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Campo id="nombre" etiqueta="Nombre" error={e.nombre}>
          <Input id="nombre" name="nombre" autoComplete="name" className={CAMPO} defaultValue={v?.nombre} aria-invalid={!!e.nombre} aria-describedby={describir("nombre")} />
        </Campo>
        {/* Los ejemplos van en la ayuda y no como texto dentro del campo: vacío, parecía ya escrito (pulido 2.8) */}
        <Campo id="telefono" etiqueta="WhatsApp" error={e.telefono} ayuda="Te respondemos por aquí. Ejemplo: 71234567">
          <Input id="telefono" name="telefono" type="tel" inputMode="tel" autoComplete="tel" className={CAMPO} defaultValue={v?.telefono} aria-invalid={!!e.telefono} aria-describedby={describir("telefono", true)} />
        </Campo>
        <Campo id="placa" etiqueta="Placa del vehículo" error={e.placa} ayuda="Por ejemplo, 2849XKT.">
          <Input id="placa" name="placa" autoCapitalize="characters" autoComplete="off" className={CAMPO} defaultValue={v?.placa} aria-invalid={!!e.placa} aria-describedby={describir("placa", true)} />
        </Campo>
        <Campo id="fechaAproximada" etiqueta="Fecha aproximada del trabajo" opcional error={e.fechaAproximada}>
          <Input id="fechaAproximada" name="fechaAproximada" type="date" className={CAMPO} defaultValue={v?.fechaAproximada} aria-invalid={!!e.fechaAproximada} aria-describedby={describir("fechaAproximada")} />
        </Campo>
      </div>

      <Campo id="servicioId" etiqueta="Servicio" opcional error={e.servicioId}>
        <Selector id="servicioId" name="servicioId" className={CAMPO} defaultValue={v?.servicioId ?? ""} aria-invalid={!!e.servicioId} aria-describedby={describir("servicioId")}>
          <option value="">No sé o es otro</option>
          {servicios.map((s) => (
            <option key={s.id} value={s.id}>{s.nombre}</option>
          ))}
        </Selector>
      </Campo>

      <Campo id="descripcion" etiqueta="¿Qué pasó?" error={e.descripcion} ayuda="Cuéntanos qué notaste y desde cuándo.">
        <Textarea id="descripcion" name="descripcion" rows={5} defaultValue={v?.descripcion} aria-invalid={!!e.descripcion} aria-describedby={describir("descripcion", true)} />
      </Campo>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 text-sm font-semibold">Fotos (opcional, hasta {MAXIMO_FOTOS})</legend>
        {fotos.length > 0 && (
          <ul aria-label="Fotos elegidas" className="flex flex-wrap gap-3">
            {fotos.map((f, i) => (
              <li key={f.vista} className="relative size-24 overflow-hidden bg-superficie">
                {/* eslint-disable-next-line @next/next/no-img-element -- vista previa local (blob:) */}
                <img src={f.vista} alt={`Foto ${i + 1}`} className="size-full object-cover" />
                <button
                  type="button"
                  onClick={() => {
                    URL.revokeObjectURL(f.vista);
                    setFotos((todas) => todas.filter((x) => x !== f));
                    setFotosDeMas(0);
                  }}
                  className="absolute top-0 right-0 flex size-11 items-start justify-end p-1"
                  aria-label={`Quitar la foto ${i + 1}`}
                >
                  {/* Se ve de 28 px y se toca en 44 × 44 (pulido 2.8) */}
                  <span className="grid size-7 place-items-center bg-negro/80 text-blanco">
                    <XIcon className="size-4" aria-hidden />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {fotos.length < MAXIMO_FOTOS && (
          <ZonaFoto
            id="fotos"
            name="fotos"
            enSitio
            entrada={entradaFotos}
            nombreEntrada="Archivos de las fotos"
            etiquetaVacia="Agregar fotos"
            pie={`JPG, PNG o WebP, hasta ${MAXIMO_FOTOS}`}
            deshabilitada={!listo}
            invalida={!!e.fotos}
            describedBy={e.fotos ? "fotos-error" : undefined}
            alElegirVarias={agregarFotos}
          />
        )}
        {fotosDeMas > 0 && <AvisoFoto>Hasta {MAXIMO_FOTOS} fotos: no se agregaron {fotosDeMas}.</AvisoFoto>}
        {e.fotos && <MensajeError id="fotos-error">{e.fotos}</MensajeError>}
      </fieldset>

      {estado.mensaje && !estado.ok && <MensajeError id="reclamo-error">{estado.mensaje}</MensajeError>}

      <div>
        <button type="submit" disabled={!listo || etapa !== null} className="tt-boton tt-boton--principal disabled:opacity-60">
          {etapa === "preparando" ? "Preparando fotos…" : etapa === "enviando" ? "Enviando…" : "Enviar reclamo"}
        </button>
      </div>
    </form>
  );
}
