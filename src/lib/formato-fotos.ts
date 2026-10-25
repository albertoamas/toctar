// Formatos de foto aceptados al subir. Archivo aparte de fotos.ts para usarlo también en el navegador
// (atributo accept de los campos de archivo).
export const TIPOS_FOTO = ["image/png", "image/jpeg", "image/webp"] as const;
export const BYTES_MAXIMOS_FOTO = 5 * 1024 * 1024;

/** Ancho sobre alto de una foto guardada; sin medidas (fotos viejas), 4:3. La usan las cajas que toman su forma. */
export function proporcionDe(foto: { ancho: number | null; alto: number | null }): number {
  return (foto.ancho ?? 4) / (foto.alto ?? 3);
}
