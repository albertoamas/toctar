"use client";

import Image from "next/image";
import { useActionState, useRef, useState } from "react";
import { ImageUpIcon } from "lucide-react";
import { useFocoEnError } from "@/componentes/foco-en-error";
import { Campo, MensajeError } from "@/componentes/panel/campo";
import { BOTON_PASO } from "@/componentes/panel/paso-siguiente";
import { AvisoAlSalir } from "@/componentes/panel/cambios-sin-guardar";
import { PieFormulario } from "@/componentes/panel/pie-formulario";
import { Selector } from "@/componentes/panel/selector";
import { Button } from "@/componentes/ui/button";
import { Checkbox } from "@/componentes/ui/checkbox";
import { Input } from "@/componentes/ui/input";
import type { EstadoFormulario } from "@/lib/formularios";
import { publicarEnGaleria } from "../acciones";
import type { FotoOrden } from "../consultas";

// HU-41: publicar en la galería las fotos de una orden entregada. Cada foto es una opción (un radio nativo: flechas,
// foco y lector de pantalla sin nada propio) que se toca en la grilla; la elegida lleva marco y la palabra "Elegida".
// La foto de antes es opcional: "Sin foto de antes" es una opción más, la primera.

type Props = {
  id: number;
  despues: FotoOrden[];
  antes: FotoOrden[];
  servicios: { id: number; nombre: string }[];
};

export function FormularioPublicar({ id, despues, antes, servicios }: Props) {
  const [estado, accion, enviando] = useActionState<EstadoFormulario, FormData>(publicarEnGaleria, {});
  const formulario = useRef<HTMLFormElement>(null);
  useFocoEnError(formulario, estado);
  // El valor en un campo oculto propio: la casilla de base-ui se vaciaba al reiniciarse el formulario
  const [confirmado, setConfirmado] = useState(false);
  const e = estado.errores ?? {};
  const v = estado.valores ?? {};

  return (
    <form ref={formulario} action={accion} className="tt-formulario-panel flex flex-col gap-8" noValidate aria-label="Publicar en la galería">
      <input type="hidden" name="id" value={id} />
      {estado.mensaje && <MensajeError id="publicar-error">{estado.mensaje}</MensajeError>}

      <GrillaFotos nombre="fotoDespues" titulo="Foto de después" foto="Foto de después" fotos={despues} elegida={v.fotoDespues ?? String(despues[0].id)} error={e.fotoDespues} />
      {antes.length > 0 && <GrillaFotos nombre="fotoAntes" titulo="Foto de antes (opcional)" foto="Foto de antes" fotos={antes} elegida={v.fotoAntes ?? ""} error={e.fotoAntes} conNinguna />}

      <Campo id="servicioId" etiqueta="Servicio" error={e.servicioId}>
        <Selector id="servicioId" name="servicioId" defaultValue={v.servicioId ?? String(servicios[0]?.id ?? "")} aria-invalid={!!e.servicioId} aria-describedby={e.servicioId ? "servicioId-error" : undefined}>
          {servicios.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nombre}
            </option>
          ))}
        </Selector>
      </Campo>

      <Campo id="descripcion" etiqueta="Descripción" opcional error={e.descripcion} ayuda='La leen Google y los lectores de pantalla. Ejemplo: "Pulido y nano cerámico 5 años en una Hilux".'>
        <Input id="descripcion" name="descripcion" autoComplete="off" defaultValue={v.descripcion} aria-invalid={!!e.descripcion} aria-describedby={e.descripcion ? "descripcion-error" : "descripcion-ayuda"} />
      </Campo>

      <div className="flex flex-col gap-2">
        {confirmado && <input type="hidden" name="sinPlacaNiCaras" value="on" />}
        <label htmlFor="sinPlacaNiCaras" className="flex min-h-11 cursor-pointer items-center gap-3 rounded-sm border border-aviso p-3">
          <Checkbox
            id="sinPlacaNiCaras"
            checked={confirmado}
            onCheckedChange={(si) => setConfirmado(si === true)}
            data-invalido={e.sinPlacaNiCaras ? true : undefined}
            aria-describedby={e.sinPlacaNiCaras ? "sinPlacaNiCaras-error" : undefined}
          />
          <span className="font-medium">En las fotos no se lee la placa ni se ve a nadie</span>
        </label>
        {e.sinPlacaNiCaras && <MensajeError id="sinPlacaNiCaras-error">{e.sinPlacaNiCaras}</MensajeError>}
      </div>

      {/* El pie común, fijo abajo en el celular, con el botón grande del taller, como Recibir y Entregar
          (inventario-pantallas.md, cambio 3: era el único paso del taller con el botón suelto al final) */}
      <AvisoAlSalir formulario={formulario} estado={estado} />
      <PieFormulario>
        <Button type="submit" size="paso" disabled={enviando} className={BOTON_PASO}>
          <ImageUpIcon />
          {enviando ? "Publicando…" : "Publicar"}
        </Button>
      </PieFormulario>
    </form>
  );
}

const MOSAICO = "relative block aspect-square cursor-pointer overflow-hidden rounded-sm border-2 border-transparent bg-superficie has-[:checked]:border-tinta has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50";

type PropsGrilla = {
  nombre: string;
  titulo: string;
  /** Cómo se llama cada foto para el lector de pantalla: "Foto de después, 2 de 3". */
  foto: string;
  fotos: FotoOrden[];
  elegida: string;
  error?: string;
  /** La primera opción es no elegir ninguna. */
  conNinguna?: boolean;
};

/** Una grilla de fotos para elegir una. */
function GrillaFotos({ nombre, titulo, foto, fotos, elegida, error, conNinguna = false }: PropsGrilla) {
  const idError = `${nombre}-error`;
  return (
    <fieldset className="flex flex-col gap-3" aria-describedby={error ? idError : undefined}>
      <legend className="mb-3 tt-titulo-seccion">{titulo}</legend>
      {error && <MensajeError id={idError}>{error}</MensajeError>}
      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
        {conNinguna && (
          <li>
            <label className={`${MOSAICO} flex items-center justify-center p-2 text-center text-sm font-semibold`}>
              <input type="radio" name={nombre} value="" defaultChecked={elegida === ""} className="peer sr-only" />
              Sin foto de antes
              <Elegida />
            </label>
          </li>
        )}
        {fotos.map((f, i) => (
          <li key={f.id}>
            <label className={MOSAICO}>
              <input type="radio" name={nombre} value={f.id} defaultChecked={elegida === String(f.id)} aria-label={`${foto}, ${i + 1} de ${fotos.length}`} data-invalido={error ? true : undefined} className="peer sr-only" />
              <Image src={f.miniatura} alt="" width={f.ancho ?? 640} height={f.alto ?? 640} unoptimized className="pointer-events-none size-full object-cover" />
              <Elegida />
            </label>
          </li>
        ))}
      </ul>
    </fieldset>
  );
}

/** La marca de la elegida, también con texto: no solo con el color del marco. */
const Elegida = () => <span className="tt-estado pointer-events-none absolute bottom-1 left-1 hidden bg-fondo text-tinta peer-checked:inline-flex">Elegida</span>;
