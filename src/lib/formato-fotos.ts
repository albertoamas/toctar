// Formatos de foto aceptados al subir. Archivo aparte de fotos.ts para usarlo también en el navegador
// (atributo accept de los campos de archivo).
export const TIPOS_FOTO = ["image/png", "image/jpeg", "image/webp"] as const;
export const BYTES_MAXIMOS_FOTO = 5 * 1024 * 1024;

type Medidas = { ancho: number | null; alto: number | null };

/** Ancho sobre alto de una foto guardada; sin medidas (fotos viejas), 4:3. La usan las cajas que toman su forma. */
export function proporcionDe(foto: Medidas): number {
  return (foto.ancho ?? 4) / (foto.alto ?? 3);
}

/** Si dos fotos tienen la misma forma, con 5 % de tolerancia: recortadas igual, coinciden en el comparador. */
export function tienenMismaForma(a: Medidas, b: Medidas): boolean {
  return Math.abs(proporcionDe(a) / proporcionDe(b) - 1) < 0.05;
}

/** Vertical solo si se sabe: una foto vieja sin medidas no avisa de más. */
export function esVertical(foto: Medidas): boolean {
  return foto.ancho !== null && foto.alto !== null && foto.ancho < foto.alto;
}

export const MENSAJE_NO_ES_FOTO = "Eso no es una foto. Elige un JPG, PNG o WebP.";

/**
 * De lo elegido o soltado, solo las fotos. El formato exacto lo revisa el servidor: una HEIC puede llegar convertida, y
 * algunos celulares no dicen el tipo (vacío): esa también pasa, y decide él.
 */
export function soloFotos<T extends { type: string }>(archivos: T[]): T[] {
  return archivos.filter((a) => !a.type || a.type.startsWith("image/"));
}

export const AVISO_FOTO_VERTICAL = "Esta foto es vertical: se va a recortar arriba y abajo. Mejor sácala con el celular acostado.";
export const AVISO_FORMAS_DISTINTAS = "Las dos fotos tienen distinta forma: van a quedar con bandas a los costados. Mejor sácalas igual.";

/** Los avisos de las fotos elegidas para la galería (estándar del 06/11). Sin medidas todavía, no avisa. */
export function avisosDeGaleria(antes: Medidas | null, despues: Medidas | null): string[] {
  const avisos: string[] = [];
  if ((antes && esVertical(antes)) || (despues && esVertical(despues))) avisos.push(AVISO_FOTO_VERTICAL);
  if (antes && despues && !tienenMismaForma(antes, despues)) avisos.push(AVISO_FORMAS_DISTINTAS);
  return avisos;
}

/** Las direcciones de una foto que necesita `srcSetFoto` (las de `UrlsFoto`, src/lib/fotos.ts). */
type VersionesFoto = { url: string; miniatura: string; mediana?: string; ancho: number | null; alto: number | null };

/** El ancho de la versión de `lado` px de lado mayor (sharp con `fit: inside`); sin medidas, el lado. */
function anchoDeVersion(foto: VersionesFoto, lado: number): number {
  if (!foto.ancho || !foto.alto) return lado;
  return Math.round(foto.ancho * Math.min(1, lado / Math.max(foto.ancho, foto.alto)));
}

/**
 * Las versiones de una foto del sitio para el atributo `srcSet`: la de 640, la de 1080 si la tiene (pulido de
 * rendimiento, 13/11: un celular de alta densidad bajaba la de 1600, más del doble de lo que muestra) y la grande. Todas
 * con la misma calidad (WebP 85): cambia el tamaño, no la compresión. Sin miniatura, nada: la foto va sola.
 */
export function srcSetFoto(foto: VersionesFoto): string | undefined {
  if (foto.miniatura === foto.url) return undefined;
  // El descriptor es el ANCHO real de cada versión: 640 y 1080 son su lado mayor, y en una foto vertical el ancho es menor
  return [`${foto.miniatura} ${anchoDeVersion(foto, 640)}w`, foto.mediana && `${foto.mediana} ${anchoDeVersion(foto, 1080)}w`, `${foto.url} ${foto.ancho ?? 1600}w`]
    .filter(Boolean)
    .join(", ");
}
