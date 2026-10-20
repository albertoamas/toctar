import { z } from "zod";
import { CANALES } from "@/db/esquema/consultas";
import { CLIENTE_NUEVO, VEHICULO_OTRO } from "./reglas";

// Validación de las consultas (HU-24). Especificación: docs/08-desarrollo/etapas/C2-consultas-cotizaciones.md §6 y §8.
// El cliente y el vehículo nuevos se validan con los esquemas de Clientes (C1).

const id = z.coerce.number().int().positive();

/** Un id elegido en un selector, o el valor especial ("nuevo", "otro"). Vacío: no se eligió. */
const eleccion = <T extends string>(especial: T, mensaje: string) =>
  z.string().transform((v, ctx): number | T => {
    if (v === especial) return especial;
    const n = Number(v);
    if (!v || !Number.isInteger(n) || n <= 0) {
      ctx.addIssue({ code: "custom", message: mensaje });
      return z.NEVER;
    }
    return n;
  });

export const esquemaConsulta = z.object({
  cliente: eleccion(CLIENTE_NUEVO, "Elige el cliente."),
  // Con un cliente nuevo, su vehículo va siempre: no se elige
  vehiculo: z.string().optional(),
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
  canal: z.enum(CANALES, { message: "Elige por dónde llegó la consulta." }),
  nota: z
    .string()
    .trim()
    .max(2000, "Hasta 2000 caracteres.")
    .transform((v) => v || null),
});

export const esquemaVehiculoElegido = eleccion(VEHICULO_OTRO, "Elige el vehículo.");

export const esquemaNota = z.object({
  id,
  nota: z
    .string()
    .trim()
    .max(2000, "Hasta 2000 caracteres.")
    .transform((v) => v || null),
});

/** Para quitarArchivoConsulta, que recibe datos sueltos: cualquiera puede llamarla. */
export const esquemaArchivoConsulta = z.object({ consultaId: id, archivoId: id });

export const esquemaIdConsulta = id;
