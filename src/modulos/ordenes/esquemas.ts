import { z } from "zod";
import { fechaExiste } from "@/lib/fechas";
import { leerMonto } from "@/modulos/catalogo/reglas";
import { esquemaGaleria } from "@/modulos/sitio/esquemas";
import { ETAPAS_CON_SUBIDA, TIPOS_DE_DETALLE } from "./reglas";

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

/** Una foto de la orden: a qué orden y de qué etapa (inicio o final, pedido 27). La foto va aparte, en el campo "foto". */
export const esquemaFotoOrden = z.object({ trabajoId: id, etapa: z.enum(ETAPAS_CON_SUBIDA) });

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

/** Un servicio adicional (RF-43): del catálogo, con su precio (el vigente del tamaño o el que ponga el dueño). */
export const esquemaAdicional = z.object({
  id,
  // Se elige el servicio y, si tiene varias, su opción: con el servicio elegido, lo que falta es la opción
  servicioId: z.coerce.number().int().optional(),
  varianteId: z.coerce.number({ message: "Elige el servicio." }).int(),
  precio: z.string().transform((v, ctx) => {
    const m = leerMonto(v);
    if (!m) {
      ctx.addIssue({ code: "custom", message: v.trim() ? "Revisa el precio: un número mayor a cero, como 450 o 450,50." : "Escribe el precio." });
      return z.NEVER;
    }
    return m;
  }),
})
  // Aunque el precio también falte (sin opción no llega el sugerido): cada error va en su campo
  .refine((d) => d.varianteId > 0, {
    path: ["varianteId"],
    when: () => true,
    error: (iss) => ((iss.input as { servicioId?: number } | undefined)?.servicioId ? "Elige la opción." : "Elige el servicio."),
  });

/**
 * Entregar el vehículo (HU-36): con saldo pendiente, la casilla que lo confirma (RN-13). Pedido 13: la firma del cliente
 * (`conFirma`: llegó la imagen) con el nombre de quien recibe, o "Entregar sin firma" con el motivo.
 */
export const esquemaEntregar = z
  .object({
    id,
    conSaldo: z.literal("on").optional(),
    conFirma: z.boolean(),
    firmaNombre: z
      .string()
      .trim()
      .max(100, "Hasta 100 caracteres.")
      .transform((v) => v || null),
    sinFirma: z.literal("on").optional(),
    sinFirmaMotivo: z
      .string()
      .trim()
      .max(300, "Hasta 300 caracteres.")
      .transform((v) => v || null),
  })
  .superRefine((d, ctx) => {
    if (d.sinFirma) {
      if (!d.sinFirmaMotivo || d.sinFirmaMotivo.length < 3) ctx.addIssue({ code: "custom", path: ["sinFirmaMotivo"], message: "Cuenta por qué no firma." });
      return;
    }
    if (!d.conFirma) ctx.addIssue({ code: "custom", path: ["firma"], message: "Falta la firma del cliente, o marca «Entregar sin firma»." });
    if (!d.firmaNombre) ctx.addIssue({ code: "custom", path: ["firmaNombre"], message: "Escribe el nombre de quien recibe." });
  });

/** Registrar el aviso de "listo" (datos sueltos: se validan). */
export const esquemaAvisoListo = z.object({ id });

/** Quitar una foto (datos sueltos: se validan). */
export const esquemaQuitarFotoOrden = z.object({ trabajoId: id, fotoId: id });

/**
 * Publicar en la galería las fotos de una orden entregada (HU-41): las mismas reglas que la galería (servicio y
 * descripción, esquemaGaleria), con las fotos elegidas de la orden y la confirmación de que no se ve la placa ni nadie.
 * Que las fotos y el servicio sean de esa orden lo mira la acción.
 */
export const esquemaPublicar = esquemaGaleria.extend({
  id,
  fotoDespues: z.coerce.number({ error: "Elige la foto de después." }).int().positive("Elige la foto de después."),
  // Vacío o "sin foto de antes": solo la de después
  fotoAntes: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : null))
    .pipe(z.number().int().positive().nullable()),
  sinPlacaNiCaras: z.literal("on", "Marca que en las fotos no se lee la placa ni se ve a nadie."),
});

/**
 * Un detalle del checklist de recepción (pedido 12): la parte, qué tiene y una nota (con "Otro", obligatoria). La foto,
 * si la hay, va aparte en el campo "foto".
 */
export const esquemaDetalle = z
  .object({
    trabajoId: id,
    parteId: id,
    tipo: z.enum(TIPOS_DE_DETALLE, { message: "Elige qué tiene." }),
    nota: z
      .string()
      .trim()
      .max(300, "Hasta 300 caracteres.")
      .transform((v) => v || null),
  })
  .refine((d) => d.tipo !== "otro" || d.nota, { path: ["nota"], message: "Con «Otro», cuenta qué es." });

/** Marcar una parte "bien" (también una que tenía un detalle): datos sueltos, se validan. */
export const esquemaMarcarBien = z.object({ trabajoId: id, parteId: id });
