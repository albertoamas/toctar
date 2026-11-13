// Videos mínimos para las pruebas del pedido 48: las cajas de un MP4 o MOV (ftyp, moov con una pista de video y su
// códec, y mdat de relleno) que mira `revisarVideo`. No se reproducen, pero tienen la forma de uno de verdad.

/** Una caja: tamaño (4 bytes), tipo (4 letras) y su contenido. */
export function caja(tipo: string, ...contenido: Buffer[]): Buffer {
  const cuerpo = Buffer.concat(contenido);
  const cabecera = Buffer.alloc(8);
  cabecera.writeUInt32BE(8 + cuerpo.length, 0);
  cabecera.write(tipo, 4, "latin1");
  return Buffer.concat([cabecera, cuerpo]);
}

/** Una pista: `hdlr` con su tipo (vide o soun) y `stsd` con una entrada del códec. */
function pista(manejador: "vide" | "soun", codec: string): Buffer {
  const hdlr = caja("hdlr", Buffer.alloc(8), Buffer.from(manejador, "latin1"), Buffer.alloc(12));
  const entrada = caja(codec, Buffer.alloc(8));
  const stsd = caja("stsd", Buffer.from([0, 0, 0, 0, 0, 0, 0, 1]), entrada);
  return caja("trak", caja("mdia", hdlr, caja("minf", caja("stbl", stsd))));
}

/**
 * Un MP4 (marca `isom`) o un MOV del iPhone (marca `qt  `) con una pista de video en `codec` (avc1 es H.264, hvc1 es
 * HEVC) y una de audio. `relleno`: bytes de más en mdat, para probar el tope.
 */
export function videoDePrueba({ marca = "isom", codec = "avc1", relleno = 2048 }: { marca?: string; codec?: string; relleno?: number } = {}): Buffer {
  const ftyp = caja("ftyp", Buffer.from(marca, "latin1"), Buffer.alloc(4), Buffer.from(marca, "latin1"));
  const moov = caja("moov", pista("vide", codec), pista("soun", "mp4a"));
  return Buffer.concat([ftyp, moov, caja("mdat", Buffer.alloc(relleno))]);
}

/** Un audio M4A: tiene ftyp y moov, pero ninguna pista de video. */
export function audioDePrueba(): Buffer {
  const ftyp = caja("ftyp", Buffer.from("M4A ", "latin1"), Buffer.alloc(4), Buffer.from("isom", "latin1"));
  return Buffer.concat([ftyp, caja("moov", pista("soun", "mp4a")), caja("mdat", Buffer.alloc(512))]);
}
