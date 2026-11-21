import type { AcabadoColor } from "@/db/esquema/sitio";

// Pedido 56: el probador de colores de la página de un servicio (P56-probador-de-colores.md). Sin nada del servidor:
// lo usan el panel, el sitio y el navegador.

export const NOMBRE_ACABADO: Record<AcabadoColor, string> = { mate: "Mate", satinado: "Satinado", brillante: "Brillante" };

/**
 * Cómo se ve cada acabado en el dibujo del aro: cuánto marca la luz y cuánto reflejo tiene. Mate, apagado; brillante,
 * con un destello.
 */
export const LUZ_ACABADO: Record<AcabadoColor, { luz: number; reflejo: number }> = {
  mate: { luz: 0.22, reflejo: 0 },
  satinado: { luz: 0.45, reflejo: 0.12 },
  brillante: { luz: 0.6, reflejo: 0.45 },
};
