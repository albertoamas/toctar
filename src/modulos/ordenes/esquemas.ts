import { z } from "zod";
import { ETAPAS_FOTO } from "@/db/esquema/trabajos";

// Validación de las órdenes (C4). Especificación: docs/08-desarrollo/etapas/C4-taller-entrega.md §6.

const id = z.coerce.number().int().positive();

/** Recibir el vehículo (HU-33): el técnico (opcional; vacío = sin asignar) y las observaciones de ingreso. */
export const esquemaRecibir = z.object({
  id,
  tecnicoId: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : null))
    .pipe(z.number().int().positive().nullable()),
  observaciones: z
    .string()
    .trim()
    .max(2000, "Hasta 2000 caracteres.")
    .transform((v) => v || null),
});

/** Una foto de la orden: a qué orden y de qué etapa. La foto va aparte, en el campo "foto". */
export const esquemaFotoOrden = z.object({ trabajoId: id, etapa: z.enum(ETAPAS_FOTO) });

/** Quitar una foto (datos sueltos: se validan). */
export const esquemaQuitarFotoOrden = z.object({ trabajoId: id, fotoId: id });
