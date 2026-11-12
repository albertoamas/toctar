import Link from "next/link";
import { cn } from "cn";
import type { ServicioPublico } from "@/modulos/sitio/publico";
import { FotoOReemplazo } from "./foto-o-reemplazo";

// Componente TarjetaServicio del Design System (HU-10). Sin precios (RN-10). Toda la tarjeta se toca.
// `variante`, solo en la portada (pulido 13.53): "destacada" para los dos primeros servicios (en la computadora, grandes
// y con su resumen) y "mosaico" para los demás, más chicos. En el celular, todas en filas, como la lista de Servicios.
export function TarjetaServicio({ servicio, nivel = 3, variante }: { servicio: ServicioPublico; nivel?: 2 | 3; variante?: "destacada" | "mosaico" }) {
  const Titulo = nivel === 2 ? "h2" : "h3";
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
