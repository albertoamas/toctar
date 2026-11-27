import sharp from "sharp";
import { describe, expect, test } from "vitest";
import { PIXELES_MAXIMOS, convertirAWebp } from "@/lib/imagen";

// Conversión de fotos (RNF-07) y límite de píxeles (revisión de seguridad de la Entrega 1).

const png = (ancho: number, alto: number) =>
  sharp({ create: { width: ancho, height: alto, channels: 3, background: "#c00" } }).png({ compressionLevel: 9 }).toBuffer();

describe("conversión de fotos", () => {
  test("una foto grande sale en WebP con el lado mayor pedido y su miniatura", async () => {
    const r = await convertirAWebp(await png(3000, 2000), [1600, 640]);
    expect(r?.map((v) => [v.info.format, v.info.width, v.info.height])).toEqual([
      ["webp", 1600, 1067],
      ["webp", 640, 427],
    ]);
  });

  test("una foto chica no se agranda", async () => {
    const [r] = (await convertirAWebp(await png(800, 600), [1600]))!;
    expect([r.info.width, r.info.height]).toEqual([800, 600]);
  });

  test("lo que no es una imagen se rechaza", async () => {
    expect(await convertirAWebp(Buffer.from("<svg onload=alert(1)>"), [1600])).toBeNull();
    expect(await convertirAWebp(Buffer.from("no soy una foto"), [1600])).toBeNull();
  });

  test("una imagen de más píxeles que el límite se rechaza, aunque pese poco", async () => {
    const lado = Math.ceil(Math.sqrt(PIXELES_MAXIMOS)) + 1;
    const enorme = await png(lado, lado);
    expect(enorme.byteLength).toBeLessThan(5 * 1024 * 1024); // entra en el tamaño máximo de subida
    expect(await convertirAWebp(enorme, [1600])).toBeNull();
  }, 60_000);
});
