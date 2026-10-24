"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/componentes/ui/dialog";
import type { UrlsFoto } from "@/lib/fotos";

// Fotos propias de un servicio en su página (pedido de la demo del 24/10): una tira que se desliza de costado, con
// las fotos a la misma altura y cada una con su forma (un afiche vertical, una foto horizontal). Al tocar una se ve
// en grande: así un afiche se puede leer en el celular.

type FotoTira = { id: number; descripcion: string; foto: UrlsFoto };

export function TiraFotos({ fotos }: { fotos: FotoTira[] }) {
  const [abierta, setAbierta] = useState<FotoTira | null>(null);
  const titulo = useRef<HTMLHeadingElement>(null);

  return (
    <>
      {/* De borde a borde en el celular: la foto cortada en el borde avisa que hay más */}
      <ul aria-label="Fotos del servicio" className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-2 overflow-x-auto px-4 pb-2 md:mx-0 md:scroll-px-0 md:px-0">
        {fotos.map((f, i) => (
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
                loading={i < 2 ? "eager" : "lazy"}
                className="size-full object-cover"
              />
            </button>
          </li>
        ))}
      </ul>

      <Dialog open={!!abierta} onOpenChange={(abrir) => !abrir && setAbierta(null)}>
        {abierta && (
          <DialogContent
            initialFocus={titulo}
            data-theme="oscuro"
            className="max-h-[calc(100dvh-2rem)] gap-4 overflow-y-auto rounded-none bg-fondo p-4 text-tinta sm:max-w-4xl"
          >
            <DialogTitle ref={titulo} tabIndex={-1} className="pr-12 text-base font-semibold outline-none">
              {abierta.descripcion}
            </DialogTitle>
            <Image
              src={abierta.foto.url}
              alt={abierta.descripcion}
              width={abierta.foto.ancho ?? 1600}
              height={abierta.foto.alto ?? 1200}
              unoptimized
              className="max-h-[80dvh] w-full bg-superficie object-contain"
            />
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}
