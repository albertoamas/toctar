"use client";

import Image from "next/image";
import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/componentes/ui/dialog";
import type { UrlsFoto } from "@/lib/fotos";

// HU-17: fotos del reclamo; al tocar una se ve en grande.

export function FotosReclamo({ fotos }: { fotos: UrlsFoto[] }) {
  const [abierta, setAbierta] = useState<number | null>(null);
  const foto = abierta === null ? null : fotos[abierta];

  return (
    <>
      <ul aria-label="Fotos del reclamo" className="flex flex-wrap gap-3">
        {fotos.map((f, i) => (
          <li key={f.url}>
            <button
              type="button"
              onClick={() => setAbierta(i)}
              className="block size-32 overflow-hidden rounded-sm bg-superficie focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--foco)]"
              aria-label={`Ampliar la foto ${i + 1}`}
            >
              <Image src={f.miniatura} alt="" width={f.ancho ?? 640} height={f.alto ?? 640} unoptimized className="size-full object-cover" />
            </button>
          </li>
        ))}
      </ul>
      <Dialog open={foto !== null} onOpenChange={(abrir) => !abrir && setAbierta(null)}>
        {foto && (
          <DialogContent className="max-h-[calc(100dvh-2rem)] gap-4 overflow-y-auto p-4 sm:max-w-4xl">
            <DialogTitle>Foto {abierta! + 1} de {fotos.length}</DialogTitle>
            <Image src={foto.url} alt={`Foto ${abierta! + 1} del reclamo`} width={foto.ancho ?? 1600} height={foto.alto ?? 1200} unoptimized className="max-h-[75dvh] w-full bg-superficie object-contain" />
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}
