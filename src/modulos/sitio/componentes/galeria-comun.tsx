"use client";

import Image from "next/image";

// Galería (HU-09): lo que comparten sus partes, los datos de un trabajo y su miniatura.

export type Foto = { url: string; miniatura: string; ancho: number | null; alto: number | null };

export type ItemGaleria = {
  id: number;
  servicioId: number;
  servicio: string;
  descripcion: string;
  visible: boolean;
  /** Visible y de un servicio que se ve en el sitio: solo así puede ir a la portada. */
  enSitio: boolean;
  antes: Foto | null;
  despues: Foto;
};

export type Servicio = { id: number; nombre: string };

export function Miniatura({ foto, alt, etiqueta }: { foto: Foto; alt: string; etiqueta?: string }) {
  return (
    <span className="relative block overflow-hidden bg-superficie">
      <Image src={foto.miniatura} alt={alt} width={foto.ancho ?? 640} height={foto.alto ?? 640} unoptimized className="absolute inset-0 size-full object-cover" />
      {etiqueta && <span className="absolute bottom-1 left-1 rounded-sm bg-negro/70 px-1.5 py-0.5 text-xs font-semibold text-blanco">{etiqueta}</span>}
    </span>
  );
}
