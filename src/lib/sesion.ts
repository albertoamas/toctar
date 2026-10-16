import "server-only";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "@/db";
import { usuarioPermiso } from "@/db/esquema";
import { auth } from "@/lib/auth";
import { puedeVerModulo, type Modulo, type Permiso } from "@/lib/permisos";
import type { Rol } from "@/lib/roles";

// Capa de acceso a la sesión. Toda página y toda acción del panel la usa: el layout
// no protege a sus páginas (se renderizan en paralelo) y proxy.ts solo redirige rápido.

export type UsuarioActual = {
  id: string;
  nombre: string;
  usuario: string;
  rol: Rol;
  /** Solo los encargados tienen permisos guardados; para dueño y técnico va vacío. */
  permisos: Permiso[];
};

/** Usuario de la sesión, o null. Una sola lectura por pedido. Leerla va dentro de <Suspense>. */
const obtenerUsuarioActual = cache(async (): Promise<UsuarioActual | null> => {
  const sesion = await auth.api.getSession({ headers: await headers() });
  if (!sesion || sesion.user.banned) return null;
  const rol = sesion.user.role as Rol;
  const permisos =
    rol === "encargado"
      ? (
          await db
            .select({ permiso: usuarioPermiso.permiso })
            .from(usuarioPermiso)
            .where(eq(usuarioPermiso.usuarioId, Number(sesion.user.id)))
        ).map((p) => p.permiso)
      : [];
  return {
    id: sesion.user.id,
    nombre: sesion.user.name,
    usuario: sesion.user.username ?? "",
    rol,
    permisos,
  };
});

/** Usuario de la sesión; si no hay, lleva a la pantalla de ingreso. */
export async function exigirSesion(): Promise<UsuarioActual> {
  const usuario = await obtenerUsuarioActual();
  if (!usuario) redirect("/ingresar");
  return usuario;
}

/** Para páginas y acciones de un módulo: sin sesión → ingreso; sin permiso → "Sin acceso". */
export async function exigirModulo(modulo: Modulo): Promise<UsuarioActual> {
  const usuario = await exigirSesion();
  if (!puedeVerModulo(usuario, modulo)) redirect("/panel/sin-acceso");
  return usuario;
}
