import { z } from "zod";
import { CANALES } from "@/db/esquema/consultas";
import { BYTES_MAXIMOS_VIDEO, CLIENTE_NUEVO, duracionPermitida, MEGAS_MAXIMOS_VIDEO, SEGUNDOS_MAXIMOS_VIDEO, TIPOS_VIDEO, VEHICULO_OTRO } from "./reglas";

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

const duracion = z.number().refine(duracionPermitida, `El video puede durar hasta ${SEGUNDOS_MAXIMOS_VIDEO} segundos.`);

/** Pedir permiso para subir un video (datos sueltos: se validan). El tamaño y el tipo quedan firmados en el permiso. */
export const esquemaPedirSubidaVideo = z.object({
  consultaId: id,
  tipo: z.enum(TIPOS_VIDEO, { message: "El video debe ser MP4, MOV o WebM." }),
  bytes: z.number().int().positive().max(BYTES_MAXIMOS_VIDEO, `El video puede pesar hasta ${MEGAS_MAXIMOS_VIDEO} MB.`),
  duracion,
});

/** Registrar el video ya subido. La clave la dio el servidor al pedir el permiso. */
export const esquemaRegistrarVideo = z.object({
  consultaId: id,
  clave: z.string().regex(/^consultas\/[0-9a-f-]{36}\.(mp4|mov|webm)$/),
  duracion,
});
