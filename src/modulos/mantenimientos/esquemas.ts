import { z } from "zod";
import { fechaExiste } from "@/lib/fechas";
import { MESES_MANTENIMIENTO } from "./reglas";

// Validación de los recordatorios de mantenimiento (HU-38) y de los planes por vehículo (pedido 21).
// Especificación: C4-taller-entrega.md §6 y P21-planes-mantenimiento.md §6.

const id = z.coerce.number().int().positive();

const MENSAJE_MESES = `Escribe los meses, de ${MESES_MANTENIMIENTO.minimo} a ${MESES_MANTENIMIENTO.maximo}.`;

/** Cada cuántos meses (en el catálogo y en cada plan), escrito en un campo. */
export const mesesMantenimiento = z.coerce
  .number({ message: MENSAJE_MESES })
  .int(MENSAJE_MESES)
  .min(MESES_MANTENIMIENTO.minimo, MENSAJE_MESES)
  .max(MESES_MANTENIMIENTO.maximo, MENSAJE_MESES);

const fecha = (mensaje: string) => z.string().regex(/^\d{4}-\d{2}-\d{2}$/, mensaje).refine(fechaExiste, mensaje);

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

/** Agregar un mantenimiento desde la ficha del cliente: un servicio hecho antes del sistema (pedido 17). */
export const esquemaAgregarMantenimiento = z.object({
  clienteId: id,
  vehiculoId: z.coerce.number({ message: "Elige el vehículo." }).int().positive("Elige el vehículo."),
  servicioId: z.coerce.number({ message: "Elige el servicio que se hizo." }).int().positive("Elige el servicio que se hizo."),
  hecho: fecha("Escribe cuándo se hizo."),
  meses: mesesMantenimiento,
});

/** Editar un plan: cada cuántos meses y cuándo es el próximo. */
export const esquemaEditarPlan = z.object({
  id,
  meses: mesesMantenimiento,
  proximo: fecha("Escribe la fecha del próximo mantenimiento."),
});
