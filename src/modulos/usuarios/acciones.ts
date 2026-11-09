"use server";

import { eq, sql } from "drizzle-orm";
import { APIError } from "better-auth/api";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db, type Transaccion } from "@/db";
import { usuarioPermiso } from "@/db/esquema";
import { auth } from "@/lib/auth";
import { erroresDe, type EstadoFormulario } from "@/lib/formularios";
import type { Permiso } from "@/lib/permisos";
import type { Rol } from "@/lib/roles";
import { exigirModulo } from "@/lib/sesion";
import { correoInterno } from "@/lib/usuarios";
import { listarUsuarios, obtenerUsuario, type FilaUsuario } from "./consultas";
import {
  esquemaCrearUsuario,
  esquemaDatosUsuario,
  esquemaIdUsuario,
  esquemaRestablecer,
  esquemaRolUsuario,
} from "./esquemas";
import { cambioDeRolDejaSinDueno } from "./reglas";

// Gestión de usuarios (HU-02, HU-03). Solo el dueño entra al módulo "usuarios".
// Toda llamada a auth.api.* lleva los headers de la sesión: sin ellos, Better Auth no verifica permisos.

const RUTA = "/panel/usuarios";

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

/**
 * Los cambios que podrían dejar al negocio sin un dueño activo (cambiar un rol, desactivar) van de a uno, con un candado
 * de la base: dos dueños que se cambian el rol o se desactivan entre sí al mismo tiempo no ven los dos la lista de antes
 * (auditoría QA-09). Dentro se vuelve a leer la lista y se confirma que quien lo pide sigue siendo un dueño activo.
 * La lista se lee con la misma conexión del candado; Better Auth escribe con otra, pero el candado sigue tomado hasta
 * que termina `cambio`, y lo que `cambio` escribe con `tx` (los permisos) se guarda junto con él.
 */
async function deAUnoConLosDuenos<T>(autorId: number, cambio: (usuarios: FilaUsuario[], tx: Transaccion) => Promise<T>): Promise<T | "autor-cambio"> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended('usuarios:duenos', 0))`);
    const usuarios = await listarUsuarios(tx);
    const autor = usuarios.find((u) => u.id === autorId);
    if (autor?.rol !== "dueno" || autor.desactivado) return "autor-cambio";
    return cambio(usuarios, tx);
  });
}

const AUTOR_CAMBIO = "Tu usuario cambió recién (otro dueño te cambió el rol o te desactivó). Recarga la página.";

/** Reemplaza los permisos de un usuario: solo los encargados guardan permisos. Dentro de una transacción. */
async function guardarPermisos(tx: Transaccion, usuarioId: number, rol: Rol, permisos: Permiso[], autorId: number) {
  await tx.delete(usuarioPermiso).where(eq(usuarioPermiso.usuarioId, usuarioId));
  if (rol === "encargado" && permisos.length > 0) {
    await tx.insert(usuarioPermiso).values(permisos.map((permiso) => ({ usuarioId, permiso, createdBy: autorId })));
  }
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

  await db.transaction((tx) => guardarPermisos(tx, id, rol, permisos, Number(autor.id)));
  revalidatePath(RUTA);
  redirect(`${RUTA}?creado=${encodeURIComponent(nombre)}`);
}

/** El nombre de un usuario (la parte "Datos" de su ficha, C6). No toca el rol ni los permisos. */
export async function guardarDatosUsuario(_previo: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  await exigirModulo("usuarios");
  const entrada = esquemaDatosUsuario.safeParse({ id: datos.get("id"), nombre: datos.get("nombre") });
  if (!entrada.success) return { errores: erroresDe(entrada.error), valores: valoresDe(datos) };
  const { id, nombre } = entrada.data;

  const h = await headers();
  if (!(await obtenerUsuario(id))) return { mensaje: "Ese usuario ya no existe." };
  await auth.api.adminUpdateUser({ body: { userId: String(id), data: { name: nombre } }, headers: h });

  revalidatePath(RUTA);
  revalidatePath(`${RUTA}/${id}`);
  return { ok: true, mensaje: "Datos guardados." };
}

/** El rol y los permisos de un usuario (la parte "Rol y permisos" de su ficha, C6). No toca el nombre. */
export async function guardarRolUsuario(_previo: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const autor = await exigirModulo("usuarios");
  const entrada = esquemaRolUsuario.safeParse({ id: datos.get("id"), rol: datos.get("rol"), permisos: datos.getAll("permisos") });
  if (!entrada.success) return { errores: erroresDe(entrada.error), valores: valoresDe(datos) };
  const { id, rol, permisos } = entrada.data;

  const h = await headers();
  const resultado = await deAUnoConLosDuenos(Number(autor.id), async (usuarios, tx) => {
    const actual = usuarios.find((u) => u.id === id);
    if (!actual) return "no-existe" as const;
    if (cambioDeRolDejaSinDueno(usuarios, id, rol)) return "sin-dueno" as const;
    if (rol !== actual.rol) await auth.api.setRole({ body: { userId: String(id), role: rol }, headers: h });
    // Con el candado tomado: otro cambio de rol del mismo usuario no deja permisos de un rol que ya no tiene
    await guardarPermisos(tx, id, rol, permisos, Number(autor.id));
    return "ok" as const;
  });
  if (resultado === "autor-cambio") return { mensaje: AUTOR_CAMBIO };
  if (resultado === "no-existe") return { mensaje: "Ese usuario ya no existe." };
  if (resultado === "sin-dueno") {
    return { errores: { rol: "Es el único dueño activo: crea otro dueño antes de cambiarle el rol." }, valores: valoresDe(datos) };
  }

  revalidatePath(RUTA);
  revalidatePath(`${RUTA}/${id}`);
  return { ok: true, mensaje: "Rol y permisos guardados." };
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

  // De a uno: si dos dueños se desactivan entre sí al mismo tiempo, el segundo ya está desactivado y no sigue
  const h = await headers();
  const resultado = await deAUnoConLosDuenos(Number(autor.id), async () => {
    await auth.api.banUser({ body: { userId: String(id), banReason: "Desactivado por el dueño" }, headers: h });
  });
  if (resultado === "autor-cambio") return { mensaje: AUTOR_CAMBIO };
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
