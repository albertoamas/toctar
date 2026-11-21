import Link from "next/link";
import { proporcionDe } from "@/lib/formato-fotos";
import { formaDelPar, nombreDelTrabajo } from "@/modulos/sitio/galeria";
import type { FotoGaleria } from "@/modulos/sitio/publico";
import { ComparadorAntesDespues } from "./comparador-antes-despues";
import { FotoResponsiva } from "./foto-responsiva";

/**
 * Un trabajo, en su tarjeta (como las de servicios): el par se compara en su recuadro (cuadrado si las fotos son
 * verticales, para que no queden franjas; de 4:3 si son horizontales, para no recortarles los costados), y en el
 * primero la línea se mueve sola un momento; la foto sola llena su recuadro de 4:3. Debajo, su servicio y "Ver el servicio", que lleva a su
 * página. La tarjeta no es un enlace entero: en un par, el toque es para la línea.
 */
export function TrabajoGaleria(props: {
  foto: FotoGaleria;
  alFrente: boolean;
  sizes: string;
  mostrarLinea?: boolean;
  /** En la página de su servicio no lleva "Ver el servicio": ya se está ahí. */
  sinEnlace?: boolean;
}) {
  const { foto: f, alFrente, sizes, mostrarLinea = false, sinEnlace = false } = props;
  const nombre = nombreDelTrabajo(f.descripcion, f.servicio.nombre);
  return (
    <figure className="tt-trabajo">
      <div className="tt-trabajo__media">
        {f.antes ? (
          <ComparadorAntesDespues
            antes={f.antes}
            despues={f.despues}
            descripcion={nombre}
            alFrente={alFrente}
            sizes={sizes}
            marco
            formaMarco={formaDelPar(proporcionDe(f.despues))}
            sinAyuda
            sola={mostrarLinea}
          />
        ) : (
          <div className="tt-trabajo__foto">
            <FotoResponsiva foto={f.despues} alt={nombre} sizes={sizes} cargaDiferida={!alFrente} className="size-full object-cover" />
          </div>
        )}
      </div>
      <figcaption className="tt-trabajo__cuerpo">
        {/* En su servicio, lo que dice el trabajo ("Toyota Corolla con …") en vez del nombre del servicio, que ya está arriba */}
        <span className="tt-trabajo__titulo">{sinEnlace ? nombreDelTrabajo(f.descripcion, f.servicio.nombre) : f.servicio.nombre}</span>
        {!sinEnlace && (
          <Link href={`/servicios/${f.servicio.slug}`} className="tt-trabajo__enlace" aria-label={`Ver el servicio: ${f.servicio.nombre}`}>
            Ver el servicio
          </Link>
        )}
      </figcaption>
    </figure>
  );
}
