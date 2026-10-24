import Image from "next/image";
import { useRef } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/componentes/ui/dialog";
import type { UrlsFoto } from "@/lib/fotos";

// Componente de cliente: se usa dentro de otros componentes de cliente (recibe funciones como props).
// Una foto en grande en el sitio público: la galería (HU-12, con el comparador si tiene antes) y las fotos propias de
// un servicio (pedido de la demo del 24/10). En oscuro, como el sitio. El foco entra por el título: si no, caería en
// lo primero que se enfoca adentro (el deslizador oculto del comparador), sin nada visible enfocado.

export function DialogoFoto({
  abierto,
  alCerrar,
  titulo,
  descripcion,
  children,
}: {
  abierto: boolean;
  alCerrar: () => void;
  titulo: string;
  descripcion?: string;
  children: React.ReactNode;
}) {
  const refTitulo = useRef<HTMLHeadingElement>(null);
  return (
    <Dialog open={abierto} onOpenChange={(abrir) => !abrir && alCerrar()}>
      {abierto && (
        <DialogContent
          initialFocus={refTitulo}
          data-theme="oscuro"
          className="max-h-[calc(100dvh-2rem)] gap-4 overflow-y-auto rounded-none bg-fondo p-4 text-tinta sm:max-w-5xl"
        >
          <div className="flex flex-col gap-1 pr-12">
            <DialogTitle ref={refTitulo} tabIndex={-1} className="font-heading text-2xl font-bold italic outline-none">
              {titulo}
            </DialogTitle>
            {descripcion && <DialogDescription className="text-tinta-suave">{descripcion}</DialogDescription>}
          </div>
          {children}
        </DialogContent>
      )}
    </Dialog>
  );
}

/** La foto entera, sin pasar del 75 % del alto de la pantalla. */
export function FotoGrande({ foto, alt }: { foto: UrlsFoto; alt: string }) {
  return (
    <figure>
      <Image src={foto.url} alt={alt} width={foto.ancho ?? 1600} height={foto.alto ?? 1200} unoptimized className="max-h-[75dvh] w-full bg-superficie object-contain" />
    </figure>
  );
}
