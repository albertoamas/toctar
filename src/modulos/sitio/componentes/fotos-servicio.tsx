"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useTransition } from "react";
import { ImagePlusIcon, RefreshCwIcon, TrashIcon } from "lucide-react";
import { useFocoEnError } from "@/componentes/foco-en-error";
import { useHidratado } from "@/componentes/hidratado";
import { avisarResultado } from "@/componentes/panel/avisos";
import { Campo, MensajeError } from "@/componentes/panel/campo";
import { achicarFoto } from "@/componentes/panel/subida-foto";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import type { EstadoFormulario } from "@/lib/formularios";
import { quitarFotoDeSeccion, subirFotoDeSeccion } from "../acciones";
import { SECCIONES_FOTO, type SeccionFoto } from "../secciones-foto";

// Las fotos de la página de un servicio (pedido de la demo del 24/10): un lugar por sección ("En qué consiste", "Cómo
// lo hacemos", "Opciones"), vacío hasta que se sube una. En el sitio va al lado de esa sección. Cada foto lleva una
// descripción corta, que es lo que leen Google y el lector de pantalla. Se guardan al momento, sin Guardar cambios.

type Foto = { descripcion: string; foto: { miniatura: string; ancho: number | null; alto: number | null } };

export function FotosServicio({ servicioId, fotos }: { servicioId: number; fotos: Partial<Record<SeccionFoto, Foto>> }) {
  // La sección a la que va la foto elegida, y su vista previa local (blob:)
  const [elegida, setElegida] = useState<{ seccion: SeccionFoto; archivo: File; vista: string } | null>(null);
  const destino = useRef<SeccionFoto>("descripcion");
  const entrada = useRef<HTMLInputElement>(null);
  const listo = useHidratado();
  // La vista previa se libera al cambiar de foto, al guardar o cancelar, y también si se sale de la página sin guardar
  useEffect(() => {
    if (!elegida) return;
    const { vista } = elegida;
    return () => URL.revokeObjectURL(vista);
  }, [elegida]);

  const elegir = (seccion: SeccionFoto) => {
    destino.current = seccion;
    entrada.current?.click();
  };

  return (
    <section aria-labelledby="fotos-secciones-titulo" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 id="fotos-secciones-titulo" className="font-heading text-2xl font-bold italic">Fotos de la página</h2>
        <p className="text-sm text-tinta-suave">
          Una foto al lado de cada parte de la página; se toca para verla en grande. Si es un afiche, lo que dice escríbelo también en la página: Google no
          lee la imagen.
        </p>
      </div>

      <ul className="flex flex-col gap-5">
        {(Object.entries(SECCIONES_FOTO) as [SeccionFoto, string][]).map(([seccion, nombre]) => {
          const actual = fotos[seccion];
          return (
            <li key={seccion} className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold">{nombre}</h3>
              {actual ? (
                <FotoActual servicioId={servicioId} seccion={seccion} nombre={nombre} foto={actual} ocupado={!listo || elegida !== null} alCambiar={() => elegir(seccion)} />
              ) : (
                <button
                  type="button"
                  disabled={!listo || elegida !== null}
                  onClick={() => elegir(seccion)}
                  aria-label={`Agregar foto: ${nombre}`}
                  className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-1 rounded-sm border border-dashed border-border bg-superficie text-sm text-tinta-suave hover:text-tinta focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:opacity-60"
                >
                  <ImagePlusIcon aria-hidden className="size-6" />
                  Agregar foto
                </button>
              )}
              {elegida?.seccion === seccion && (
                <NuevaFoto key={elegida.vista} servicioId={servicioId} seccion={seccion} archivo={elegida.archivo} vista={elegida.vista} alTerminar={() => setElegida(null)} />
              )}
            </li>
          );
        })}
      </ul>
      <input
        ref={entrada}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        aria-label="Archivo para una sección"
        onChange={(ev) => {
          const archivo = ev.currentTarget.files?.[0];
          ev.currentTarget.value = "";
          if (archivo) setElegida({ seccion: destino.current, archivo, vista: URL.createObjectURL(archivo) });
        }}
      />
    </section>
  );
}

function FotoActual(props: { servicioId: number; seccion: SeccionFoto; nombre: string; foto: Foto; ocupado: boolean; alCambiar: () => void }) {
  const { servicioId, seccion, nombre, foto: f, ocupado, alCambiar } = props;
  const [pendiente, iniciar] = useTransition();
  return (
    <div className="flex flex-col gap-1">
      <span className="relative block aspect-[4/3] overflow-hidden rounded-sm bg-superficie">
        <Image src={f.foto.miniatura} alt={f.descripcion} width={f.foto.ancho ?? 640} height={f.foto.alto ?? 480} unoptimized className="absolute inset-0 size-full object-contain" />
      </span>
      <span className="line-clamp-2 text-sm">{f.descripcion}</span>
      <span className="-mx-2 flex justify-end">
        <Button type="button" variant="ghost" size="icon" disabled={ocupado || pendiente} aria-label={`Cambiar la foto: ${nombre}`} onClick={alCambiar}>
          <RefreshCwIcon />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={pendiente}
          aria-label={`Quitar la foto: ${nombre}`}
          onClick={() => iniciar(async () => avisarResultado(await quitarFotoDeSeccion({ servicioId, seccion })))}
        >
          <TrashIcon />
        </Button>
      </span>
    </div>
  );
}

/** La foto elegida, con su descripción, antes de guardarla. */
function NuevaFoto(props: { servicioId: number; seccion: SeccionFoto; archivo: File; vista: string; alTerminar: () => void }) {
  const { servicioId, seccion, archivo, vista, alTerminar } = props;
  const [estado, setEstado] = useState<EstadoFormulario>({});
  const [etapa, setEtapa] = useState<"preparando" | "subiendo" | null>(null);
  const [, iniciar] = useTransition();
  const formulario = useRef<HTMLFormElement>(null);
  const e = estado.errores ?? {};
  const id = `foto-${seccion}`;
  useFocoEnError(formulario, estado);

  async function enviar(evento: React.SyntheticEvent<HTMLFormElement, SubmitEvent>) {
    evento.preventDefault();
    const datos = new FormData(evento.currentTarget);
    setEtapa("preparando");
    datos.set("foto", await achicarFoto(archivo));
    setEtapa("subiendo");
    iniciar(async () => {
      try {
        const r = await subirFotoDeSeccion({}, datos);
        setEstado(r);
        avisarResultado(r);
        if (r.ok) alTerminar();
      } catch {
        setEstado({ mensaje: "No se pudo subir la foto. Revisa tu conexión y vuelve a intentar." });
      } finally {
        setEtapa(null);
      }
    });
  }

  return (
    <form ref={formulario} onSubmit={enviar} noValidate aria-label={`Nueva foto: ${SECCIONES_FOTO[seccion]}`} className="flex flex-col gap-3 rounded-sm border border-border p-3">
      <input type="hidden" name="servicioId" value={servicioId} />
      <input type="hidden" name="seccion" value={seccion} />
      {/* eslint-disable-next-line @next/next/no-img-element -- vista previa local (blob:), no pasa por next/image */}
      <img src={vista} alt="" className="max-h-48 w-full bg-superficie object-contain" />
      <Campo id={`${id}-descripcion`} etiqueta="Descripción" error={e.descripcion} ayuda='Qué muestra. Ejemplo: "Afiche de las opciones de nano cerámico".'>
        <Input
          id={`${id}-descripcion`}
          name="descripcion"
          autoComplete="off"
          defaultValue={estado.valores?.descripcion}
          aria-invalid={!!e.descripcion}
          aria-describedby={e.descripcion ? `${id}-descripcion-error` : `${id}-descripcion-ayuda`}
        />
      </Campo>
      {e.foto && <MensajeError id={`${id}-error`}>{e.foto}</MensajeError>}
      {estado.mensaje && !estado.ok && <MensajeError id={`${id}-mensaje`}>{estado.mensaje}</MensajeError>}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={etapa !== null}>
          {etapa === "preparando" ? "Preparando foto…" : etapa === "subiendo" ? "Subiendo…" : "Guardar foto"}
        </Button>
        <Button type="button" variant="outline" disabled={etapa !== null} onClick={alTerminar}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
