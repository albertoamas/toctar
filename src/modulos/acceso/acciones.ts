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

type Transaccion = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function contarFallos(tx: Transaccion, usuario: string, ipHash: string): Promise<Fallos> {
  const desde = new Date(Date.now() - VENTANA_MINUTOS * 60_000);
  const delUsuario = eq(intentoIngreso.usuario, usuario);
  const deLaConexion = eq(intentoIngreso.ipHash, ipHash);
  const [f] = await tx
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
  const h = await headers();

  // Un candado por usuario: varios intentos al mismo tiempo se cuentan de a uno y no pasan juntos el límite.
  const resultado = await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`ingreso:${usuario}`}, 0))`);
    if (ingresoBloqueado(await contarFallos(tx, usuario, ipHash))) return "bloqueado" as const;
    try {
      await auth.api.signInUsername({ body: { username: usuario, password: contrasena }, headers: h });
    } catch (error) {
      if (!(error instanceof APIError)) throw error;
      await tx.insert(intentoIngreso).values({ usuario, ipHash });
      await tx.delete(intentoIngreso).where(lt(intentoIngreso.createdAt, new Date(Date.now() - 24 * 3_600_000)));
      return "incorrecto" as const;
    }
    await tx.delete(intentoIngreso).where(eq(intentoIngreso.usuario, usuario));
    return "ok" as const;
  });

  if (resultado === "bloqueado") return { error: MENSAJE_BLOQUEO, usuario };
  if (resultado === "incorrecto") return { error: ERROR_GENERICO, usuario };
  redirect("/panel");
}

export async function cerrarSesion() {
  await auth.api.signOut({ headers: await headers() });
  redirect("/ingresar");
}
