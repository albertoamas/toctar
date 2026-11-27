import type { Rol } from "@/lib/roles";

// Reglas de gestión de usuarios (HU-02), como funciones puras para probarlas sin base de datos.

/** Lo que se cambia de una cuenta desde el panel. */
export type CambioDeCuenta = "nombre" | "permisos" | "contrasena" | "acceso";

/**
 * RN-15 (pedido 50): desde el panel, la cuenta de un dueño no se cambia. Su nombre lo cambia él mismo, y su contraseña
 * también, pero con la actual (`cambiarMiContrasena`, no esta regla). A un encargado, el dueño le cambia todo, menos el
 * acceso a sí mismo (no hay encargado que entre a Usuarios). Así siempre queda un dueño activo sin candados: nada del
 * panel le quita el rol o el acceso a un dueño.
 */
export function puedeCambiar(objetivo: { id: number; rol: Rol }, autorId: number, cambio: CambioDeCuenta): boolean {
  if (objetivo.rol === "encargado") return objetivo.id !== autorId || cambio === "nombre";
  return cambio === "nombre" && objetivo.id === autorId;
}

export const NO_SE_CAMBIA_DUENO = "La cuenta de un dueño solo la cambia él mismo.";
