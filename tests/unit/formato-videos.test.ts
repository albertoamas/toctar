import { describe, expect, it } from "vitest";
import { tipoDeVideo } from "@/lib/formato-videos";

// Pedido 48: el servidor reconoce el video por su firma, no por lo que dice el navegador.

const bytes = (...partes: (string | number[])[]) =>
  new Uint8Array(partes.flatMap((p) => (typeof p === "string" ? [...p].map((c) => c.charCodeAt(0)) : p)));

describe("tipoDeVideo", () => {
  it("reconoce un MP4 por su caja ftyp", () => {
    expect(tipoDeVideo(bytes([0, 0, 0, 0x20], "ftypisom", [0, 0, 2, 0]))).toBe("video/mp4");
    expect(tipoDeVideo(bytes([0, 0, 0, 0x18], "ftypmp42", [0, 0, 0, 0]))).toBe("video/mp4");
  });

  it("reconoce un WebM por su cabecera EBML", () => {
    expect(tipoDeVideo(bytes([0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42]))).toBe("video/webm");
  });

  it("no acepta lo que también lleva ftyp sin ser un video MP4: .mov, fotos HEIC o AVIF y audio M4A", () => {
    for (const marca of ["qt  ", "heic", "mif1", "avif", "M4A "]) expect(tipoDeVideo(bytes([0, 0, 0, 0x14], `ftyp${marca}`, [0, 0, 0, 0])), marca).toBeNull();
  });

  it("rechaza una foto, un texto o un archivo vacío", () => {
    expect(tipoDeVideo(bytes([0x89], "PNG", [0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]))).toBeNull();
    expect(tipoDeVideo(bytes([0xff, 0xd8, 0xff, 0xe0, 0, 0x10], "JFIF", [0, 1]))).toBeNull();
    expect(tipoDeVideo(bytes("<html><body>hola</body></html>"))).toBeNull();
    expect(tipoDeVideo(new Uint8Array())).toBeNull();
  });
});
