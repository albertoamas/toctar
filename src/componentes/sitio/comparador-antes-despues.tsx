"use client";

import Image from "next/image";
import { useId, useRef, useState } from "react";

// Comparador de antes y después de la galería pública: una sola foto partida por una línea que se arrastra. A la
// izquierda de la línea, el antes; a la derecha, el después. El tirador es el paralelogramo rojo a 60° de la marca.
// - Con el dedo o el mouse: se arrastra en cualquier punto de la foto. `touch-action: pan-y` deja desplazar la página
//   hacia arriba y abajo; solo el gesto de costado mueve la línea.
// - Con el teclado y el lector de pantalla: un deslizador nativo (oculto) que mueve la misma línea con las flechas.

type Foto = { url: string; ancho: number | null; alto: number | null };

const INICIO = 50;

export function ComparadorAntesDespues({ antes, despues, descripcion }: { antes: Foto; despues: Foto; descripcion: string }) {
  const [corte, setCorte] = useState(INICIO);
  const caja = useRef<HTMLDivElement>(null);
  const id = useId();
  // La caja toma la forma de la foto de después (las dos se recortan igual) y nunca pasa del 70 % del alto de la pantalla
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
        style={{ aspectRatio: proporcion, maxWidth: `calc(70dvh * ${proporcion})` }}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          moverA(e.clientX);
        }}
        onPointerMove={(e) => {
          if (e.currentTarget.hasPointerCapture(e.pointerId)) moverA(e.clientX);
        }}
      >
        <Image src={despues.url} alt={`Después: ${descripcion}`} fill sizes="(min-width: 64rem) 64rem, 100vw" unoptimized draggable={false} className="object-cover" />
        {/* El antes encima, recortado hasta la línea */}
        <Image
          src={antes.url}
          alt={`Antes: ${descripcion}`}
          fill
          sizes="(min-width: 64rem) 64rem, 100vw"
          unoptimized
          draggable={false}
          className="object-cover"
          style={{ clipPath: `inset(0 ${100 - corte}% 0 0)` }}
        />
        <span aria-hidden className="absolute top-2 left-2 bg-negro/75 px-2 py-0.5 text-sm font-semibold text-blanco">Antes</span>
        <span aria-hidden className="absolute top-2 right-2 bg-negro/75 px-2 py-0.5 text-sm font-semibold text-blanco">Después</span>

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
        <div aria-hidden className="pointer-events-none absolute inset-y-0 w-0" style={{ left: `${corte}%` }}>
          {/* La línea, con un borde oscuro fino para que se lea sobre fotos claras */}
          <span className="absolute inset-y-0 -left-px w-0.5 bg-blanco shadow-[0_0_0_1px_rgb(0_0_0/0.45)]" />
          {/* El tirador: el corte a 60° de la marca (skew de 30°), con las dos flechas derechas */}
          <span className="absolute top-1/2 left-0 flex h-11 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center">
            <span className="absolute inset-0 -skew-x-[30deg] bg-rojo outline-offset-2 outline-[var(--foco)] group-has-[input:focus-visible]:outline-2" />
          </span>
          <span className="absolute top-1/2 left-0 flex -translate-x-1/2 -translate-y-1/2 items-center gap-1 text-lg leading-none font-bold text-blanco">
            <span>‹</span>
            <span>›</span>
          </span>
        </div>
      </div>
      <p id={`${id}-ayuda`} className="text-center text-sm text-tinta-suave">
        Arrastra la línea para comparar
      </p>
    </div>
  );
}
