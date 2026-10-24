"use client";

import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import { ArrowDownIcon, ArrowUpIcon, ImagePlusIcon, TrashIcon } from "lucide-react";
import { useFocoEnError } from "@/componentes/foco-en-error";
import { useHidratado } from "@/componentes/hidratado";
import { avisarResultado } from "@/componentes/panel/avisos";
import { Campo, MensajeError } from "@/componentes/panel/campo";
import { achicarFoto } from "@/componentes/panel/subida-foto";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import type { EstadoFormulario } from "@/lib/formularios";
import { moverFotoDeServicio, quitarFotoDeServicio, subirFotoDeServicio } from "../acciones";
import { LIMITES } from "../esquemas";

// Fotos propias de un servicio (pedido de la demo del 24/10): fotos o afiches que se ven en una tira en su página,
// además de la foto principal. Lugares vacíos para subir (al menos 4 a la vista); cada foto lleva una descripción
// corta, que es lo que leen Google y el lector de pantalla. Se guardan al momento, sin el botón Guardar cambios.

type Foto = { id: number; descripcion: string; foto: { miniatura: string; ancho: number | null; alto: number | null } };

const LUGARES_A_LA_VISTA = 4;

export function FotosServicio({ servicioId, fotos }: { servicioId: number; fotos: Foto[] }) {
  // La foto elegida y su vista previa local (blob:), que se libera al guardar o cancelar
  const [elegida, setElegida] = useState<{ archivo: File; vista: string } | null>(null);
  const soltar = () => {
    if (elegida) URL.revokeObjectURL(elegida.vista);
    setElegida(null);
  };
  const entrada = useRef<HTMLInputElement>(null);
  const listo = useHidratado();
  const lugaresVacios = fotos.length >= LIMITES.fotosServicio ? 0 : Math.max(1, LUGARES_A_LA_VISTA - fotos.length);

  return (
    <section aria-labelledby="fotos-servicio-titulo" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 id="fotos-servicio-titulo" className="font-heading text-2xl font-bold italic">Más fotos</h2>
        <p className="text-sm text-tinta-suave">
          Fotos o afiches del servicio, hasta {LIMITES.fotosServicio}. Se ven en una tira en su página y se tocan para verlas en grande. Lo que dice un
          afiche escríbelo también en la página: Google no lee la imagen.
        </p>
      </div>

      <ol aria-label="Fotos del servicio" className="grid grid-cols-2 gap-3">
        {fotos.map((f, i) => (
          <Tarjeta key={f.id} foto={f} primera={i === 0} ultima={i === fotos.length - 1} />
        ))}
        {Array.from({ length: lugaresVacios }, (_, i) => (
          <li key={`vacio-${i}`}>
            <button
              type="button"
              disabled={!listo || elegida !== null}
              onClick={() => entrada.current?.click()}
              aria-label="Agregar una foto"
              className="flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-sm border border-dashed border-border bg-superficie text-sm text-tinta-suave hover:text-tinta focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:opacity-60"
            >
              <ImagePlusIcon aria-hidden className="size-6" />
              Agregar foto
            </button>
          </li>
        ))}
      </ol>
      <input
        ref={entrada}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        aria-label="Archivo de otra foto del servicio"
        onChange={(ev) => {
          const archivo = ev.currentTarget.files?.[0];
          ev.currentTarget.value = "";
          if (archivo) setElegida({ archivo, vista: URL.createObjectURL(archivo) });
        }}
      />
      {elegida && <NuevaFoto key={elegida.vista} servicioId={servicioId} archivo={elegida.archivo} vista={elegida.vista} alTerminar={soltar} />}
    </section>
  );
}

function Tarjeta({ foto: f, primera, ultima }: { foto: Foto; primera: boolean; ultima: boolean }) {
  const [pendiente, iniciar] = useTransition();
  const ejecutar = (accion: () => Promise<EstadoFormulario>) => iniciar(async () => avisarResultado(await accion()));
  return (
    <li className="flex flex-col gap-1">
      <span className="relative block aspect-square overflow-hidden rounded-sm bg-superficie">
        <Image src={f.foto.miniatura} alt={f.descripcion} width={f.foto.ancho ?? 640} height={f.foto.alto ?? 640} unoptimized className="absolute inset-0 size-full object-cover" />
      </span>
      <span className="line-clamp-2 text-sm">{f.descripcion}</span>
      <span className="-mx-2 flex justify-end">
        <Button type="button" variant="ghost" size="icon" disabled={pendiente || primera} aria-label={`Subir: ${f.descripcion}`} onClick={() => ejecutar(() => moverFotoDeServicio({ id: f.id, direccion: "subir" }))}>
          <ArrowUpIcon />
        </Button>
        <Button type="button" variant="ghost" size="icon" disabled={pendiente || ultima} aria-label={`Bajar: ${f.descripcion}`} onClick={() => ejecutar(() => moverFotoDeServicio({ id: f.id, direccion: "bajar" }))}>
          <ArrowDownIcon />
        </Button>
        <Button type="button" variant="ghost" size="icon" disabled={pendiente} aria-label={`Quitar: ${f.descripcion}`} onClick={() => ejecutar(() => quitarFotoDeServicio(f.id))}>
          <TrashIcon />
        </Button>
      </span>
    </li>
  );
}

/** La foto elegida, con su descripción, antes de guardarla. */
function NuevaFoto({ servicioId, archivo, vista, alTerminar }: { servicioId: number; archivo: File; vista: string; alTerminar: () => void }) {
  const [estado, setEstado] = useState<EstadoFormulario>({});
  const [etapa, setEtapa] = useState<"preparando" | "subiendo" | null>(null);
  const [, iniciar] = useTransition();
  const formulario = useRef<HTMLFormElement>(null);
  const e = estado.errores ?? {};
  useFocoEnError(formulario, estado);

  async function enviar(evento: React.SyntheticEvent<HTMLFormElement, SubmitEvent>) {
    evento.preventDefault();
    const datos = new FormData(evento.currentTarget);
    setEtapa("preparando");
    datos.set("foto", await achicarFoto(archivo));
    setEtapa("subiendo");
    iniciar(async () => {
      try {
        const r = await subirFotoDeServicio({}, datos);
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
    <form ref={formulario} onSubmit={enviar} noValidate aria-label="Nueva foto" className="flex flex-col gap-3 rounded-sm border border-border p-3">
      <input type="hidden" name="servicioId" value={servicioId} />
      {/* eslint-disable-next-line @next/next/no-img-element -- vista previa local (blob:), no pasa por next/image */}
      <img src={vista} alt="" className="max-h-48 w-full bg-superficie object-contain" />
      <Campo id="foto-servicio-descripcion" etiqueta="Descripción" error={e.descripcion} ayuda='Qué muestra. Ejemplo: "Afiche de las opciones de nano cerámico".'>
        <Input
          id="foto-servicio-descripcion"
          name="descripcion"
          autoComplete="off"
          defaultValue={estado.valores?.descripcion}
          aria-invalid={!!e.descripcion}
          aria-describedby={e.descripcion ? "foto-servicio-descripcion-error" : "foto-servicio-descripcion-ayuda"}
        />
      </Campo>
      {e.foto && <MensajeError id="foto-servicio-error">{e.foto}</MensajeError>}
      {estado.mensaje && !estado.ok && <MensajeError id="foto-servicio-mensaje">{estado.mensaje}</MensajeError>}
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
