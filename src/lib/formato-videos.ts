// Videos aceptados al subir (pedido 48: el de "Mira cómo trabajamos" en la portada). Archivo aparte de videos.ts para
// usarlo también en el navegador (el atributo accept y el tope antes de subir).

export type TipoVideo = "video/mp4" | "video/webm";

/**
 * Lo que ofrece el selector de archivos. Con `video/quicktime`: el iPhone entrega como .MOV el video que se elige de la
 * galería, también uno bajado de TikTok (revisión del 12/11). Lo que de verdad vale lo decide `revisarVideo`.
 */
export const ACEPTA_VIDEO = "video/mp4,video/quicktime,video/webm";

/** Tope de un video (RNF-07): 20 MB. Se cuenta en el servidor con lo que llega, no con lo que dice el navegador. */
export const BYTES_MAXIMOS_VIDEO = 20 * 1024 * 1024;

export const MENSAJE_VIDEO_PESADO = "El video pesa más de 20 MB. Usa uno más corto o guárdalo en menor calidad.";
export const MENSAJE_NO_ES_VIDEO = "Ese archivo no es un video. Elige un MP4 o MOV, como el que se baja de TikTok.";
export const MENSAJE_VIDEO_HEVC =
  "Ese video está en HEVC, el formato de la cámara del iPhone, y no se ve en todos los navegadores. Bájalo desde TikTok o, en el iPhone, elige Ajustes > Cámara > Formatos > Más compatible y grábalo de nuevo.";

/**
 * Las marcas de la caja `ftyp` de un video MP4 o MOV (bytes 8 a 11). La caja también la tienen las fotos HEIC y AVIF
 * del iPhone (`heic`, `mif1`, `avif`): esas no. El audio M4A se descarta después, porque no tiene pista de video.
 */
const MARCAS_VIDEO = new Set(["isom", "iso2", "iso3", "iso4", "iso5", "iso6", "mp41", "mp42", "avc1", "M4V ", "mmp4", "dash", "qt  "]);

/** H.264: lo reproducen todos los navegadores. HEVC (`hvc1`, `hev1`): Chrome en Windows y en muchos Android, no. */
const CODECS_H264 = new Set(["avc1", "avc3"]);
const CODECS_HEVC = new Set(["hvc1", "hev1"]);

const MAXIMO_CAJAS = 10_000;

type Caja = { tipo: string; desde: number; hasta: number };

const texto = (b: Uint8Array, desde: number, hasta: number) => String.fromCharCode(...b.subarray(desde, hasta));

/** Las cajas de un tramo del archivo (MP4 y MOV son cajas: tamaño, tipo y contenido). Si una está rota, corta ahí. */
function cajas(b: Uint8Array, desde: number, hasta: number): Caja[] {
  const vista = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const lista: Caja[] = [];
  let i = desde;
  while (i + 8 <= hasta && lista.length < MAXIMO_CAJAS) {
    let tamano = vista.getUint32(i);
    let cabecera = 8;
    if (tamano === 1) {
      if (i + 16 > hasta) break;
      tamano = Number(vista.getBigUint64(i + 8));
      cabecera = 16;
    } else if (tamano === 0) {
      tamano = hasta - i;
    }
    if (tamano < cabecera || i + tamano > hasta) break;
    lista.push({ tipo: texto(b, i + 4, i + 8), desde: i + cabecera, hasta: i + tamano });
    i += tamano;
  }
  return lista;
}

/** Los códecs de las pistas de video: el formato de cada entrada de `stsd` en las pistas cuyo `hdlr` dice `vide`. */
function codecsDeVideo(b: Uint8Array, moov: Caja): string[] {
  const codecs: string[] = [];
  for (const trak of cajas(b, moov.desde, moov.hasta).filter((c) => c.tipo === "trak")) {
    const mdia = cajas(b, trak.desde, trak.hasta).find((c) => c.tipo === "mdia");
    if (!mdia) continue;
    const enMdia = cajas(b, mdia.desde, mdia.hasta);
    const hdlr = enMdia.find((c) => c.tipo === "hdlr");
    // hdlr: versión y banderas (4), pre_defined (4), handler_type (4)
    if (!hdlr || hdlr.hasta - hdlr.desde < 12 || texto(b, hdlr.desde + 8, hdlr.desde + 12) !== "vide") continue;
    let actual: Caja | undefined = enMdia.find((c) => c.tipo === "minf");
    for (const siguiente of ["stbl", "stsd"]) actual = actual && cajas(b, actual.desde, actual.hasta).find((c) => c.tipo === siguiente);
    // stsd: versión y banderas (4), cantidad (4), y cada entrada con su tamaño (4) y su formato (4)
    if (actual && actual.hasta - actual.desde >= 16) codecs.push(texto(b, actual.desde + 12, actual.desde + 16));
  }
  return codecs;
}

export type RevisionVideo = { ok: true; tipo: TipoVideo } | { ok: false; mensaje: string };

/**
 * Si el archivo es un video que se puede mostrar en el sitio, y de qué tipo. El tipo que dice el navegador no basta:
 * cualquiera puede mandar otra cosa con `video/mp4`, y el iPhone manda como .MOV un video común.
 * - WebM: la cabecera EBML `1A 45 DF A3`.
 * - MP4 o MOV: sus cajas. Una `ftyp` de video (o, en un MOV viejo, ninguna) y una `moov` con alguna pista de video en
 *   H.264. Se guarda como `video/mp4`: un MOV con H.264 es el mismo formato por dentro y así lo reproduce todo navegador.
 * - En HEVC, se rechaza con su propio mensaje: es lo que graba la cámara del iPhone y no se ve en todos lados.
 */
export function revisarVideo(contenido: Uint8Array): RevisionVideo {
  const b = contenido;
  if (b.length >= 4 && b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) return { ok: true, tipo: "video/webm" };
  const raiz = cajas(b, 0, b.length);
  const ftyp = raiz.find((c) => c.tipo === "ftyp");
  const moov = raiz.find((c) => c.tipo === "moov");
  // Con ftyp, una marca de video; sin ella (un MOV viejo), que empiece como uno: moov, mdat o wide
  const marcaDeVideo = ftyp
    ? ftyp.hasta - ftyp.desde >= 4 && MARCAS_VIDEO.has(texto(b, ftyp.desde, ftyp.desde + 4))
    : ["moov", "mdat", "wide"].includes(raiz[0]?.tipo ?? "");
  if (!marcaDeVideo || !moov) return { ok: false, mensaje: MENSAJE_NO_ES_VIDEO };
  const codecs = codecsDeVideo(b, moov);
  if (codecs.some((c) => CODECS_H264.has(c))) return { ok: true, tipo: "video/mp4" };
  if (codecs.some((c) => CODECS_HEVC.has(c))) return { ok: false, mensaje: MENSAJE_VIDEO_HEVC };
  return { ok: false, mensaje: MENSAJE_NO_ES_VIDEO };
}
