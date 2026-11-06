import { CAMPOS_VEHICULO } from "./esquemas";

// Lo que se lee de un formulario de cliente y vehículo, sin nada del servidor: lo usan las acciones (servidor.ts) y la
// nueva cotización en pasos (pedido 40), que valida cada paso en el navegador con los mismos esquemas.

/** Prefijo de los campos del vehículo en el formulario de cliente nuevo (y en el de la nueva cotización). */
export const PREFIJO_VEHICULO = "vehiculo-";

export function leerValores(datos: FormData): Record<string, string> {
  const valores: Record<string, string> = {};
  for (const [clave, valor] of datos.entries()) if (typeof valor === "string") valores[clave] = valor;
  return valores;
}

/** Los campos de un vehículo con su prefijo, ya sin él. */
export const camposConPrefijo = (valores: Record<string, string>, prefijo: string) =>
  Object.fromEntries(CAMPOS_VEHICULO.map((c) => [c, (valores[prefijo + c] ?? "").trim()]));

/** Los errores del esquema del vehículo, con el prefijo de sus campos. */
export const erroresConPrefijo = (errores: Record<string, string>, prefijo: string) =>
  Object.fromEntries(Object.entries(errores).map(([c, m]) => [prefijo + c, m]));
