import Image from "next/image";
import type { UrlsFoto } from "@/lib/fotos";
import { Monograma } from "./iconos-marca";

// Foto de un servicio, o la imagen de reemplazo de la marca si todavía no tiene (decisión del 14/10).
// Va dentro de un contenedor con proporción fija (la tarjeta, la cabecera del servicio).
export function FotoOReemplazo({ foto, alt, miniatura = false, prioridad = false }: { foto: UrlsFoto | null; alt: string; miniatura?: boolean; prioridad?: boolean }) {
  if (!foto) {
    return (
      <div className="tt-reemplazo">
        <Monograma />
      </div>
    );
  }
  return (
    <Image
      src={miniatura ? foto.miniatura : foto.url}
      alt={alt}
      width={foto.ancho ?? 1600}
      height={foto.alto ?? 1200}
      unoptimized
      loading={prioridad ? "eager" : "lazy"}
      fetchPriority={prioridad ? "high" : undefined}
      className="size-full object-cover"
    />
  );
}
