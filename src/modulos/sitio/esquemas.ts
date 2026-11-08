import { z } from "zod";
import { DIRECCIONES } from "@/lib/orden";
import { PATRON_SLUG } from "@/lib/slug";
import { CLAVES_ICONO } from "./beneficios";
import { CLAVES_SECCION } from "./secciones-foto";

// Validación del contenido del sitio (B3): el mismo esquema en el formulario y en el servidor.

export const LIMITES = { resumen: 160, beneficios: 8, beneficio: 120, pasos: 10, tituloPaso: 60, detallePaso: 300 } as const;

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

const esquemaBeneficios = z
  .array(
    z.object({
      texto: z.string().trim().min(1, "Escribe el beneficio o quita la fila.").max(LIMITES.beneficio, `Hasta ${LIMITES.beneficio} caracteres.`),
      icono: z.enum(CLAVES_ICONO, "Elige un ícono de la lista."),
    }),
  )
  .max(LIMITES.beneficios, `Hasta ${LIMITES.beneficios} beneficios.`);

const esquemaPasos = z
  .array(
    z.object({
      titulo: z.string().trim().min(1, "Cada paso necesita un título.").max(LIMITES.tituloPaso, `El título va hasta ${LIMITES.tituloPaso} caracteres.`),
      detalle: z.string().trim().max(LIMITES.detallePaso, `El detalle va hasta ${LIMITES.detallePaso} caracteres.`),
    }),
  )
  .max(LIMITES.pasos, `Hasta ${LIMITES.pasos} pasos.`);

/** La página de un servicio en el sitio. El nombre y las variantes son del catálogo (catalogo/esquemas.ts). */
export const esquemaServicio = z.object({
  id: z.coerce.number().int().positive(),
  slug: z
    .string()
    .trim()
    .min(1, "Escribe la dirección de la página.")
    .max(80, "Hasta 80 caracteres.")
    .regex(PATRON_SLUG, "La dirección solo lleva minúsculas, números y guiones."),
  resumen,
  beneficios: listaJson(esquemaBeneficios),
  pasos: listaJson(esquemaPasos),
  visible: z.boolean(),
  opcionesEnEscalera: z.boolean(),
});

/**
 * Una parte de esa página, la que guarda cada modal de su ficha (pulido 13.19): solo sus campos, así guardar los pasos
 * no pide el resumen ni pisa los beneficios. Si se muestra en el sitio va aparte (cambiarVisibilidadServicio).
 */
export const esquemaParteServicio = z.discriminatedUnion("parte", [
  esquemaServicio.pick({ id: true, resumen: true }).extend({ parte: z.literal("resumen") }),
  esquemaServicio.pick({ id: true, beneficios: true }).extend({ parte: z.literal("beneficios") }),
  esquemaServicio.pick({ id: true, pasos: true }).extend({ parte: z.literal("pasos") }),
  esquemaServicio.pick({ id: true, opcionesEnEscalera: true }).extend({ parte: z.literal("opciones") }),
  esquemaServicio.pick({ id: true, slug: true }).extend({ parte: z.literal("direccion") }),
]);

export type ParteServicio = z.infer<typeof esquemaParteServicio>["parte"];

/**
 * Por qué un servicio no puede mostrarse en el sitio, o null si puede: inactivo en el catálogo no sale (publico.ts), y
 * sin resumen su página queda vacía arriba y en Google.
 */
export function motivoParaNoMostrar(servicio: { activo: boolean; resumen: string }): string | null {
  if (!servicio.activo) return "Está inactivo en el catálogo: actívalo ahí primero.";
  if (!servicio.resumen.trim()) return "Escribe el resumen antes de mostrarlo en el sitio.";
  return null;
}

// Acciones que reciben datos sueltos (no un formulario): también se validan, porque cualquiera puede llamarlas.
const idRegistro = z.number().int().positive();
export const esquemaId = idRegistro;
export const esquemaIdFormulario = z.coerce.number().int().positive();
export const esquemaMover = z.object({ id: idRegistro, direccion: z.enum(DIRECCIONES) });
export const esquemaVisibilidad = z.object({ id: idRegistro, visible: z.boolean() });

// Galería (HU-09)
// La descripción es opcional desde el 24/10: no se ve en el sitio, la leen Google y los lectores de pantalla
const descripcionGaleria = z.string().trim().max(140, "Hasta 140 caracteres.");
const servicioGaleria = z.coerce.number({ error: "Elige el servicio." }).int().positive("Elige el servicio.");

export const esquemaGaleria = z.object({ servicioId: servicioGaleria, descripcion: descripcionGaleria });
export const esquemaEditarGaleria = z.object({ id: z.coerce.number().int().positive(), servicioId: servicioGaleria, descripcion: descripcionGaleria });

// La foto de una sección de la página de un servicio (pedido de la demo del 24/10). Decorativa: sin descripción
const seccionFoto = z.enum(CLAVES_SECCION, "Esa sección no lleva foto.");
export const esquemaFotoSeccion = z.object({ servicioId: esquemaIdFormulario, seccion: seccionFoto });
export const esquemaQuitarFotoSeccion = z.object({ servicioId: idRegistro, seccion: seccionFoto });
