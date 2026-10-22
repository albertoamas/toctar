"use client";

import Image from "next/image";
import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/componentes/ui/dialog";
import type { UrlsFoto } from "@/lib/fotos";

// HU-32: la foto del comprobante de un pago, chica en la lista; al tocarla se ve en grande.

export function VerComprobante({ foto, descripcion }: { foto: UrlsFoto; descripcion: string }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="block size-11 shrink-0 overflow-hidden rounded-sm bg-superficie focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--foco)]"
        aria-label={`Ver el comprobante: ${descripcion}`}
      >
        <Image src={foto.miniatura} alt="" width={foto.ancho ?? 640} height={foto.alto ?? 640} unoptimized className="size-full object-cover" />
      </button>
      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] gap-4 overflow-y-auto p-4 sm:max-w-3xl">
          <DialogTitle>Comprobante: {descripcion}</DialogTitle>
          <Image src={foto.url} alt={`Comprobante: ${descripcion}`} width={foto.ancho ?? 1600} height={foto.alto ?? 1200} unoptimized className="max-h-[75dvh] w-full bg-superficie object-contain" />
        </DialogContent>
      </Dialog>
    </>
  );
}
