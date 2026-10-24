"use client";

import Image from "next/image";
import { useState } from "react";
import type { UrlsFoto } from "@/lib/fotos";
import { DialogoFoto, FotoGrande } from "./dialogo-foto";

// Fotos propias de un servicio en su página (pedido de la demo del 24/10): una tira que se desliza de costado, con
// las fotos a la misma altura y cada una con su forma (un afiche vertical, una foto horizontal). Al tocar una se ve
// en grande (el mismo diálogo de la galería): así un afiche se puede leer en el celular. Va debajo de los beneficios,
// nunca en la primera pantalla: las fotos cargan al acercarse.

type FotoTira = { id: number; descripcion: string; foto: UrlsFoto };

export function TiraFotos({ fotos }: { fotos: FotoTira[] }) {
  const [abierta, setAbierta] = useState<FotoTira | null>(null);

  return (
    <>
      {/* De borde a borde en el celular: la foto cortada en el borde avisa que hay más */}
      <ul aria-label="Fotos del servicio" className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-2 overflow-x-auto px-4 pb-2 md:mx-0 md:scroll-px-0 md:px-0">
        {fotos.map((f) => (
          <li key={f.id} className="shrink-0 snap-start">
            <button
              type="button"
              onClick={() => setAbierta(f)}
              aria-label={`Ampliar: ${f.descripcion}`}
              className="block h-64 bg-superficie focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--foco)] md:h-80"
              style={{ aspectRatio: (f.foto.ancho ?? 4) / (f.foto.alto ?? 3) }}
            >
              <Image
                src={f.foto.miniatura}
                alt=""
                width={f.foto.ancho ?? 640}
                height={f.foto.alto ?? 480}
                unoptimized
                loading="lazy"
                className="size-full object-cover"
              />
            </button>
          </li>
        ))}
      </ul>

      <DialogoFoto abierto={!!abierta} alCerrar={() => setAbierta(null)} titulo={abierta?.descripcion ?? ""}>
        {abierta && <FotoGrande foto={abierta.foto} alt={abierta.descripcion} />}
      </DialogoFoto>
    </>
  );
}
