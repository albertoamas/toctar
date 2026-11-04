import { z } from "zod";
import { fechaEnBolivia, fechaExiste } from "@/lib/fechas";
import { normalizarWhatsApp } from "@/lib/whatsapp";

// Formulario público de garantía y reclamos (HU-16): el mismo esquema en el navegador y en el servidor.

export const MAXIMO_FOTOS = 3;

/** "2849 xkt" o "2849-XKT" → "2849XKT". Sin letras ni números en otro lugar: el formato varía (autos, motos, antiguas). */
export function normalizarPlaca(texto: string): string {
  return texto.toUpperCase().replace(/[\s.-]/g, "");
}

export const esquemaReclamo = z.object({
  nombre: z.string().trim().min(2, "Escribe tu nombre.").max(80, "Hasta 80 caracteres."),
  telefono: z
    .string()
    .trim()
    .transform((v, ctx) => {
      const numero = normalizarWhatsApp(v);
      if (!numero) {
        ctx.addIssue({ code: "custom", message: "Escribe los 8 dígitos de tu celular." });
        return z.NEVER;
      }
      return numero;
    }),
  placa: z
    .string()
    .transform(normalizarPlaca)
    .pipe(z.string().regex(/^[A-Z0-9]{4,8}$/, "Escribe la placa del vehículo, por ejemplo 2849XKT.")),
  servicioId: z
    .string()
    .trim()
    .transform((v, ctx) => {
      if (!v) return null;
      const n = Number(v);
      if (!Number.isInteger(n) || n <= 0) {
        ctx.addIssue({ code: "custom", message: "Elige un servicio de la lista." });
        return z.NEVER;
      }
      return n;
    }),
  fechaAproximada: z
    .string()
    .trim()
    .transform((v, ctx) => {
      if (!v) return null;
      // Una fecha que no existe (31/02) la rechazaría la base al guardar: se avisa aquí
      if (!fechaExiste(v)) {
        ctx.addIssue({ code: "custom", message: "Revisa la fecha." });
        return z.NEVER;
      }
      if (v > fechaEnBolivia()) {
        ctx.addIssue({ code: "custom", message: "La fecha no puede ser futura." });
        return z.NEVER;
      }
      return v;
    }),
  descripcion: z
    .string()
    .trim()
    .min(10, "Cuéntanos qué pasó (al menos 10 caracteres).")
    .max(2000, "Hasta 2000 caracteres."),
});

export const CAMPOS_RECLAMO = Object.keys(esquemaReclamo.shape) as (keyof typeof esquemaReclamo.shape)[];

/** Marcar como atendido (HU-17): la nota queda en el registro. */
export const esquemaAtender = z.object({
  id: z.coerce.number().int().positive(),
  nota: z.string().trim().min(3, "Escribe qué se hizo, para el registro.").max(1000, "Hasta 1000 caracteres."),
});
