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
