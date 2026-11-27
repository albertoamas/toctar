"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { esquemaIngreso, type EstadoIngreso } from "./esquemas";
import { conLimiteDeIntentos } from "./limite";
import { MENSAJE_BLOQUEO } from "./reglas";

// Mismo mensaje para usuario inexistente, contraseña incorrecta o usuario desactivado:
// no revela cuál de los datos falló (HU-01).
const ERROR_GENERICO = "Usuario o contraseña incorrectos.";

export async function iniciarSesion(_previo: EstadoIngreso, datos: FormData): Promise<EstadoIngreso> {
  const escrito = String(datos.get("usuario") ?? "");
  const entrada = esquemaIngreso.safeParse({ usuario: escrito, contrasena: String(datos.get("contrasena") ?? "") });
  if (!entrada.success) return { error: entrada.error.issues[0].message, usuario: escrito };
  const { usuario, contrasena } = entrada.data;
  const h = await headers();
  const resultado = await conLimiteDeIntentos(usuario, () => auth.api.signInUsername({ body: { username: usuario, password: contrasena }, headers: h }));
  if (resultado === "bloqueado") return { error: MENSAJE_BLOQUEO, usuario };
  if (resultado === "incorrecto") return { error: ERROR_GENERICO, usuario };
  redirect("/panel");
}

export async function cerrarSesion() {
  await auth.api.signOut({ headers: await headers() });
  redirect("/ingresar");
}
