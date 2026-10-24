import { z } from "zod";
import { DIRECCIONES } from "@/lib/orden";

// Listas editables de la pestaña Taller (HU-05): espacios del taller (RN-06) y tamaños de vehículo (RN-07).
// Reglas puras, probadas en tests/unit/configuracion-parametros.test.ts.

export const LISTAS = {
  espacios: { singular: "espacio", titulo: "Espacios del taller", conDescripcion: false },
  tamanos: { singular: "tamaño", titulo: "Tamaños de vehículo", conDescripcion: true },
} as const;
export type Lista = keyof typeof LISTAS;

export const esquemaElemento = z.object({
  lista: z.enum(["espacios", "tamanos"]),
  id: z.coerce.number().int().positive().optional(),
  nombre: z.string().trim().min(1, "Escribe un nombre.").max(60, "Hasta 60 caracteres."),
  descripcion: z
    .string()
    .trim()
    .max(200, "Hasta 200 caracteres.")
    .optional()
    .transform((v) => v || null),
});

export const esquemaMover = z.object({
  lista: z.enum(["espacios", "tamanos"]),
  id: z.number().int().positive(),
  direccion: z.enum(DIRECCIONES),
});

export const esquemaEstado = z.object({
  lista: z.enum(["espacios", "tamanos"]),
  id: z.number().int().positive(),
  activo: z.boolean(),
});

export type Elemento = { id: number; nombre: string; descripcion: string | null; orden: number; activo: boolean };

export function mensajeUltimoActivo(lista: Lista): string {
  return lista === "espacios" ? "Debe quedar al menos un espacio activo." : "Debe quedar al menos un tamaño activo.";
}

export function mensajeRepetido(lista: Lista): string {
  return lista === "espacios" ? "Ya existe un espacio con ese nombre." : "Ya existe un tamaño con ese nombre.";
}
