"use client";

import Image from "next/image";
import { useState } from "react";
import type { UrlsFoto } from "@/lib/fotos";
import { ComparadorAntesDespues } from "./comparador-antes-despues";
import { DialogoFoto, FotoGrande } from "./dialogo-foto";

// Galería pública (HU-12): grilla de miniaturas; al tocar una se abre en grande. Si tiene antes y después, en el
// comparador: una sola foto partida por una línea que se arrastra (pedido del 24/10). El diálogo es el mismo de las
// fotos propias de un servicio (dialogo-foto.tsx).

/** Columnas de la grilla en la computadora (lg:grid-cols-4): las fotos de la primera fila se ven al entrar. */
const FOTOS_PRIMERA_FILA = 4;

export type FotoVisor = { id: number; descripcion: string; servicio: string; antes: UrlsFoto | null; despues: UrlsFoto };

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

      <DialogoFoto abierto={!!abierta} alCerrar={() => setAbierta(null)} titulo={abierta?.servicio ?? ""} descripcion={abierta?.descripcion}>
        {abierta &&
          (abierta.antes ? (
            <ComparadorAntesDespues antes={abierta.antes} despues={abierta.despues} descripcion={abierta.descripcion} />
          ) : (
            <FotoGrande foto={abierta.despues} alt={abierta.descripcion} />
          ))}
      </DialogoFoto>
    </>
  );
}
