import { z } from "zod";
import { DIRECCIONES } from "@/lib/orden";
import { mesesMantenimiento } from "@/modulos/mantenimientos/esquemas";

// Validación del catálogo (C1): el mismo esquema en el formulario y en el servidor. El servicio se crea, se nombra y
// tiene sus variantes aquí; su página en el sitio (resumen, textos, foto) se edita en Sitio web (sitio/esquemas.ts).
// Especificación: docs/08-desarrollo/etapas/C1-catalogo-clientes.md §6 y C5-cierre-entrega-2.md §0.

const id = z.coerce.number().int().positive();
const nombre = z.string().trim().min(1, "Escribe el nombre del servicio.").max(60, "Hasta 60 caracteres.");

const DURACION = { minima: 1, maxima: 60 } as const;

const duracionDias = z.coerce
  .number({ message: `Escribe los días, de ${DURACION.minima} a ${DURACION.maxima}.` })
  .int(`Escribe los días, de ${DURACION.minima} a ${DURACION.maxima}.`)
  .min(DURACION.minima, `Escribe los días, de ${DURACION.minima} a ${DURACION.maxima}.`)
  .max(DURACION.maxima, `Escribe los días, de ${DURACION.minima} a ${DURACION.maxima}.`);

/**
 * Alta de un servicio: el nombre y cuánto tarda (hallazgo 2 de la prueba en celulares: sin la duración, nacía con 1 día
 * que nadie eligió). Nace oculto en el sitio, hasta que se complete su página.
 */
export const esquemaCrearServicio = z.object({ nombre, duracionDias });

/**
 * Nombre, duración y su mantenimiento (RN-08, pedido 21): con la casilla marcada, el servicio que se agenda (puede ser
 * él mismo) y cada cuántos meses; sin ella, ninguno. Desactivarlo va aparte, en "Más" (hallazgo 1, esquemaIdServicio).
 */
export const esquemaDatosCatalogo = z
  .object({
    id,
    nombre,
    duracionDias,
    conMantenimiento: z.boolean(),
    mantenimientoServicioId: z.string(),
    mantenimientoMeses: z.string(),
  })
  .superRefine((d, ctx) => {
    if (!d.conMantenimiento) return;
    if (!id.safeParse(d.mantenimientoServicioId).success) ctx.addIssue({ code: "custom", path: ["mantenimientoServicioId"], message: "Elige el servicio de mantenimiento." });
    const meses = mesesMantenimiento.safeParse(d.mantenimientoMeses);
    if (!meses.success) ctx.addIssue({ code: "custom", path: ["mantenimientoMeses"], message: meses.error.issues[0].message });
  })
  .transform(({ conMantenimiento, mantenimientoServicioId, mantenimientoMeses, ...d }) => ({
    ...d,
    mantenimiento: conMantenimiento ? { servicioId: Number(mantenimientoServicioId), meses: Number(mantenimientoMeses) } : null,
  }));

/** Desactivar o reactivar un servicio, desde "Más" de su ficha (hallazgo 1 de la prueba en celulares). */
export const esquemaIdServicio = z.object({ id });

/** Duración propia de una variante: vacía usa la del servicio (HU-20). */
const duracionOpcional = z.preprocess((v) => (v === "" || v === null || v === undefined ? null : v), duracionDias.nullable());

export const esquemaVarianteCatalogo = z.object({
  varianteId: id,
  duracionDias: duracionOpcional,
});

/** Agregar (sin id) o renombrar una variante (D-2). La descripción se ve en la página del servicio. */
export const esquemaVariante = z.object({
  servicioId: id,
  id: id.optional(),
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
export const esquemaIdVariante = idRegistro;
export const esquemaMoverVariante = z.object({ servicioId: idRegistro, id: idRegistro, direccion: z.enum(DIRECCIONES) });
export const esquemaEstadoVariante = z.object({ servicioId: idRegistro, id: idRegistro, activo: z.boolean() });
