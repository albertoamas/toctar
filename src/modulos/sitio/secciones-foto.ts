// Las secciones de la página de un servicio que pueden llevar una foto al lado (pedido de la demo del 24/10: imágenes
// dentro del contenido, no solo texto). Una foto por sección; sin foto, la sección es solo texto.

export const SECCIONES_FOTO = {
  descripcion: "En qué consiste",
  proceso: "Cómo lo hacemos",
  opciones: "Opciones",
} as const;

export type SeccionFoto = keyof typeof SECCIONES_FOTO;

export const CLAVES_SECCION = Object.keys(SECCIONES_FOTO) as [SeccionFoto, ...SeccionFoto[]];
