import { describe, expect, it } from "vitest";
import { MENSAJE_NO_ES_VIDEO, MENSAJE_VIDEO_FORMATO, MENSAJE_VIDEO_HEVC, revisarVideo } from "@/lib/formato-videos";
import { audioDePrueba, caja, videoDePrueba } from "../videos-de-prueba";

// Pedido 48: el servidor mira qué es el archivo por dentro, no lo que dice el navegador. Revisión del 12/11: el iPhone
// entrega como .MOV el video elegido de la galería (también uno bajado de TikTok), y vale si va en H.264.

const bytes = (...partes: (string | number[])[]) =>
  new Uint8Array(partes.flatMap((p) => (typeof p === "string" ? [...p].map((c) => c.charCodeAt(0)) : p)));

describe("revisarVideo", () => {
  it("acepta un MP4 en H.264", () => {
    expect(revisarVideo(videoDePrueba())).toEqual({ ok: true, tipo: "video/mp4" });
    expect(revisarVideo(videoDePrueba({ marca: "mp42", codec: "avc3" }))).toEqual({ ok: true, tipo: "video/mp4" });
  });

  it("acepta el .MOV del iPhone en H.264, y lo guarda como MP4", () => {
    expect(revisarVideo(videoDePrueba({ marca: "qt  " }))).toEqual({ ok: true, tipo: "video/mp4" });
  });

  it("acepta un H.264 de otras cámaras o del Android viejo (3GP)", () => {
    for (const marca of ["3gp4", "3gp5", "MSNV", "XAVC", "M4VP"]) expect(revisarVideo(videoDePrueba({ marca })), marca).toEqual({ ok: true, tipo: "video/mp4" });
  });

  it("acepta un MOV viejo sin caja ftyp, empiece con la caja que empiece", () => {
    const sinFtyp = videoDePrueba().subarray(caja("ftyp", Buffer.alloc(12)).length);
    expect(revisarVideo(sinFtyp)).toEqual({ ok: true, tipo: "video/mp4" });
    expect(revisarVideo(Buffer.concat([caja("free", Buffer.alloc(16)), sinFtyp]))).toEqual({ ok: true, tipo: "video/mp4" });
  });

  it("acepta un WebM por su cabecera EBML", () => {
    expect(revisarVideo(bytes([0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42]))).toEqual({ ok: true, tipo: "video/webm" });
  });

  it("rechaza un video en HEVC (la cámara del iPhone) con su propio mensaje", () => {
    expect(revisarVideo(videoDePrueba({ marca: "qt  ", codec: "hvc1" }))).toEqual({ ok: false, mensaje: MENSAJE_VIDEO_HEVC });
    expect(revisarVideo(videoDePrueba({ codec: "hev1" }))).toEqual({ ok: false, mensaje: MENSAJE_VIDEO_HEVC });
  });

  it("un video en otro códec (ProRes, AV1, VP9) dice que el formato no se ve en todos lados", () => {
    for (const codec of ["apcn", "av01", "vp09"]) expect(revisarVideo(videoDePrueba({ marca: "qt  ", codec })), codec).toEqual({ ok: false, mensaje: MENSAJE_VIDEO_FORMATO });
  });

  it("rechaza lo que tiene ftyp sin ser un video: fotos HEIC o AVIF y audio M4A", () => {
    for (const marca of ["heic", "mif1", "avif"]) expect(revisarVideo(videoDePrueba({ marca })), marca).toEqual({ ok: false, mensaje: MENSAJE_NO_ES_VIDEO });
    expect(revisarVideo(audioDePrueba())).toEqual({ ok: false, mensaje: MENSAJE_NO_ES_VIDEO });
  });

  it("rechaza una caja ftyp sola, una foto, un texto o un archivo vacío", () => {
    expect(revisarVideo(bytes([0, 0, 0, 0x14], "ftypisom", [0, 0, 0, 0], "isom")).ok).toBe(false);
    expect(revisarVideo(bytes([0x89], "PNG", [0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0])).ok).toBe(false);
    expect(revisarVideo(bytes([0xff, 0xd8, 0xff, 0xe0, 0, 0x10], "JFIF", [0, 1])).ok).toBe(false);
    expect(revisarVideo(bytes("<html><body>hola</body></html>")).ok).toBe(false);
    expect(revisarVideo(new Uint8Array()).ok).toBe(false);
  });

  it("no se cuelga con cajas rotas (un tamaño que se pasa del archivo o que es 0 al inicio)", () => {
    expect(revisarVideo(bytes([0xff, 0xff, 0xff, 0xff], "moov", [0, 0])).ok).toBe(false);
    expect(revisarVideo(bytes([0, 0, 0, 4], "moov")).ok).toBe(false);
  });
});
