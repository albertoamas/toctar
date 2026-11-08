"use client";

import Image from "next/image";
import { useState } from "react";
import { VisorFotos } from "@/componentes/panel/visor-fotos";
import type { UrlsFoto } from "@/lib/fotos";

// HU-32: la foto del comprobante de un pago, chica en la lista; al tocarla se ve en grande.

export function VerComprobante({ foto, descripcion }: { foto: UrlsFoto; descripcion: string }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="block size-11 shrink-0 cursor-zoom-in overflow-hidden rounded-sm bg-superficie focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--foco)]"
        aria-label={`Ver el comprobante: ${descripcion}`}
      >
        <Image src={foto.miniatura} alt="" width={foto.ancho ?? 640} height={foto.alto ?? 640} unoptimized className="size-full object-cover" />
      </button>
      <VisorFotos
        fotos={[{ url: foto.url, ancho: foto.ancho, alto: foto.alto, alt: `Comprobante: ${descripcion}` }]}
        abierta={abierto ? 0 : null}
        alCambiar={(i) => setAbierto(i !== null)}
        titulo={`Comprobante: ${descripcion}`}
      />
    </>
  );
}
