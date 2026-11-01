import { z } from "zod";
import { DIRECCIONES } from "@/lib/orden";

// Listas editables de la pestaña Taller (HU-05): espacios del taller (RN-06), tamaños de vehículo (RN-07) y, desde el
// pedido 12, las partes del checklist de recepción.
// Reglas puras, probadas en tests/unit/configuracion-parametros.test.ts.

export const LISTAS = {
  espacios: { singular: "espacio", titulo: "Espacios del taller", conDescripcion: false },
  tamanos: { singular: "tamaño", titulo: "Tamaños de vehículo", conDescripcion: true },
  partes: { singular: "parte", titulo: "Partes del checklist", conDescripcion: false, femenino: true },
} as const;
export type Lista = keyof typeof LISTAS;
const NOMBRES_LISTAS = Object.keys(LISTAS) as [Lista, ...Lista[]];

export const esquemaElemento = z.object({
  lista: z.enum(NOMBRES_LISTAS),
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
  lista: z.enum(NOMBRES_LISTAS),
  id: z.number().int().positive(),
  direccion: z.enum(DIRECCIONES),
});

export const esquemaEstado = z.object({
  lista: z.enum(NOMBRES_LISTAS),
  id: z.number().int().positive(),
  activo: z.boolean(),
});

export type Elemento = { id: number; nombre: string; descripcion: string | null; orden: number; activo: boolean };

export function mensajeUltimoActivo(lista: Lista): string {
  return `Debe quedar al menos ${{ espacios: "un espacio activo", tamanos: "un tamaño activo", partes: "una parte activa" }[lista]}.`;
}

export function mensajeRepetido(lista: Lista): string {
  return `Ya existe ${{ espacios: "un espacio", tamanos: "un tamaño", partes: "una parte" }[lista]} con ese nombre.`;
}
