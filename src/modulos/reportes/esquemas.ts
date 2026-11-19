import { z } from "zod";
import { METODOS_PAGO } from "@/db/esquema/trabajos";
import { fechaEnBolivia, fechaExiste } from "@/lib/fechas";
import { leerMonto } from "@/modulos/catalogo/reglas";
import { LARGO_DETALLE, primerDiaDeGastos } from "./reglas";

// Pedido 16 (P16-reportes-y-gastos.md §6): el mismo esquema en el formulario y en el servidor. La categoría tiene que
// estar activa: eso lo mira la acción, contra la base.

const id = z.coerce.number().int().positive();

/** Un gasto: qué se pagó, cuánto, cómo y cuándo (de este año o el pasado, no futuro), con un detalle opcional. */
export const esquemaGasto = z.object({
  categoriaId: z.coerce.number({ message: "Elige qué se pagó." }).int("Elige qué se pagó.").positive("Elige qué se pagó."),
  monto: z.string().transform((v, ctx) => {
    const m = leerMonto(v);
    if (!m) {
      ctx.addIssue({ code: "custom", message: v.trim() ? "Revisa el monto: un número mayor a cero, como 300 o 300,50." : "Escribe el monto del gasto." });
      return z.NEVER;
    }
    return m;
  }),
  metodo: z.enum(METODOS_PAGO, { message: "Elige cómo se pagó." }),
  fecha: z.string().superRefine((f, ctx) => {
    const hoy = fechaEnBolivia();
    if (!fechaExiste(f)) ctx.addIssue({ code: "custom", message: "Elige el día del gasto." });
    else if (f > hoy) ctx.addIssue({ code: "custom", message: "La fecha del gasto no puede ser futura." });
    else if (f < primerDiaDeGastos(hoy)) ctx.addIssue({ code: "custom", message: "Solo se registran gastos de este año o del pasado." });
  }),
  detalle: z
    .string()
    .trim()
    .max(LARGO_DETALLE, `Hasta ${LARGO_DETALLE} caracteres.`)
    .optional()
    .transform((v) => v || null),
});

/** Anular un gasto (RN-14): no se borra, queda tachado con su motivo y deja de contar. */
export const esquemaAnularGasto = z.object({
  id,
  motivo: z.string().trim().min(1, "Escribe el motivo.").max(LARGO_DETALLE, `Hasta ${LARGO_DETALLE} caracteres.`),
});
