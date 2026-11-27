"use client";

import { useState } from "react";
import { cn } from "cn";
import { VisorFotos, type FotoVisor } from "@/componentes/panel/visor-fotos";

/**
 * Una miniatura que abre el visor, para las pantallas del servidor ("Cómo llegó", la firma): cada una lleva todas las
 * fotos de su grupo, así desde cualquiera se pasa a las demás.
 */
export function AbrirFoto(props: { fotos: FotoVisor[]; indice: number; titulo: string; etiqueta: string; className?: string; children: React.ReactNode }) {
  const [abierta, setAbierta] = useState<number | null>(null);
  return (
    <>
      <button
        type="button"
        onClick={() => setAbierta(props.indice)}
        aria-label={props.etiqueta}
        className={cn("cursor-zoom-in focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--foco)]", props.className)}
      >
        {props.children}
      </button>
      <VisorFotos fotos={props.fotos} abierta={abierta} alCambiar={setAbierta} titulo={props.titulo} />
    </>
  );
}
