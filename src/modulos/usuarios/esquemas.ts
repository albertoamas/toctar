import { z } from "zod";
import { PERMISOS } from "@/lib/permisos";
import { esquemaContrasena, esquemaNombreUsuario } from "@/lib/usuarios";

// Validación de los formularios de usuarios: el mismo esquema en el formulario y en el servidor.

const esquemaNombre = z.string().trim().min(2, "Escribe el nombre completo.").max(60, "Hasta 60 caracteres.");
const esquemaPermisos = z.array(z.enum(PERMISOS)).default([]);
const esquemaId = z.coerce.number().int().positive();

export const esquemaCrearUsuario = z.object({
  nombre: esquemaNombre,
  usuario: esquemaNombreUsuario,
  contrasena: esquemaContrasena,
  // Pedido 50: siempre un encargado, sin rol que elegir
  permisos: esquemaPermisos,
});

// La ficha del usuario se guarda por partes (C6): cada modal cambia solo lo suyo. Así un cambio de nombre no puede
// devolver los permisos que otro dueño acaba de cambiar, ni al revés.
export const esquemaDatosUsuario = z.object({ id: esquemaId, nombre: esquemaNombre });
export const esquemaPermisosUsuario = z.object({ id: esquemaId, permisos: esquemaPermisos });

export const esquemaRestablecer = z.object({ id: esquemaId, contrasena: esquemaContrasena });
export const esquemaIdUsuario = z.object({ id: esquemaId });
/** Pedido 50: el dueño cambia su contraseña con la actual. */
export const esquemaMiContrasena = z.object({ actual: z.string().min(1, "Escribe tu contraseña actual.").max(128, "La contraseña actual no es correcta."), nueva: esquemaContrasena });
