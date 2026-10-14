import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "@/lib/auth";
import type { Rol } from "@/lib/roles";

// Capa de acceso a la sesión. Toda página y toda acción del panel la usa: el layout
// no protege a sus páginas (se renderizan en paralelo) y proxy.ts solo redirige rápido.

export type UsuarioActual = {
  id: string;
  nombre: string;
  usuario: string;
  rol: Rol;
};

/** Usuario de la sesión, o null. Una sola lectura por pedido. Leerla va dentro de <Suspense>. */
export const obtenerUsuarioActual = cache(async (): Promise<UsuarioActual | null> => {
  const sesion = await auth.api.getSession({ headers: await headers() });
  if (!sesion || sesion.user.banned) return null;
  return {
    id: sesion.user.id,
    nombre: sesion.user.name,
    usuario: sesion.user.username ?? "",
    rol: sesion.user.role as Rol,
  };
});

/** Usuario de la sesión; si no hay, lleva a la pantalla de ingreso. */
export async function exigirSesion(): Promise<UsuarioActual> {
  const usuario = await obtenerUsuarioActual();
  if (!usuario) redirect("/ingresar");
  return usuario;
}
