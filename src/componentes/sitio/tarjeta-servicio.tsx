import Link from "next/link";
import type { ServicioPublico } from "@/modulos/sitio/publico";
import { FotoOReemplazo } from "./foto-o-reemplazo";

// Componente TarjetaServicio del Design System (HU-10). Sin precios (RN-10). Toda la tarjeta se toca.
export function TarjetaServicio({ servicio, nivel = 3 }: { servicio: ServicioPublico; nivel?: 2 | 3 }) {
  const Titulo = nivel === 2 ? "h2" : "h3";
  return (
    <article className="tt-tarjeta">
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
