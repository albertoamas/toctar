import type { Canal, EstadoConsulta, MotivoPerdida } from "@/db/esquema/consultas";
import { diasEntre, fechaEnBolivia } from "@/lib/fechas";

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

/** Color de la insignia de cada estado (clases de globals.css). */
export const INSIGNIA_ESTADO: Record<EstadoConsulta, string> = {
  consulto: "tt-insignia",
  cotizado: "tt-insignia",
  confirmado: "tt-insignia tt-insignia--exito",
  perdido: "tt-insignia tt-insignia--aviso",
};

export const NOMBRE_MOTIVO: Record<MotivoPerdida, string> = { precio: "Precio", no_respondio: "No respondió", otro: "Otro" };

/** Pestañas de la lista (HU-28): abiertas son las que todavía se pueden ganar. */
export const VISTAS = { abiertas: ["consulto", "cotizado"], confirmadas: ["confirmado"], perdidas: ["perdido"] } as const satisfies Record<
  string,
  readonly EstadoConsulta[]
>;
export type Vista = keyof typeof VISTAS;

/**
 * Cambios de estado permitidos (RF-30). Cotizar (HU-25) pasa a "cotizado" (también una versión nueva); confirmar es de
 * C3, con la reserva; perder se puede mientras está abierta; reabrir devuelve una perdida a donde estaba
 * (`estadoAlReabrir`).
 */
export function transicionPermitida(estado: EstadoConsulta, destino: EstadoConsulta): boolean {
  switch (estado) {
    case "consulto":
      return destino === "cotizado" || destino === "perdido";
    case "cotizado":
      return destino === "cotizado" || destino === "confirmado" || destino === "perdido";
    case "perdido":
      return destino === "consulto" || destino === "cotizado";
    case "confirmado":
      return false;
  }
}

/** Una consulta perdida vuelve a "cotizado" si tiene cotización; si no, a "consultó". */
export const estadoAlReabrir = (tieneCotizacion: boolean): EstadoConsulta => (tieneCotizacion ? "cotizado" : "consulto");

/** Días calendario, en hora de Bolivia, desde un instante hasta hoy: lo de anoche a las 23:00 ya es "hace 1 día". */
export function diasDesde(instante: Date, hoy: Date = new Date()): number {
  return Math.max(0, diasEntre(fechaEnBolivia(instante), fechaEnBolivia(hoy)));
}

export const textoDias = (dias: number) => (dias === 0 ? "hoy" : dias === 1 ? "hace 1 día" : `hace ${dias} días`);

/** Una consulta abierta sin movimiento desde hace `umbral` días (Configuración) se está enfriando (RF-35). */
export const seEnfria = (estado: EstadoConsulta, dias: number, umbral: number) =>
  (VISTAS.abiertas as readonly EstadoConsulta[]).includes(estado) && dias >= umbral;

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
