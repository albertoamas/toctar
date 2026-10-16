import sharp, { type OutputInfo } from "sharp";

// Conversión de fotos a WebP. Aparte de fotos.ts (que guarda y registra) para probarla sin base de datos.
// Sin "server-only" para poder importarla en Vitest; sharp solo existe en el servidor, así que igual no llega al navegador.

/**
 * Píxeles máximos de una foto subida (unos 70 megapíxeles: más que cualquier celular común).
 * Sin este límite, una imagen chica en bytes puede declarar dimensiones enormes y agotar la memoria
 * del servidor al decodificarla. El formulario de reclamos es público, así que importa.
 * Las fotos se achican en el navegador antes de subir (achicarFoto), así que en el uso normal llegan de 1600 px.
 */
export const PIXELES_MAXIMOS = 70_000_000;

const FORMATOS = ["png", "jpeg", "webp"];

export type ImagenConvertida = { data: Buffer; info: OutputInfo };

/**
 * Convierte a WebP una o más medidas (lado mayor en píxeles), derecha según la cámara.
 * Devuelve null si no es de verdad PNG, JPG o WebP, o si pasa el límite de píxeles.
 */
export async function convertirAWebp(original: Buffer, ladosMayores: number[]): Promise<ImagenConvertida[] | null> {
  try {
    const entrada = sharp(original, { limitInputPixels: PIXELES_MAXIMOS });
    const { format } = await entrada.metadata();
    if (!format || !FORMATOS.includes(format)) return null;
    return await Promise.all(
      ladosMayores.map((lado) =>
        entrada
          .clone()
          .rotate()
          .resize({ width: lado, height: lado, fit: "inside", withoutEnlargement: true })
          .webp({ quality: 85 })
          .toBuffer({ resolveWithObject: true }),
      ),
    );
  } catch {
    return null;
  }
}
