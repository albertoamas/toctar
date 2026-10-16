import { z } from "zod";
import { PATRON_SLUG } from "@/lib/slug";

// Validación del contenido del sitio (B3): el mismo esquema en el formulario y en el servidor.

export const LIMITES = { resumen: 160, descripcion: 2000, beneficios: 8, beneficio: 120, pasos: 10, tituloPaso: 60, detallePaso: 300 } as const;

const nombre = z.string().trim().min(1, "Escribe el nombre del servicio.").max(60, "Hasta 60 caracteres.");
const resumen = z
  .string()
  .trim()
  .min(1, "Escribe un resumen de una o dos frases.")
  .max(LIMITES.resumen, `Hasta ${LIMITES.resumen} caracteres.`);

/** Un campo de texto que trae una lista en JSON (editores de beneficios y pasos). */
function listaJson<T extends z.ZodType>(esquema: T) {
  return z
    .string()
    .transform((v, ctx) => {
      try {
        return JSON.parse(v || "[]") as unknown;
      } catch {
        ctx.addIssue({ code: "custom", message: "No se pudo leer la lista. Recarga la página." });
        return z.NEVER;
      }
    })
    .pipe(esquema);
}

export const esquemaBeneficios = z
  .array(z.string().trim().min(1, "Escribe el beneficio o quita la fila.").max(LIMITES.beneficio, `Hasta ${LIMITES.beneficio} caracteres.`))
  .max(LIMITES.beneficios, `Hasta ${LIMITES.beneficios} beneficios.`);

export const esquemaPasos = z
  .array(
    z.object({
      titulo: z.string().trim().min(1, "Cada paso necesita un título.").max(LIMITES.tituloPaso, `El título va hasta ${LIMITES.tituloPaso} caracteres.`),
      detalle: z.string().trim().max(LIMITES.detallePaso, `El detalle va hasta ${LIMITES.detallePaso} caracteres.`),
    }),
  )
  .max(LIMITES.pasos, `Hasta ${LIMITES.pasos} pasos.`);

export const esquemaCrearServicio = z.object({ nombre, resumen });

export const esquemaServicio = z.object({
  id: z.coerce.number().int().positive(),
  nombre,
  slug: z
    .string()
    .trim()
    .min(1, "Escribe la dirección de la página.")
    .max(80, "Hasta 80 caracteres.")
    .regex(PATRON_SLUG, "La dirección solo lleva minúsculas, números y guiones."),
  resumen,
  descripcion: z.string().trim().max(LIMITES.descripcion, `Hasta ${LIMITES.descripcion} caracteres.`),
  beneficios: listaJson(esquemaBeneficios),
  pasos: listaJson(esquemaPasos),
  visible: z.boolean(),
});

export const esquemaVariante = z.object({
  servicioId: z.coerce.number().int().positive(),
  id: z.coerce.number().int().positive().optional(),
  nombre: z.string().trim().min(1, "Escribe un nombre.").max(60, "Hasta 60 caracteres."),
  descripcion: z
    .string()
    .trim()
    .max(200, "Hasta 200 caracteres.")
    .optional()
    .transform((v) => v || null),
});

// Acciones que reciben datos sueltos (no un formulario): también se validan, porque cualquiera puede llamarlas.
const idRegistro = z.number().int().positive();
export const esquemaId = idRegistro;
export const esquemaIdFormulario = z.coerce.number().int().positive();
export const esquemaMover = z.object({ id: idRegistro, direccion: z.enum(["subir", "bajar"]) });
export const esquemaMoverVariante = esquemaMover.extend({ servicioId: idRegistro });
export const esquemaEstadoVariante = z.object({ servicioId: idRegistro, id: idRegistro, activo: z.boolean() });
export const esquemaVisibilidad = z.object({ id: idRegistro, visible: z.boolean() });

// Galería (HU-09)
const descripcionGaleria = z
  .string()
  .trim()
  .min(1, "Escribe una descripción corta: también la leen los buscadores.")
  .max(140, "Hasta 140 caracteres.");
const servicioGaleria = z.coerce.number({ error: "Elige el servicio." }).int().positive("Elige el servicio.");

export const esquemaGaleria = z.object({ servicioId: servicioGaleria, descripcion: descripcionGaleria });
export const esquemaEditarGaleria = z.object({ id: z.coerce.number().int().positive(), servicioId: servicioGaleria, descripcion: descripcionGaleria });
