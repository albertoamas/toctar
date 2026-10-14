import { z } from "zod";

export const esquemaIngreso = z.object({
  usuario: z.string().trim().toLowerCase().min(1, "Escribe tu usuario."),
  contrasena: z.string().min(1, "Escribe tu contraseña."),
});

export type EstadoIngreso = { error?: string; usuario?: string };
