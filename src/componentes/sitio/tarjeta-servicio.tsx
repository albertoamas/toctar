import Link from "next/link";
import { cn } from "cn";
import { ArrowRightIcon } from "lucide-react";
import type { ServicioPublico } from "@/modulos/sitio/publico";
import { FotoOReemplazo } from "./foto-o-reemplazo";

// Componente TarjetaServicio del Design System (HU-10). Sin precios (RN-10). Toda la tarjeta se toca.
// `variante`, solo en la portada (pulido 13.53): "destacada" para los dos primeros servicios (en la computadora, grandes
// y con su resumen) y "mosaico" para los demás; en el celular, las dos van del mismo tamaño en dos columnas, con su foto
// y su nombre. Sin variante, la tarjeta de siempre (la lista de Servicios: en el celular, en filas).
// "foto" (pulido de Servicios, 21/11): la foto entera con el nombre encima, sobre un degradado oscuro, y una flecha en vez
// de "Ver el servicio" repetido; `principal`, la primera de la lista, más grande y con su resumen. La lista de Servicios y
// "Otros servicios" al pie de cada servicio.
export function TarjetaServicio(props: { servicio: ServicioPublico; nivel?: 2 | 3; variante?: "destacada" | "mosaico" | "foto"; principal?: boolean }) {
  const { servicio, nivel = 3, variante, principal = false } = props;
  const Titulo = nivel === 2 ? "h2" : "h3";
  if (variante === "foto")
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
  return (
    <article className={cn("tt-tarjeta", variante && "tt-tarjeta--portada", variante === "destacada" && "tt-tarjeta--destacada")}>
      <div className="tt-tarjeta__media">
        <FotoOReemplazo foto={servicio.foto} alt={servicio.nombre} miniatura />
      </div>
      <div className="tt-tarjeta__cuerpo">
        <Titulo className="tt-tarjeta__titulo">{servicio.nombre}</Titulo>
        <p className="tt-tarjeta__resumen">{servicio.resumen}</p>
        {/* El nombre accesible empieza con el texto visible (WCAG 2.5.3) y dice de qué servicio es. */}
        <Link href={`/servicios/${servicio.slug}`} className="tt-tarjeta__enlace" aria-label={`Ver el servicio: ${servicio.nombre}`}>
          Ver el servicio
        </Link>
      </div>
    </article>
  );
}
