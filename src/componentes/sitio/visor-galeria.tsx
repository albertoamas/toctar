"use client";

import Image from "next/image";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/componentes/ui/dialog";

// Galería pública (HU-12): grilla de miniaturas; al tocar una se abre el antes y el después en grande.
// Es el único componente de cliente del sitio.

type Foto = { url: string; miniatura: string; ancho: number | null; alto: number | null };
export type FotoVisor = { id: number; descripcion: string; servicio: string; antes: Foto | null; despues: Foto };

export function VisorGaleria({ fotos }: { fotos: FotoVisor[] }) {
  const [abierta, setAbierta] = useState<FotoVisor | null>(null);

  return (
    <>
      <ul aria-label="Fotos de trabajos" className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4">
        {fotos.map((f) => (
          <li key={f.id}>
            <button
              type="button"
              onClick={() => setAbierta(f)}
              className="group relative block aspect-square w-full overflow-hidden bg-superficie focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--foco)]"
              aria-label={`Ampliar: ${f.descripcion}`}
            >
              <Image src={f.despues.miniatura} alt="" width={f.despues.ancho ?? 640} height={f.despues.alto ?? 640} unoptimized loading="lazy" className="size-full object-cover" />
              {f.antes && <span className="absolute bottom-2 left-2 bg-negro/75 px-2 py-0.5 text-xs font-semibold text-blanco">Antes y después</span>}
            </button>
          </li>
        ))}
      </ul>

      <Dialog open={!!abierta} onOpenChange={(abrir) => !abrir && setAbierta(null)}>
        {abierta && (
          <DialogContent data-theme="oscuro" className="max-h-[calc(100dvh-2rem)] gap-4 overflow-y-auto rounded-none bg-fondo p-4 text-tinta sm:max-w-5xl">
            <div className="flex flex-col gap-1 pr-8">
              <DialogTitle className="font-heading text-2xl font-bold italic">{abierta.servicio}</DialogTitle>
              <DialogDescription className="text-tinta-suave">{abierta.descripcion}</DialogDescription>
            </div>
            <div className={abierta.antes ? "grid gap-2 md:grid-cols-2" : ""}>
              {abierta.antes && <FotoGrande foto={abierta.antes} alt={`Antes: ${abierta.descripcion}`} etiqueta="Antes" />}
              <FotoGrande foto={abierta.despues} alt={abierta.antes ? `Después: ${abierta.descripcion}` : abierta.descripcion} etiqueta={abierta.antes ? "Después" : undefined} />
            </div>
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}

function FotoGrande({ foto, alt, etiqueta }: { foto: Foto; alt: string; etiqueta?: string }) {
  return (
    <figure className="relative">
      <Image src={foto.url} alt={alt} width={foto.ancho ?? 1600} height={foto.alto ?? 1200} unoptimized className="max-h-[70dvh] w-full bg-superficie object-contain" />
      {etiqueta && <figcaption className="absolute top-2 left-2 bg-negro/75 px-2 py-0.5 text-sm font-semibold text-blanco">{etiqueta}</figcaption>}
    </figure>
  );
}
