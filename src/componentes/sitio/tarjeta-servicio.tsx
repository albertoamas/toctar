import Link from "next/link";
import { cn } from "cn";
import { ArrowRightIcon } from "lucide-react";
import type { ServicioPublico } from "@/modulos/sitio/publico";
import { FotoOReemplazo } from "./foto-o-reemplazo";

// Componente TarjetaServicio del Design System (HU-10). Sin precios (RN-10). Toda la tarjeta se toca.
// Una sola en todo el sitio (pulido de Servicios, 21/11): la portada, la lista de Servicios y "Otros servicios" al pie de
// cada servicio. La foto entera con el nombre encima, sobre un degradado oscuro, y una flecha en la esquina (antes, una
// caja gris con "Ver el servicio" repetido, y otra distinta en la portada). `principal`, más grande y con su resumen: el
// primero de la lista y los dos primeros de la portada.
export function TarjetaServicio({ servicio, nivel = 3, principal = false }: { servicio: ServicioPublico; nivel?: 2 | 3; principal?: boolean }) {
  const Titulo = nivel === 2 ? "h2" : "h3";
  return (
    <article className={cn("tt-tarjeta tt-tarjeta--foto", principal && "tt-tarjeta--principal")}>
      <div className="tt-tarjeta__media">
        <FotoOReemplazo foto={servicio.foto} alt="" miniatura={!principal} />
      </div>
      <div className="tt-tarjeta__cuerpo">
        <Titulo className="tt-tarjeta__titulo">{servicio.nombre}</Titulo>
        <p className="tt-tarjeta__resumen">{servicio.resumen}</p>
        <span aria-hidden className="tt-tarjeta__flecha">
          <ArrowRightIcon className="size-5" />
        </span>
      </div>
      {/* Fuera del cuerpo: así cubre toda la tarjeta y no solo el texto */}
      <Link href={`/servicios/${servicio.slug}`} className="tt-tarjeta__enlace" aria-label={`Ver el servicio: ${servicio.nombre}`} />
    </article>
  );
}
