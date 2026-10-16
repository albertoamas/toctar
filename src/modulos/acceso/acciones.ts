"use server";

import { and, eq, gt, lt, or, sql } from "drizzle-orm";
import { APIError } from "better-auth/api";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { intentoIngreso } from "@/db/esquema";
import { auth } from "@/lib/auth";
import { codigoDeConexion } from "@/lib/conexion";
import { esquemaIngreso, type EstadoIngreso } from "./esquemas";
import { MENSAJE_BLOQUEO, VENTANA_MINUTOS, ingresoBloqueado, type Fallos } from "./reglas";

// Mismo mensaje para usuario inexistente, contraseña incorrecta o usuario desactivado:
// no revela cuál de los datos falló (HU-01).
const ERROR_GENERICO = "Usuario o contraseña incorrectos.";

async function contarIntentos(usuario: string, ipHash: string): Promise<Fallos> {
  const desde = new Date(Date.now() - VENTANA_MINUTOS * 60_000);
  const delUsuario = eq(intentoIngreso.usuario, usuario);
  const deLaConexion = eq(intentoIngreso.ipHash, ipHash);
  const [f] = await db
    .select({
      usuarioYConexion: sql<number>`count(*) filter (where ${and(delUsuario, deLaConexion)})`.mapWith(Number),
      conexion: sql<number>`count(*) filter (where ${deLaConexion})`.mapWith(Number),
      usuario: sql<number>`count(*) filter (where ${delUsuario})`.mapWith(Number),
    })
    .from(intentoIngreso)
    .where(and(gt(intentoIngreso.createdAt, desde), or(delUsuario, deLaConexion)));
  return f;
}

export async function iniciarSesion(_previo: EstadoIngreso, datos: FormData): Promise<EstadoIngreso> {
  const escrito = String(datos.get("usuario") ?? "");
  const entrada = esquemaIngreso.safeParse({ usuario: escrito, contrasena: String(datos.get("contrasena") ?? "") });
  if (!entrada.success) return { error: entrada.error.issues[0].message, usuario: escrito };
  const { usuario, contrasena } = entrada.data;
  const ipHash = await codigoDeConexion();

  // Se anota el intento ANTES de probar la contraseña y recién después se cuenta (incluido este).
  // Así varios intentos al mismo tiempo se ven entre sí y no pasan juntos el límite, sin candados
  // ni transacciones abiertas mientras Better Auth verifica la contraseña.
  const [intento] = await db.insert(intentoIngreso).values({ usuario, ipHash }).returning({ id: intentoIngreso.id });
  const quitarIntento = () => db.delete(intentoIngreso).where(eq(intentoIngreso.id, intento.id));
  const f = await contarIntentos(usuario, ipHash);
  if (ingresoBloqueado({ usuarioYConexion: f.usuarioYConexion - 1, conexion: f.conexion - 1, usuario: f.usuario - 1 })) {
    // Un intento rechazado no cuenta: la espera no se alarga mientras alguien sigue probando.
    await quitarIntento();
    return { error: MENSAJE_BLOQUEO, usuario };
  }

  try {
    await auth.api.signInUsername({ body: { username: usuario, password: contrasena }, headers: await headers() });
  } catch (error) {
    if (!(error instanceof APIError)) {
      await quitarIntento();
      throw error;
    }
    // El intento queda anotado como fallido. Los de más de un día ya no sirven.
    await db.delete(intentoIngreso).where(lt(intentoIngreso.createdAt, new Date(Date.now() - 24 * 3_600_000)));
    return { error: ERROR_GENERICO, usuario };
  }

  // Ingresó: sus fallos (y este intento) se borran.
  await db.delete(intentoIngreso).where(eq(intentoIngreso.usuario, usuario));
  redirect("/panel");
}

export async function cerrarSesion() {
  await auth.api.signOut({ headers: await headers() });
  redirect("/ingresar");
}
