"use server";

import { APIError } from "better-auth/api";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { esquemaIngreso, type EstadoIngreso } from "./esquemas";

// Mismo mensaje para usuario inexistente, contraseña incorrecta o usuario desactivado:
// no revela cuál de los datos falló (HU-01).
const ERROR_GENERICO = "Usuario o contraseña incorrectos.";

export async function iniciarSesion(_previo: EstadoIngreso, datos: FormData): Promise<EstadoIngreso> {
  const entrada = esquemaIngreso.safeParse({
    usuario: datos.get("usuario"),
    contrasena: datos.get("contrasena"),
  });
  if (!entrada.success) {
    return { error: entrada.error.issues[0].message, usuario: String(datos.get("usuario") ?? "") };
  }

  try {
    await auth.api.signInUsername({
      body: { username: entrada.data.usuario, password: entrada.data.contrasena },
      headers: await headers(),
    });
  } catch (error) {
    if (error instanceof APIError && error.statusCode === 429) {
      return { error: "Demasiados intentos. Espera un minuto y vuelve a probar.", usuario: entrada.data.usuario };
    }
    if (error instanceof APIError) return { error: ERROR_GENERICO, usuario: entrada.data.usuario };
    throw error;
  }

  redirect("/panel");
}

export async function cerrarSesion() {
  await auth.api.signOut({ headers: await headers() });
  redirect("/ingresar");
}
