import { z } from "zod";
import { METODOS_PAGO } from "@/db/esquema/trabajos";
import { fechaEnBolivia, fechaExiste } from "@/lib/fechas";
import { leerMonto } from "@/modulos/catalogo/reglas";

// Validación de los pagos (HU-32, RF-45). Especificación: docs/08-desarrollo/etapas/C3-agenda-pagos.md §8.
// El tope (el saldo pendiente) depende de la reserva: lo mira la acción, dentro de la transacción.

const id = z.coerce.number().int().positive();

/** Un pago: monto, método y fecha (en Bolivia, no futura). El tipo lo pone la acción (pedido 46); el comprobante es una foto aparte. */
export const esquemaPago = z.object({
  trabajoId: id,
  monto: z.string().transform((v, ctx) => {
    const m = leerMonto(v);
    if (!m) {
      ctx.addIssue({ code: "custom", message: v.trim() ? "Revisa el monto: un número mayor a cero, como 300 o 300,50." : "Escribe el monto." });
      return z.NEVER;
    }
    return m;
  }),
  metodo: z.enum(METODOS_PAGO, { message: "Elige cómo pagó." }),
  fecha: z.string().superRefine((f, ctx) => {
    // Desde el 2000: con años extremos las fechas dejan de tener cuatro cifras y la base las rechaza
    if (!fechaExiste(f) || f < "2000-01-01") ctx.addIssue({ code: "custom", message: "Elige el día del pago." });
    else if (f > fechaEnBolivia()) ctx.addIssue({ code: "custom", message: "La fecha del pago no puede ser futura." });
  }),
});

/** Anular un pago (D-6): no se borra, queda con su motivo. */
export const esquemaAnularPago = z.object({
  id,
  motivo: z.string().trim().min(1, "Escribe el motivo.").max(300, "Hasta 300 caracteres."),
});
