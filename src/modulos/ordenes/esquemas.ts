import { z } from "zod";
import { ETAPAS_FOTO } from "@/db/esquema/trabajos";
import { fechaExiste } from "@/lib/fechas";

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

/** Cambiar el estado de una orden (RF-41): a recibido, en proceso o listo; la transición la mira la acción. */
export const esquemaEstadoOrden = z.object({ id, estado: z.enum(["recibido", "en_proceso", "listo"]) });

/** Un avance de la orden (RF-42). */
export const esquemaAvance = z.object({ id, nota: z.string().trim().min(1, "Escribe el avance.").max(1000, "Hasta 1000 caracteres.") });

/** Extender la entrega: la nueva fecha y el espacio (el mismo, si sigue libre). El resto lo mira la acción. */
export const esquemaExtender = z.object({
  id,
  fechaFin: z.string().refine(fechaExiste, "Elige la nueva fecha de entrega."),
  espacioId: z.coerce.number({ message: "Elige el espacio." }).int().positive("Elige el espacio."),
});

/** Registrar el aviso de "listo" (datos sueltos: se validan). */
export const esquemaAvisoListo = z.object({ id });

/** Quitar una foto (datos sueltos: se validan). */
export const esquemaQuitarFotoOrden = z.object({ trabajoId: id, fotoId: id });
