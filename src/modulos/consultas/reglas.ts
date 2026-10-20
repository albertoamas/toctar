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
