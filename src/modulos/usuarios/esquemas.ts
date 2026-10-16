import { z } from "zod";
import { PERMISOS } from "@/lib/permisos";
import { ROLES } from "@/lib/roles";
import { esquemaContrasena, esquemaNombreUsuario } from "@/lib/usuarios";

// Validación de los formularios de usuarios: el mismo esquema en el formulario y en el servidor.

const esquemaNombre = z.string().trim().min(2, "Escribe el nombre completo.").max(60, "Hasta 60 caracteres.");
const esquemaRol = z.enum(ROLES, { error: "Elige un rol." });
const esquemaPermisos = z.array(z.enum(PERMISOS)).default([]);
const esquemaId = z.coerce.number().int().positive();

export const esquemaCrearUsuario = z.object({
  nombre: esquemaNombre,
  usuario: esquemaNombreUsuario,
  contrasena: esquemaContrasena,
  rol: esquemaRol,
  permisos: esquemaPermisos,
});

export const esquemaActualizarUsuario = z.object({
  id: esquemaId,
  nombre: esquemaNombre,
  rol: esquemaRol,
  permisos: esquemaPermisos,
});

export const esquemaRestablecer = z.object({ id: esquemaId, contrasena: esquemaContrasena });
export const esquemaIdUsuario = z.object({ id: esquemaId });
