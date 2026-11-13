"use server";

import { eq } from "drizzle-orm";
import { APIError } from "better-auth/api";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect, RedirectType } from "next/navigation";
import { db } from "@/db";
import { usuarioPermiso } from "@/db/esquema";
import { auth } from "@/lib/auth";
import { erroresDe, type EstadoFormulario } from "@/lib/formularios";
import type { Permiso } from "@/lib/permisos";
import { exigirModulo } from "@/lib/sesion";
import { correoInterno } from "@/lib/usuarios";
import { claveDeCambio, conLimiteDeIntentos } from "@/modulos/acceso/limite";
import { VENTANA_MINUTOS } from "@/modulos/acceso/reglas";
import { obtenerUsuario } from "./consultas";
import { esquemaCrearUsuario, esquemaDatosUsuario, esquemaIdUsuario, esquemaMiContrasena, esquemaPermisosUsuario, esquemaRestablecer } from "./esquemas";
import { NO_SE_CAMBIA_DUENO, puedeCambiar, type CambioDeCuenta } from "./reglas";

// Gestión de usuarios (HU-02, HU-03). Solo el dueño entra al módulo "usuarios". Pedido 50 (RN-15): se crean encargados y
// la cuenta de un dueño no se cambia desde aquí, salvo su nombre y su contraseña (con la actual), y por él mismo.
// Toda llamada a auth.api.* lleva los headers de la sesión: sin ellos, Better Auth no verifica permisos.

const RUTA = "/panel/usuarios";

function valoresDe(datos: FormData): Record<string, string> {
  const v: Record<string, string> = {};
  for (const clave of ["nombre", "usuario"]) v[clave] = String(datos.get(clave) ?? "");
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
 * Si se le puede hacer ese cambio al usuario `id` (RN-15); si no, el mensaje para la persona. Nada del panel convierte a
 * un encargado en dueño: lo que se mira aquí sigue valiendo mientras dura la acción.
 */
async function noSePuede(id: number, autorId: number, cambio: CambioDeCuenta): Promise<string | null> {
  const objetivo = await obtenerUsuario(id);
  if (!objetivo) return "Ese usuario ya no existe.";
  return puedeCambiar(objetivo, autorId, cambio) ? null : NO_SE_CAMBIA_DUENO;
}

/** Reemplaza los permisos de un encargado, en una transacción. */
async function guardarPermisos(usuarioId: number, permisos: Permiso[], autorId: number) {
  await db.transaction(async (tx) => {
    await tx.delete(usuarioPermiso).where(eq(usuarioPermiso.usuarioId, usuarioId));
    if (permisos.length > 0) await tx.insert(usuarioPermiso).values(permisos.map((permiso) => ({ usuarioId, permiso, createdBy: autorId })));
  });
}

/** Crea un encargado (pedido 50: un dueño solo se crea desde el servidor, `DUENO_RECUPERAR_*` en arranque.ts). */
export async function crearUsuario(_previo: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const autor = await exigirModulo("usuarios");
  const entrada = esquemaCrearUsuario.safeParse({
    nombre: datos.get("nombre"),
    usuario: datos.get("usuario"),
    contrasena: datos.get("contrasena"),
    permisos: datos.getAll("permisos"),
  });
  if (!entrada.success) return { errores: erroresDe(entrada.error), valores: valoresDe(datos) };
  const { nombre, usuario, contrasena, permisos } = entrada.data;

  let id: number;
  try {
    const { user } = await auth.api.createUser({
      // Sin role: queda el de defecto, encargado (auth.ts). Pedir uno exige "set-role", que el dueño ya no tiene
      body: { email: correoInterno(usuario), name: nombre, password: contrasena, data: { username: usuario } },
      headers: await headers(),
    });
    id = Number(user.id);
  } catch (error) {
    if (usuarioRepetido(error)) return { errores: { usuario: "Ese usuario ya existe. Elige otro." }, valores: valoresDe(datos) };
    throw error;
  }

  await guardarPermisos(id, permisos, Number(autor.id));
  revalidatePath(RUTA);
  // Reemplaza al formulario en el historial: "atrás" no vuelve a él (pedido 43)
  redirect(`${RUTA}?creado=${encodeURIComponent(nombre)}`, RedirectType.replace);
}

/** El nombre de un usuario (la parte "Datos" de su ficha, C6): de un encargado, o el propio. No toca los permisos. */
export async function guardarDatosUsuario(_previo: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const autor = await exigirModulo("usuarios");
  const entrada = esquemaDatosUsuario.safeParse({ id: datos.get("id"), nombre: datos.get("nombre") });
  if (!entrada.success) return { errores: erroresDe(entrada.error), valores: valoresDe(datos) };
  const { id, nombre } = entrada.data;

  const mensaje = await noSePuede(id, Number(autor.id), "nombre");
  if (mensaje) return { mensaje };
  await auth.api.adminUpdateUser({ body: { userId: String(id), data: { name: nombre } }, headers: await headers() });

  revalidatePath(RUTA);
  revalidatePath(`${RUTA}/${id}`);
  return { ok: true, mensaje: "Datos guardados." };
}

/** Los permisos de un encargado (la parte "Permisos" de su ficha, C6). No toca el nombre. */
export async function guardarPermisosUsuario(_previo: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const autor = await exigirModulo("usuarios");
  const entrada = esquemaPermisosUsuario.safeParse({ id: datos.get("id"), permisos: datos.getAll("permisos") });
  if (!entrada.success) return { errores: erroresDe(entrada.error), valores: valoresDe(datos) };
  const { id, permisos } = entrada.data;

  const mensaje = await noSePuede(id, Number(autor.id), "permisos");
  if (mensaje) return { mensaje };
  await guardarPermisos(id, permisos, Number(autor.id));

  revalidatePath(RUTA);
  revalidatePath(`${RUTA}/${id}`);
  return { ok: true, mensaje: "Permisos guardados." };
}

/** La contraseña de un encargado. La de un dueño, también la propia, no se restablece: se cambia con la actual. */
export async function restablecerContrasena(_previo: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const autor = await exigirModulo("usuarios");
  const entrada = esquemaRestablecer.safeParse({ id: datos.get("id"), contrasena: datos.get("contrasena") });
  if (!entrada.success) return { errores: erroresDe(entrada.error) };
  const { id, contrasena } = entrada.data;

  const mensaje = await noSePuede(id, Number(autor.id), "contrasena");
  if (mensaje) return { mensaje };
  const h = await headers();
  await auth.api.setUserPassword({ body: { userId: String(id), newPassword: contrasena }, headers: h });
  // Cierra las sesiones abiertas con la contraseña anterior
  await auth.api.revokeUserSessions({ body: { userId: String(id) }, headers: h });
  return { ok: true, mensaje: "Contraseña cambiada. Avísale a la persona." };
}

/**
 * El dueño cambia su propia contraseña, con la actual (pedido 50): con su celular y la sesión abierta, nadie se la cambia
 * sin saberla. Con el límite de intentos del ingreso, y cierra sus demás sesiones.
 */
export async function cambiarMiContrasena(_previo: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const autor = await exigirModulo("usuarios");
  const entrada = esquemaMiContrasena.safeParse({ actual: datos.get("actual"), nueva: datos.get("nueva") });
  if (!entrada.success) return { errores: erroresDe(entrada.error) };
  const { actual, nueva } = entrada.data;

  const yo = await obtenerUsuario(Number(autor.id));
  if (!yo) return { mensaje: "Tu usuario ya no existe." };
  const h = await headers();
  // Sin revokeOtherSessions de changePassword: también reemplaza la sesión actual y la pantalla la pierde. Se cierran las
  // otras aparte, con la de ahora intacta. Solo la actual equivocada cuenta como intento; otro error de Better Auth sube
  const resultado = await conLimiteDeIntentos(
    claveDeCambio(yo.usuario),
    () => auth.api.changePassword({ body: { currentPassword: actual, newPassword: nueva }, headers: h }),
    (error) => (error.body as { code?: string } | undefined)?.code === "INVALID_PASSWORD",
  );
  if (resultado === "bloqueado") return { errores: { actual: `Demasiados intentos. Espera ${VENTANA_MINUTOS} minutos y vuelve a probar.` } };
  if (resultado === "incorrecto") return { errores: { actual: "La contraseña actual no es correcta." } };
  // La contraseña ya cambió: si cerrar las otras sesiones falla, se dice, pero no como si no hubiera cambiado
  try {
    await auth.api.revokeOtherSessions({ headers: h });
  } catch (error) {
    console.error("[usuarios] No se cerraron las otras sesiones tras cambiar la contraseña", error);
    return { ok: true, mensaje: "Contraseña cambiada. No se pudieron cerrar tus otras sesiones: vuelve a cambiarla más tarde." };
  }
  return { ok: true, mensaje: "Contraseña cambiada. Se cerraron tus otras sesiones." };
}

/** Desactiva a un encargado: así siempre queda un dueño activo (RN-15). */
export async function desactivarUsuario(_previo: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const autor = await exigirModulo("usuarios");
  const entrada = esquemaIdUsuario.safeParse({ id: datos.get("id") });
  if (!entrada.success) return { mensaje: "No se encontró el usuario." };
  const { id } = entrada.data;

  const mensaje = await noSePuede(id, Number(autor.id), "acceso");
  if (mensaje) return { mensaje };
  await auth.api.banUser({ body: { userId: String(id), banReason: "Desactivado por el dueño" }, headers: await headers() });
  revalidatePath(RUTA);
  revalidatePath(`${RUTA}/${id}`);
  return { ok: true, mensaje: "Usuario desactivado. Ya no puede ingresar y sus sesiones se cerraron." };
}

/** Reactiva a un encargado. Un dueño desactivado (solo desde el servidor) se reactiva desde el servidor. */
export async function reactivarUsuario(_previo: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const autor = await exigirModulo("usuarios");
  const entrada = esquemaIdUsuario.safeParse({ id: datos.get("id") });
  if (!entrada.success) return { mensaje: "No se encontró el usuario." };
  const { id } = entrada.data;

  const mensaje = await noSePuede(id, Number(autor.id), "acceso");
  if (mensaje) return { mensaje };
  await auth.api.unbanUser({ body: { userId: String(id) }, headers: await headers() });
  revalidatePath(RUTA);
  revalidatePath(`${RUTA}/${id}`);
  return { ok: true, mensaje: "Usuario reactivado. Ya puede ingresar con su contraseña." };
}
