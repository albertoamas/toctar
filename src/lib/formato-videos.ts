// Videos aceptados al subir (pedido 48: el de "Mira cómo trabajamos" en la portada). Archivo aparte de videos.ts para
// usarlo también en el navegador (el atributo accept y el tope antes de subir).

export const TIPOS_VIDEO = ["video/mp4", "video/webm"] as const;
export type TipoVideo = (typeof TIPOS_VIDEO)[number];

/** Tope de un video (RNF-07): 20 MB. Se cuenta en el servidor con lo que llega, no con lo que dice el navegador. */
export const BYTES_MAXIMOS_VIDEO = 20 * 1024 * 1024;

export const MENSAJE_VIDEO_PESADO = "El video pesa más de 20 MB. Usa uno más corto o guárdalo en menor calidad.";
export const MENSAJE_NO_ES_VIDEO = "Ese archivo no es un video MP4 o WebM.";

/**
 * Las marcas de MP4 de video (bytes 8 a 11). La caja `ftyp` también la tienen las fotos HEIC y AVIF del iPhone, el audio
 * M4A y el .mov de QuickTime (`qt  `, que no todos los navegadores reproducen): esas no.
 */
const MARCAS_MP4 = new Set(["isom", "iso2", "iso3", "iso4", "iso5", "iso6", "mp41", "mp42", "avc1", "M4V ", "mmp4", "dash"]);

/**
 * El tipo de un video por la firma de sus primeros bytes, o null si no es uno que se acepte. El tipo que dice el
 * navegador no basta: cualquiera puede mandar otra cosa con `video/mp4`.
 * - MP4: una caja `ftyp` al inicio (bytes 4 a 7) con una marca de video (`MARCAS_MP4`).
 * - WebM: la cabecera EBML `1A 45 DF A3`.
 */
export function tipoDeVideo(inicio: Uint8Array): TipoVideo | null {
  if (inicio.length >= 4 && inicio[0] === 0x1a && inicio[1] === 0x45 && inicio[2] === 0xdf && inicio[3] === 0xa3) return "video/webm";
  if (inicio.length < 12) return null;
  const texto = (desde: number, hasta: number) => String.fromCharCode(...inicio.subarray(desde, hasta));
  if (texto(4, 8) !== "ftyp") return null;
  return MARCAS_MP4.has(texto(8, 12)) ? "video/mp4" : null;
}
