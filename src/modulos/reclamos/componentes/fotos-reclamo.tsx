"use client";

import Image from "next/image";
import { useState } from "react";
import { VisorFotos } from "@/componentes/panel/visor-fotos";
import type { UrlsFoto } from "@/lib/fotos";

// HU-17: fotos del reclamo; al tocar una se ve en grande, y desde ahí se pasa a las demás (pulido 13.16).

export function FotosReclamo({ fotos }: { fotos: UrlsFoto[] }) {
  const [abierta, setAbierta] = useState<number | null>(null);

  return (
    <>
      <ul aria-label="Fotos del reclamo" className="flex flex-wrap gap-3">
        {fotos.map((f, i) => (
          <li key={f.url}>
            <button
              type="button"
              onClick={() => setAbierta(i)}
              className="block size-32 cursor-zoom-in overflow-hidden rounded-sm bg-superficie focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--foco)]"
              aria-label={`Ampliar la foto ${i + 1}`}
            >
              <Image src={f.miniatura} alt="" width={f.ancho ?? 640} height={f.alto ?? 640} unoptimized className="size-full object-cover" />
            </button>
          </li>
        ))}
      </ul>
      <VisorFotos
        fotos={fotos.map((f, i) => ({ url: f.url, ancho: f.ancho, alto: f.alto, alt: `Foto ${i + 1} del reclamo` }))}
        abierta={abierta}
        alCambiar={setAbierta}
        titulo="Reclamo"
      />
    </>
  );
}
