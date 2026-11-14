import type { UrlsFoto } from "@/lib/fotos";
import { srcSetFoto } from "@/lib/formato-fotos";

// Una foto del sitio con sus versiones (640, 1080 y la grande, de 1600): el navegador elige según el ancho que ocupa y
// la densidad de la pantalla, así un celular de alta densidad no la ve borrosa y uno común no baja de más. `<img>` a
// mano: las fotos se sirven sin el optimizador de Next (unoptimized en todo el sitio) y next/image no arma este srcSet.
// Todas con la misma calidad (WebP 85): cambia el tamaño, no la compresión.

export function FotoResponsiva({
  foto,
  alt,
  sizes,
  className,
  cargaDiferida = true,
}: {
  foto: UrlsFoto;
  alt: string;
  /** Qué ancho ocupa en la pantalla, como en el atributo `sizes` ("(min-width: 768px) 50vw, 100vw"). */
  sizes: string;
  className?: string;
  /** Debajo de la primera pantalla: carga al acercarse. */
  cargaDiferida?: boolean;
}) {
  const srcSet = srcSetFoto(foto);
  return (
    // eslint-disable-next-line @next/next/no-img-element -- ver arriba
    <img
      src={foto.miniatura}
      srcSet={srcSet}
      sizes={srcSet ? sizes : undefined}
      alt={alt}
      width={foto.ancho ?? undefined}
      height={foto.alto ?? undefined}
      loading={cargaDiferida ? "lazy" : undefined}
      className={className}
    />
  );
}
