"use client";

import Image from "next/image";
import { useActionState, useRef, useState } from "react";
import { ImageUpIcon } from "lucide-react";
import { ComparadorAntesDespues } from "@/componentes/sitio/comparador-antes-despues";
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
import { publicarEnGaleria } from "../acciones/galeria";
import type { FotoOrden } from "../consultas";

// HU-41: publicar en la galería las fotos de una orden entregada. Cada foto es una opción (un radio nativo: flechas,
// foco y lector de pantalla sin nada propio) que se toca en la grilla; la elegida lleva marco y la palabra "Elegida".
// La foto de antes es opcional: "Sin foto de antes" es una opción más, la primera.
// Recorrido visual (21/11): "Así se verá", en vivo, con el comparador de la galería y las fotos elegidas (al costado en la
// computadora, debajo de las fotos en el celular); la casilla de privacidad, junto a las fotos de las que habla; y lo que
// hace el paso, en chico junto al botón (era un aviso azul arriba de todo).

type Props = {
  /** De dónde se vino: la orden vuelve ahí al publicar (pedido 43). */
  volver: string | null;
  id: number;
  despues: FotoOrden[];
  antes: FotoOrden[];
  servicios: { id: number; nombre: string }[];
};

export function FormularioPublicar({ id, volver, despues, antes, servicios }: Props) {
  const [estado, accion, enviando] = useActionState<EstadoFormulario, FormData>(publicarEnGaleria, {});
  const formulario = useRef<HTMLFormElement>(null);
  useFocoEnError(formulario, estado);
  // El valor en un campo oculto propio: la casilla de base-ui se vaciaba al reiniciarse el formulario
  const [confirmado, setConfirmado] = useState(false);
  const e = estado.errores ?? {};
  const v = estado.valores ?? {};
  // Las elegidas, para "Así se verá": empiezan como el formulario (o como quedaron si el servidor devolvió un error)
  const [despuesId, setDespuesId] = useState(v.fotoDespues ?? String(despues[0].id));
  const [antesId, setAntesId] = useState(v.fotoAntes ?? "");
  const fotoDespues = despues.find((f) => String(f.id) === despuesId) ?? despues[0];
  const fotoAntes = antes.find((f) => String(f.id) === antesId) ?? null;
  // El servicio, en su lista (21/11, a pedido del desarrollador): con uno solo, ya elegido; con varios, ninguno por
  // defecto, así no se publica con el primero por olvido
  const servicioElegido = v.servicioId ?? (servicios.length === 1 ? String(servicios[0].id) : "");

  return (
    <form ref={formulario} action={accion} className="flex flex-col gap-6" noValidate aria-label="Publicar en la galería">
      <input type="hidden" name="id" value={id} />
      {volver && <input type="hidden" name="volver" value={volver} />}
      {/* Lo que se elige en su tarjeta y el botón fuera, al pie, como en los otros pasos (C7 §5.3, 18/11) */}
      {/* En la computadora, dos columnas: lo que se elige a la izquierda y "Así se verá" a la derecha, a la vista al bajar */}
      <div className="grid items-start gap-6 @4xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="tt-formulario-panel flex flex-col gap-8">
          {estado.mensaje && <MensajeError id="publicar-error">{estado.mensaje}</MensajeError>}

          <GrillaFotos nombre="fotoDespues" titulo="Foto de después" foto="Foto de después" fotos={despues} elegida={despuesId} alElegir={setDespuesId} error={e.fotoDespues} />
          {antes.length > 0 && <GrillaFotos nombre="fotoAntes" titulo="Foto de antes (opcional)" foto="Foto de antes" fotos={antes} elegida={antesId} alElegir={setAntesId} error={e.fotoAntes} conNinguna />}

          {/* En el celular, debajo de las fotos elegidas */}
          <div className="@4xl:hidden">
            <AsiSeVera antes={fotoAntes} despues={fotoDespues} enTarjeta={false} />
          </div>

          {/* Junto a las fotos de las que habla (antes iba al final, debajo del botón fijo en el celular) */}
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
              <span className="font-medium">Revisé las fotos: no se lee la placa ni se ve a nadie</span>
            </label>
            {e.sinPlacaNiCaras && <MensajeError id="sinPlacaNiCaras-error">{e.sinPlacaNiCaras}</MensajeError>}
          </div>

          <Campo id="servicioId" etiqueta="Servicio" error={e.servicioId}>
            <Selector
              id="servicioId"
              name="servicioId"
              defaultValue={servicioElegido}
              aria-invalid={!!e.servicioId}
              aria-describedby={e.servicioId ? "servicioId-error" : undefined}
              data-invalido={e.servicioId ? true : undefined}
              className="max-w-md"
            >
              {servicios.length > 1 && (
                <option value="" disabled>
                  Elige el servicio
                </option>
              )}
              {servicios.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </Selector>
          </Campo>

          <Campo id="descripcion" etiqueta="Descripción" opcional error={e.descripcion} ayuda='La leen Google y los lectores de pantalla. Ejemplo: "Pulido y nano cerámico 5 años en una Hilux".'>
            <Input id="descripcion" name="descripcion" autoComplete="off" defaultValue={v.descripcion} aria-invalid={!!e.descripcion} aria-describedby={e.descripcion ? "descripcion-error" : "descripcion-ayuda"} className="max-w-xl" />
          </Campo>
        </div>

        {/* En la computadora, al costado y a la vista al bajar */}
        <div className="hidden @4xl:sticky @4xl:top-6 @4xl:block">
          <AsiSeVera antes={fotoAntes} despues={fotoDespues} />
        </div>
      </div>

      {/* El pie común, fijo abajo en el celular, con el botón grande del taller, como Recibir y Entregar
          (inventario-pantallas.md, cambio 3: era el único paso del taller con el botón suelto al final) */}
      <AvisoAlSalir formulario={formulario} estado={estado} />
      <PieFormulario>
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          <Button type="submit" size="paso" disabled={enviando} className={BOTON_PASO}>
            <ImageUpIcon />
            {enviando ? "Publicando…" : "Publicar"}
          </Button>
          <p className="text-sm text-tinta-suave">Se copian a la galería; las fotos de la orden no cambian.</p>
        </div>
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
  /** Al tocar una: "Así se verá" la muestra. */
  alElegir: (id: string) => void;
};

/** Una grilla de fotos para elegir una. */
function GrillaFotos({ nombre, titulo, foto, fotos, elegida, error, conNinguna = false, alElegir }: PropsGrilla) {
  const idError = `${nombre}-error`;
  return (
    <fieldset className="flex flex-col gap-3" aria-describedby={error ? idError : undefined}>
      <legend className="mb-3 tt-titulo-seccion">{titulo}</legend>
      {error && <MensajeError id={idError}>{error}</MensajeError>}
      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
        {conNinguna && (
          <li>
            <label className={`${MOSAICO} flex items-center justify-center p-2 text-center text-sm font-semibold`}>
              <input type="radio" name={nombre} value="" checked={elegida === ""} onChange={() => alElegir("")} className="peer sr-only" />
              Sin foto de antes
              <Elegida />
            </label>
          </li>
        )}
        {fotos.map((f, i) => (
          <li key={f.id}>
            <label className={MOSAICO}>
              <input
                type="radio"
                name={nombre}
                value={f.id}
                checked={elegida === String(f.id)}
                onChange={() => alElegir(String(f.id))}
                aria-label={`${foto}, ${i + 1} de ${fotos.length}`}
                data-invalido={error ? true : undefined}
                className="peer sr-only"
              />
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

/** Así se verá en la galería del sitio, con las elegidas: el par se compara como allí; sin antes, la foto sola. */
function AsiSeVera({ antes, despues, enTarjeta = true }: { antes: FotoOrden | null; despues: FotoOrden; enTarjeta?: boolean }) {
  return (
    <section aria-label="Así se verá" className={enTarjeta ? "tt-tarjeta-panel flex flex-col gap-3 p-4 sm:p-5" : "flex flex-col gap-3"}>
      <h2 className="tt-titulo-sub">Así se verá</h2>
      {antes ? (
        <ComparadorAntesDespues key={`${antes.id}-${despues.id}`} antes={antes} despues={despues} descripcion="Vista previa" marco sinAyuda sizes="(min-width: 1024px) 400px, 100vw" />
      ) : (
        <div className="aspect-[4/3] overflow-hidden rounded-sm bg-superficie">
          <Image src={despues.miniatura} alt="" width={despues.ancho ?? 640} height={despues.alto ?? 480} unoptimized className="size-full object-cover" />
        </div>
      )}
      <p className="text-sm text-tinta-suave">{antes ? "Antes y después: en el sitio se arrastra la línea para comparar." : "Sin foto de antes: en el sitio va la de después sola."}</p>
    </section>
  );
}
