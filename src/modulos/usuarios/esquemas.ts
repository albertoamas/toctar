import { z } from "zod";
import { PERMISOS } from "@/lib/permisos";
import { esquemaContrasena, esquemaNombreUsuario } from "@/lib/usuarios";

// Validación de los formularios de usuarios: el mismo esquema en el formulario y en el servidor.

const esquemaNombre = z.string().trim().min(2, "Escribe el nombre completo.").max(60, "Hasta 60 caracteres.");
const esquemaPermisos = z.array(z.enum(PERMISOS)).default([]);
const esquemaId = z.coerce.number().int().positive();

/**
 * Una contraseña nueva se escribe dos veces (hallazgo 5 de la prueba en celulares, 15/11): un error de tipeo en el
 * celular dejaba a la persona sin poder entrar. El error va en el campo de repetirla.
 */
const NO_COINCIDEN = "Las contraseñas no coinciden: escríbela igual en los dos campos.";
const repetir = z.string({ message: "Repite la contraseña." });
function coinciden(campo: string) {
  return (d: Record<string, unknown>, ctx: z.RefinementCtx) => {
    if (d.repetir !== d[campo]) ctx.addIssue({ code: "custom", path: ["repetir"], message: NO_COINCIDEN });
  };
}

export const esquemaCrearUsuario = z
  .object({
    nombre: esquemaNombre,
    usuario: esquemaNombreUsuario,
    contrasena: esquemaContrasena,
    repetir,
    // Pedido 50: siempre un encargado, sin rol que elegir
    permisos: esquemaPermisos,
  })
  .superRefine(coinciden("contrasena"));

// La ficha del usuario se guarda por partes (C6): cada modal cambia solo lo suyo. Así un cambio de nombre no puede
// devolver los permisos que otro dueño acaba de cambiar, ni al revés.
export const esquemaDatosUsuario = z.object({ id: esquemaId, nombre: esquemaNombre });
export const esquemaPermisosUsuario = z.object({ id: esquemaId, permisos: esquemaPermisos });

export const esquemaRestablecer = z.object({ id: esquemaId, contrasena: esquemaContrasena, repetir }).superRefine(coinciden("contrasena"));
export const esquemaIdUsuario = z.object({ id: esquemaId });
/** Pedido 50: el dueño cambia su contraseña con la actual. */
export const esquemaMiContrasena = z
  .object({ actual: z.string().min(1, "Escribe tu contraseña actual.").max(128, "La contraseña actual no es correcta."), nueva: esquemaContrasena, repetir })
  .superRefine(coinciden("nueva"));
