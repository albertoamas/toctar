import { z } from "zod";

// Validación de los recordatorios de mantenimiento (HU-38). Especificación: C4-taller-entrega.md §6.

const id = z.coerce.number().int().positive();

/** Avisar por WhatsApp (datos sueltos: se validan). */
export const esquemaAvisarMantenimiento = z.object({ id });

/** "No le interesa", con una nota opcional. */
export const esquemaCerrarMantenimiento = z.object({
  id,
  nota: z
    .string()
    .trim()
    .max(300, "Hasta 300 caracteres.")
    .transform((v) => v || null),
});
