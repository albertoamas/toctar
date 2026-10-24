"use client";

import Image from "next/image";
import { useId, useRef, useState } from "react";
import type { UrlsFoto } from "@/lib/fotos";

// Comparador de antes y después de la galería pública: una sola foto partida por una línea que se arrastra. A la
// izquierda de la línea, el antes; a la derecha, el después. El tirador es el paralelogramo rojo a 60° de la marca.
// - Con el dedo o el mouse: se arrastra de costado en cualquier punto de la foto, o se toca donde se quiere la línea.
//   Un gesto vertical desplaza la página y no mueve la línea (`touch-action: pan-y` y el umbral de abajo).
// - Con el teclado y el lector de pantalla: un deslizador nativo (oculto) que mueve la misma línea con las flechas.
// Las dos fotos se ven enteras (`object-contain`): si no tienen la misma forma, una queda con bordes, pero nunca recortada.
// El alto máximo sale de la variable `--alto-comparador` (70dvh si nadie la pone): la portada lo achica en el celular.

type Foto = Pick<UrlsFoto, "url" | "miniatura" | "ancho" | "alto">;

const INICIO = 50;
/** Píxeles de movimiento antes de decidir si el gesto es un arrastre de costado (línea) o un desplazamiento (página). */
const UMBRAL = 8;
/** Cerca del borde, la etiqueta de ese lado quedaría sobre la otra foto: se esconde (en % del ancho). */
const MARGEN_ETIQUETA = 15;

type Gesto = { id: number; x: number; y: number; arrastrando: boolean };

export function ComparadorAntesDespues({
  antes,
  despues,
  descripcion,
  conLeyenda = false,
  alFrente = false,
}: {
  antes: Foto;
  despues: Foto;
  descripcion: string;
  /** La descripción, visible debajo (la portada dice qué trabajo es; el visor ya lo dice en su título). */
  conLeyenda?: boolean;
  /**
   * Va arriba de la página (la portada): las fotos cargan sin esperar y, en el celular, en su versión chica (640 px):
   * la grande le quitaba red al texto (lo mismo que con la foto del taller, pulido 2.1).
   */
  alFrente?: boolean;
}) {
  const [corte, setCorte] = useState(INICIO);
  const caja = useRef<HTMLDivElement>(null);
  const gesto = useRef<Gesto | null>(null);
  const id = useId();
  // La caja toma la forma de la foto de después y nunca pasa del alto máximo
  const proporcion = (despues.ancho ?? 4) / (despues.alto ?? 3);

  function moverA(x: number) {
    const r = caja.current?.getBoundingClientRect();
    if (!r || r.width === 0) return;
    setCorte(Math.min(100, Math.max(0, ((x - r.left) / r.width) * 100)));
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        ref={caja}
        className="group relative mx-auto w-full cursor-ew-resize touch-pan-y overflow-hidden bg-superficie select-none"
        style={{ aspectRatio: proporcion, maxWidth: `calc(var(--alto-comparador, 70dvh) * ${proporcion})` }}
        onPointerDown={(e) => {
          // Solo el dedo principal o el botón izquierdo: el clic derecho (guardar la foto) o un segundo dedo no mueven nada
          if (!e.isPrimary || e.button !== 0) return;
          gesto.current = { id: e.pointerId, x: e.clientX, y: e.clientY, arrastrando: false };
        }}
        onPointerMove={(e) => {
          const g = gesto.current;
          if (!g || g.id !== e.pointerId) return;
          if (!g.arrastrando) {
            const dx = Math.abs(e.clientX - g.x);
            if (dx < UMBRAL || dx < Math.abs(e.clientY - g.y)) return;
            g.arrastrando = true;
            e.currentTarget.setPointerCapture(e.pointerId);
          }
          moverA(e.clientX);
        }}
        onPointerUp={(e) => {
          const g = gesto.current;
          gesto.current = null;
          // Un toque sin arrastre lleva la línea ahí
          if (g && g.id === e.pointerId && !g.arrastrando && Math.hypot(e.clientX - g.x, e.clientY - g.y) < UMBRAL) moverA(e.clientX);
        }}
        // El navegador tomó el gesto para desplazar la página: la línea no se toca
        onPointerCancel={() => (gesto.current = null)}
      >
        <FotoComparada foto={despues} alt={`Después: ${descripcion}`} alFrente={alFrente} className="object-contain" />
        {/* El antes encima, recortado hasta la línea */}
        <FotoComparada
          foto={antes}
          alt={`Antes: ${descripcion}`}
          alFrente={alFrente}
          className="bg-superficie object-contain"
          style={{ clipPath: `inset(0 ${100 - corte}% 0 0)` }}
        />
        {corte > MARGEN_ETIQUETA && <span aria-hidden className="absolute top-2 left-2 bg-negro/75 px-2 py-0.5 text-sm font-semibold text-blanco">Antes</span>}
        {corte < 100 - MARGEN_ETIQUETA && (
          <span aria-hidden className="absolute top-2 right-2 bg-negro/75 px-2 py-0.5 text-sm font-semibold text-blanco">Después</span>
        )}

        {/* El deslizador del teclado y el lector de pantalla: oculto; su foco se ve en el tirador (group-has) */}
        <input
          id={id}
          type="range"
          min={0}
          max={100}
          value={Math.round(corte)}
          onChange={(e) => setCorte(Number(e.target.value))}
          aria-label="Comparar antes y después"
          aria-valuetext={`Antes, hasta el ${Math.round(corte)} % de la foto`}
          aria-describedby={`${id}-ayuda`}
          className="sr-only"
        />
        {/* La línea, con un borde oscuro fino (ring) para que se lea sobre fotos claras */}
        <span aria-hidden className="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 bg-blanco ring-1 ring-negro/45" style={{ left: `${corte}%` }} />
        {/* El tirador: el corte a 60° de la marca (skew de 30°). En los bordes no se sale de la foto: queda entero adentro */}
        <span
          aria-hidden
          className="pointer-events-none absolute top-1/2 flex h-11 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center"
          style={{ left: `clamp(1.75rem, ${corte}%, calc(100% - 1.75rem))` }}
        >
          <span className="absolute inset-0 -skew-x-[30deg] bg-rojo outline-offset-2 outline-[var(--foco)] group-has-[input:focus-visible]:outline-2" />
          <span className="relative flex gap-1 text-lg leading-none font-bold text-blanco">
            <span>‹</span>
            <span>›</span>
          </span>
        </span>
      </div>
      <div className="flex flex-col items-center gap-0.5 text-center">
        {conLeyenda && <p className="font-semibold">{descripcion}</p>}
        <p id={`${id}-ayuda`} className="text-sm text-tinta-suave">
          Arrastra la línea para comparar
        </p>
      </div>
    </div>
  );
}

/** Una de las dos fotos, a todo el recuadro. Al frente, con `<picture>`: la chica en el celular, la grande desde 768 px. */
function FotoComparada({ foto, alt, alFrente, className, style }: { foto: Foto; alt: string; alFrente: boolean; className: string; style?: React.CSSProperties }) {
  if (!alFrente) return <Image src={foto.url} alt={alt} fill unoptimized draggable={false} className={className} style={style} />;
  return (
    <picture>
      <source media="(min-width: 768px)" srcSet={foto.url} />
      {/* <img> a mano: next/image no arma un <picture> con dos versiones */}
      <img src={foto.miniatura} alt={alt} draggable={false} className={`absolute inset-0 size-full ${className}`} style={style} />
    </picture>
  );
}
