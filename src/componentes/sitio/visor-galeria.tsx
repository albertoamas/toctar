"use client";

import Image from "next/image";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/componentes/ui/dialog";
import { ComparadorAntesDespues } from "./comparador-antes-despues";

// Galería pública (HU-12): grilla de miniaturas; al tocar una se abre en grande. Si tiene antes y después, en el
// comparador: una sola foto partida por una línea que se arrastra (pedido del 24/10). Con el comparador, es lo único
// de cliente del sitio.

type Foto = { url: string; miniatura: string; ancho: number | null; alto: number | null };
/** Columnas de la grilla en la computadora (lg:grid-cols-4): las fotos de la primera fila se ven al entrar. */
const FOTOS_PRIMERA_FILA = 4;

export type FotoVisor = { id: number; descripcion: string; servicio: string; antes: Foto | null; despues: Foto };

export function VisorGaleria({ fotos }: { fotos: FotoVisor[] }) {
  const [abierta, setAbierta] = useState<FotoVisor | null>(null);

  return (
    <>
      <ul aria-label="Fotos de trabajos" className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4">
        {fotos.map((f, i) => (
          <li key={f.id}>
            <button
              type="button"
              onClick={() => setAbierta(f)}
              className="group relative block aspect-square w-full overflow-hidden bg-superficie focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--foco)]"
              aria-label={`Ampliar: ${f.descripcion}`}
            >
              {/* La primera fila (hasta 4 fotos) se ve al entrar: va sin carga diferida, y la primera con prioridad alta
                  porque es lo más grande de la pantalla en el celular (Lighthouse la marcaba como LCP demorado). */}
              <Image
                src={f.despues.miniatura}
                alt=""
                width={f.despues.ancho ?? 640}
                height={f.despues.alto ?? 640}
                unoptimized
                loading={i < FOTOS_PRIMERA_FILA ? "eager" : "lazy"}
                fetchPriority={i === 0 ? "high" : undefined}
                className="size-full object-cover"
              />
              {f.antes && <span className="absolute bottom-2 left-2 bg-negro/75 px-2 py-0.5 text-xs font-semibold text-blanco">Antes y después</span>}
            </button>
          </li>
        ))}
      </ul>

      <Dialog open={!!abierta} onOpenChange={(abrir) => !abrir && setAbierta(null)}>
        {abierta && (
          <DialogContent data-theme="oscuro" className="max-h-[calc(100dvh-2rem)] gap-4 overflow-y-auto rounded-none bg-fondo p-4 text-tinta sm:max-w-5xl">
            <div className="flex flex-col gap-1 pr-12">
              <DialogTitle className="font-heading text-2xl font-bold italic">{abierta.servicio}</DialogTitle>
              <DialogDescription className="text-tinta-suave">{abierta.descripcion}</DialogDescription>
            </div>
            {abierta.antes ? (
              <ComparadorAntesDespues antes={abierta.antes} despues={abierta.despues} descripcion={abierta.descripcion} />
            ) : (
              <FotoGrande foto={abierta.despues} alt={abierta.descripcion} />
            )}
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}

function FotoGrande({ foto, alt }: { foto: Foto; alt: string }) {
  return (
    <figure>
      <Image src={foto.url} alt={alt} width={foto.ancho ?? 1600} height={foto.alto ?? 1200} unoptimized className="max-h-[75dvh] w-full bg-superficie object-contain" />
    </figure>
  );
}
