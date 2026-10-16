"use server";

import { eq } from "drizzle-orm";
import { APIError } from "better-auth/api";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { z } from "zod";
import { db } from "@/db";
import { usuarioPermiso } from "@/db/esquema";
import { auth } from "@/lib/auth";
import type { Permiso } from "@/lib/permisos";
import type { Rol } from "@/lib/roles";
import { exigirModulo } from "@/lib/sesion";
import { correoInterno } from "@/lib/usuarios";
import { listarUsuarios } from "./consultas";
import {
  esquemaActualizarUsuario,
  esquemaCrearUsuario,
  esquemaIdUsuario,
  esquemaRestablecer,
  type EstadoFormulario,
} from "./esquemas";
import { cambioDeRolDejaSinDueno } from "./reglas";

// Gestión de usuarios (HU-02, HU-03). Solo el dueño entra al módulo "usuarios".
// Toda llamada a auth.api.* lleva los headers de la sesión: sin ellos, Better Auth no verifica permisos.

const RUTA = "/panel/usuarios";

function erroresDe(error: z.ZodError): EstadoFormulario["errores"] {
  const errores: Record<string, string> = {};
  for (const i of error.issues) errores[String(i.path[0])] ??= i.message;
  return errores;
}

function valoresDe(datos: FormData): Record<string, string> {
  const v: Record<string, string> = {};
  for (const clave of ["nombre", "usuario", "rol"]) v[clave] = String(datos.get(clave) ?? "");
  v.permisos = datos.getAll("permisos").join(",");
  return v;
}

/**
 * Better Auth avisa así que el usuario ya existe (el correo interno sale del nombre de usuario).
 * Cualquier otro error no se disfraza de "ya existe": se deja subir para verlo en los registros.
 */
function usuarioRepetido(error: unknown): boolean {
  if (!(error instanceof APIError)) return false;
  const codigo = (error.body as { code?: string } | undefined)?.code ?? "";
  return codigo === "USERNAME_IS_ALREADY_TAKEN" || codigo.startsWith("USER_ALREADY_EXISTS");
}

/** Reemplaza los permisos de un usuario: solo los encargados guardan permisos. */
async function guardarPermisos(usuarioId: number, rol: Rol, permisos: Permiso[], autorId: number) {
  await db.transaction(async (tx) => {
    await tx.delete(usuarioPermiso).where(eq(usuarioPermiso.usuarioId, usuarioId));
    if (rol === "encargado" && permisos.length > 0) {
      await tx.insert(usuarioPermiso).values(permisos.map((permiso) => ({ usuarioId, permiso, createdBy: autorId })));
    }
  });
}

export async function crearUsuario(_previo: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const autor = await exigirModulo("usuarios");
  const entrada = esquemaCrearUsuario.safeParse({
    nombre: datos.get("nombre"),
    usuario: datos.get("usuario"),
    contrasena: datos.get("contrasena"),
    rol: datos.get("rol"),
    permisos: datos.getAll("permisos"),
  });
  if (!entrada.success) return { errores: erroresDe(entrada.error), valores: valoresDe(datos) };
  const { nombre, usuario, contrasena, rol, permisos } = entrada.data;

  let id: number;
  try {
    const { user } = await auth.api.createUser({
      body: { email: correoInterno(usuario), name: nombre, password: contrasena, role: rol, data: { username: usuario } },
      headers: await headers(),
    });
    id = Number(user.id);
  } catch (error) {
    if (usuarioRepetido(error)) return { errores: { usuario: "Ese usuario ya existe. Elige otro." }, valores: valoresDe(datos) };
    throw error;
  }

  await guardarPermisos(id, rol, permisos, Number(autor.id));
  revalidatePath(RUTA);
  redirect(`${RUTA}?creado=${encodeURIComponent(nombre)}`);
}

export async function actualizarUsuario(_previo: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const autor = await exigirModulo("usuarios");
  const entrada = esquemaActualizarUsuario.safeParse({
    id: datos.get("id"),
    nombre: datos.get("nombre"),
    rol: datos.get("rol"),
    permisos: datos.getAll("permisos"),
  });
  if (!entrada.success) return { errores: erroresDe(entrada.error), valores: valoresDe(datos) };
  const { id, nombre, rol, permisos } = entrada.data;

  const usuarios = await listarUsuarios();
  const actual = usuarios.find((u) => u.id === id);
  if (!actual) return { mensaje: "Ese usuario ya no existe." };
  if (cambioDeRolDejaSinDueno(usuarios, id, rol)) {
    return { errores: { rol: "Es el único dueño activo: crea otro dueño antes de cambiarle el rol." }, valores: valoresDe(datos) };
  }

  const h = await headers();
  await auth.api.adminUpdateUser({ body: { userId: String(id), data: { name: nombre } }, headers: h });
  if (rol !== actual.rol) await auth.api.setRole({ body: { userId: String(id), role: rol }, headers: h });
  await guardarPermisos(id, rol, permisos, Number(autor.id));

  revalidatePath(RUTA);
  revalidatePath(`${RUTA}/${id}`);
  return { ok: true, mensaje: "Cambios guardados." };
}

export async function restablecerContrasena(_previo: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const autor = await exigirModulo("usuarios");
  const entrada = esquemaRestablecer.safeParse({ id: datos.get("id"), contrasena: datos.get("contrasena") });
  if (!entrada.success) return { errores: erroresDe(entrada.error) };
  const { id, contrasena } = entrada.data;

  const h = await headers();
  await auth.api.setUserPassword({ body: { userId: String(id), newPassword: contrasena }, headers: h });
  // Cierra las sesiones abiertas con la contraseña anterior (salvo si el dueño cambia la suya).
  if (String(id) !== autor.id) await auth.api.revokeUserSessions({ body: { userId: String(id) }, headers: h });
  return { ok: true, mensaje: "Contraseña cambiada. Avísale a la persona." };
}

export async function desactivarUsuario(_previo: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const autor = await exigirModulo("usuarios");
  const entrada = esquemaIdUsuario.safeParse({ id: datos.get("id") });
  if (!entrada.success) return { mensaje: "No se encontró el usuario." };
  const { id } = entrada.data;

  // Better Auth no permite bloquearse a uno mismo; así además siempre queda un dueño activo.
  if (String(id) === autor.id) return { mensaje: "No puedes desactivar tu propio usuario. Pídeselo a otro dueño." };

  await auth.api.banUser({ body: { userId: String(id), banReason: "Desactivado por el dueño" }, headers: await headers() });
  revalidatePath(RUTA);
  revalidatePath(`${RUTA}/${id}`);
  return { ok: true, mensaje: "Usuario desactivado. Ya no puede ingresar y sus sesiones se cerraron." };
}

export async function reactivarUsuario(_previo: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  await exigirModulo("usuarios");
  const entrada = esquemaIdUsuario.safeParse({ id: datos.get("id") });
  if (!entrada.success) return { mensaje: "No se encontró el usuario." };
  const { id } = entrada.data;

  await auth.api.unbanUser({ body: { userId: String(id) }, headers: await headers() });
  revalidatePath(RUTA);
  revalidatePath(`${RUTA}/${id}`);
  return { ok: true, mensaje: "Usuario reactivado. Ya puede ingresar con su contraseña." };
}
