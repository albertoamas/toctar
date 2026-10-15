// Formatos de foto aceptados al subir. Archivo aparte de fotos.ts para usarlo también en el navegador
// (atributo accept de los campos de archivo).
export const TIPOS_FOTO = ["image/png", "image/jpeg", "image/webp"] as const;
export const BYTES_MAXIMOS_FOTO = 5 * 1024 * 1024;
