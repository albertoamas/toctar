import type { Rol } from "@/lib/roles";

// Reglas de gestión de usuarios (HU-02), como funciones puras para probarlas sin base de datos.

type Resumen = { id: number; rol: Rol; desactivado: boolean };

/**
 * Siempre debe quedar al menos un dueño activo. ¿Queda alguno si el usuario `idAfectado`
 * deja de ser dueño o deja de estar activo?
 */
export function quedaOtroDuenoActivo(usuarios: readonly Resumen[], idAfectado: number): boolean {
  return usuarios.some((u) => u.id !== idAfectado && u.rol === "dueno" && !u.desactivado);
}

/** ¿Este cambio de rol dejaría al sistema sin dueño activo? */
export function cambioDeRolDejaSinDueno(usuarios: readonly Resumen[], id: number, rolNuevo: Rol): boolean {
  const actual = usuarios.find((u) => u.id === id);
  if (!actual || actual.rol !== "dueno" || rolNuevo === "dueno" || actual.desactivado) return false;
  return !quedaOtroDuenoActivo(usuarios, id);
}
