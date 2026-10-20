import type { Canal, EstadoConsulta } from "@/db/esquema/consultas";

// Reglas puras de las consultas (C2). Especificación: docs/08-desarrollo/etapas/C2-consultas-cotizaciones.md.

/** Fotos y videos por consulta (§4, `consulta_archivo`). */
export const MAXIMO_ARCHIVOS = 10;

export const NOMBRE_CANAL: Record<Canal, string> = { whatsapp: "WhatsApp", taller: "En el taller" };

export const NOMBRE_ESTADO: Record<EstadoConsulta, string> = {
  consulto: "Consultó",
  cotizado: "Cotizado",
  confirmado: "Confirmado",
  perdido: "Perdido",
};

/** Valor del selector de cliente para registrarlo ahí mismo, y del de vehículo para agregar otro. */
export const CLIENTE_NUEVO = "nuevo";
export const VEHICULO_OTRO = "otro";

/** Videos de consultas (RNF-07): sin procesar, suben directo al bucket privado (§12). */
export const TIPOS_VIDEO = ["video/mp4", "video/quicktime", "video/webm"] as const;
export const EXTENSION_VIDEO: Record<(typeof TIPOS_VIDEO)[number], string> = { "video/mp4": "mp4", "video/quicktime": "mov", "video/webm": "webm" };
export const MEGAS_MAXIMOS_VIDEO = 50;
export const BYTES_MAXIMOS_VIDEO = MEGAS_MAXIMOS_VIDEO * 1024 * 1024;
export const SEGUNDOS_MAXIMOS_VIDEO = 60;

/** Lo que mide el navegador redondea distinto según el teléfono: un video de "60 s" puede medir 60,4. */
export const duracionPermitida = (segundos: number) => segundos > 0 && Math.round(segundos) <= SEGUNDOS_MAXIMOS_VIDEO;

/** "2 fotos agregadas.", "Video agregado.", "1 foto y 2 videos agregados."; vacío si no se subió nada. */
export function textoSubidos(fotos: number, videos: number): string {
  if (fotos + videos === 0) return "";
  if (videos === 0) return fotos === 1 ? "Foto agregada." : `${fotos} fotos agregadas.`;
  if (fotos === 0) return videos === 1 ? "Video agregado." : `${videos} videos agregados.`;
  return `${fotos} ${fotos === 1 ? "foto" : "fotos"} y ${videos} ${videos === 1 ? "video" : "videos"} agregados.`;
}
