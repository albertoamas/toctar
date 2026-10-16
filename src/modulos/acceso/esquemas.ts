import { z } from "zod";

// Ingreso (HU-01). La contraseña tiene el mismo largo máximo que al crearla (src/lib/usuarios.ts):
// una más larga no puede ser correcta y así no se calcula el hash de textos enormes.
export const esquemaIngreso = z.object({
  usuario: z.string().trim().toLowerCase().min(1, "Escribe tu usuario.").max(30, "Usuario o contraseña incorrectos."),
  contrasena: z.string().min(1, "Escribe tu contraseña.").max(128, "Usuario o contraseña incorrectos."),
});

export type EstadoIngreso = { error?: string; usuario?: string };
