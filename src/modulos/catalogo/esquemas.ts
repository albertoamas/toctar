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
