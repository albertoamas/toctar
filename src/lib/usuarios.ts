import { z } from "zod";

// Reglas de los nombres de usuario y del correo interno que exige Better Auth.

/**
 * Caracteres permitidos en un nombre de usuario. Única definición: la usan el formulario (abajo)
 * y Better Auth al ingresar (src/lib/auth.ts). Si no coinciden, se crean usuarios que no pueden entrar.
 * Acepta mayúsculas porque al ingresar se valida antes de pasar a minúsculas.
 */
export const PATRON_NOMBRE_USUARIO = /^[a-z0-9._-]+$/i;

/** Nombre de usuario: 3 a 30 caracteres, minúsculas, números, punto, guion o guion bajo. */
export const esquemaNombreUsuario = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Escribe el usuario.")
  .min(3, "El usuario debe tener al menos 3 caracteres.")
  .max(30, "El usuario puede tener hasta 30 caracteres.")
  .regex(PATRON_NOMBRE_USUARIO, "Solo letras sin tildes, números, punto, guion o guion bajo.");

/** Los usuarios no tienen correo; Better Auth exige uno, así que se genera uno interno. */
export function correoInterno(nombreUsuario: string): string {
  return `${nombreUsuario}@usuarios.toctar.local`;
}

export const esquemaContrasena = z
  .string()
  .min(8, "La contraseña debe tener al menos 8 caracteres.")
  .max(128, "La contraseña puede tener hasta 128 caracteres.");
