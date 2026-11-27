import { z } from "zod";
import { PATRON_NOMBRE_USUARIO } from "@/lib/usuarios";

// Ingreso (HU-01). La contraseña tiene el mismo largo máximo que al crearla (src/lib/usuarios.ts):
// una más larga no puede ser correcta y así no se calcula el hash de textos enormes.
export const esquemaIngreso = z.object({
  // Con el patrón de los usuarios (sin ":"): un usuario escrito como "cambio:juan" no suma a los intentos de
  // "Cambiar mi contraseña" de juan (pedido 50, limite.ts). El mismo mensaje: no dice qué falló
  usuario: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Escribe tu usuario.")
    .max(30, "Usuario o contraseña incorrectos.")
    .regex(PATRON_NOMBRE_USUARIO, "Usuario o contraseña incorrectos."),
  contrasena: z.string().min(1, "Escribe tu contraseña.").max(128, "Usuario o contraseña incorrectos."),
});

export type EstadoIngreso = { error?: string; usuario?: string };
