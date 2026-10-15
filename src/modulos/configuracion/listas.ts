import { z } from "zod";

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
  direccion: z.enum(["subir", "bajar"]),
});

export const esquemaEstado = z.object({
  lista: z.enum(["espacios", "tamanos"]),
  id: z.number().int().positive(),
  activo: z.boolean(),
});

export type Elemento = { id: number; nombre: string; descripcion: string | null; orden: number; activo: boolean };

/** Nombre repetido sin importar mayúsculas (otro elemento, activo o no). */
export function nombreRepetido(elementos: Pick<Elemento, "id" | "nombre">[], nombre: string, id?: number): boolean {
  const buscado = nombre.trim().toLocaleLowerCase("es");
  return elementos.some((e) => e.id !== id && e.nombre.trim().toLocaleLowerCase("es") === buscado);
}

/**
 * Nuevo orden de los activos al subir o bajar uno: [{ id, orden }] numerados desde 1.
 * null si no se puede mover (ya está primero o último, o no está activo).
 */
export function reordenar(elementos: Elemento[], id: number, direccion: "subir" | "bajar"): { id: number; orden: number }[] | null {
  const activos = elementos.filter((e) => e.activo).sort((a, b) => a.orden - b.orden || a.id - b.id);
  const i = activos.findIndex((e) => e.id === id);
  const j = direccion === "subir" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= activos.length) return null;
  [activos[i], activos[j]] = [activos[j], activos[i]];
  return activos.map((e, k) => ({ id: e.id, orden: k + 1 }));
}

/** No se puede desactivar el último activo: sin espacios no hay agenda y sin tamaños no hay precios. */
export function puedeDesactivar(elementos: Pick<Elemento, "id" | "activo">[], id: number): boolean {
  return elementos.some((e) => e.activo && e.id !== id);
}

export function mensajeUltimoActivo(lista: Lista): string {
  return lista === "espacios" ? "Debe quedar al menos un espacio activo." : "Debe quedar al menos un tamaño activo.";
}

export function mensajeRepetido(lista: Lista): string {
  return lista === "espacios" ? "Ya existe un espacio con ese nombre." : "Ya existe un tamaño con ese nombre.";
}
