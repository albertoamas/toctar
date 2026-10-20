import { z } from "zod";

// Validación del catálogo (C1): el mismo esquema en el formulario y en el servidor.
// Especificación: docs/08-desarrollo/etapas/C1-catalogo-clientes.md §6.

const DURACION = { minima: 1, maxima: 60 } as const;

const duracionDias = z.coerce
  .number({ message: `Escribe los días, de ${DURACION.minima} a ${DURACION.maxima}.` })
  .int(`Escribe los días, de ${DURACION.minima} a ${DURACION.maxima}.`)
  .min(DURACION.minima, `Escribe los días, de ${DURACION.minima} a ${DURACION.maxima}.`)
  .max(DURACION.maxima, `Escribe los días, de ${DURACION.minima} a ${DURACION.maxima}.`);

export const esquemaDatosCatalogo = z.object({
  id: z.coerce.number().int().positive(),
  duracionDias,
  generaMantenimiento: z.boolean(),
  activo: z.boolean(),
});

/** Duración propia de una variante: vacía usa la del servicio (HU-20). */
const duracionOpcional = z.preprocess((v) => (v === "" || v === null || v === undefined ? null : v), duracionDias.nullable());

export const esquemaVarianteCatalogo = z.object({
  varianteId: z.coerce.number().int().positive(),
  duracionDias: duracionOpcional,
});

/** Para las acciones que reciben un id suelto (no un formulario): cualquiera puede llamarlas. */
export const esquemaIdVariante = z.number().int().positive();
