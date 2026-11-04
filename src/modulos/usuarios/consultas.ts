import "server-only";
import { asc, eq } from "drizzle-orm";
import { db, type Transaccion } from "@/db";
import { usuario, usuarioPermiso } from "@/db/esquema";
import type { Permiso } from "@/lib/permisos";
import type { Rol } from "@/lib/roles";

// Lecturas del módulo de usuarios. Quien las llama ya pasó por exigirModulo("usuarios").

export type FilaUsuario = {
  id: number;
  nombre: string;
  usuario: string;
  rol: Rol;
  desactivado: boolean;
};

const columnas = {
  id: usuario.id,
  nombre: usuario.name,
  usuario: usuario.username,
  rol: usuario.role,
  desactivado: usuario.banned,
};

const aFila = (u: { id: number; nombre: string; usuario: string | null; rol: string; desactivado: boolean | null }): FilaUsuario => ({
  ...u,
  usuario: u.usuario ?? "",
  rol: u.rol as Rol,
  desactivado: u.desactivado ?? false,
});

/** Todos los usuarios: activos primero, después por nombre. Con `con`, dentro de una transacción. */
export async function listarUsuarios(con: typeof db | Transaccion = db): Promise<FilaUsuario[]> {
  const filas = await con.select(columnas).from(usuario).orderBy(asc(usuario.banned), asc(usuario.name));
  return filas.map(aFila);
}

export async function obtenerUsuario(id: number): Promise<(FilaUsuario & { permisos: Permiso[] }) | null> {
  const [fila] = await db.select(columnas).from(usuario).where(eq(usuario.id, id));
  if (!fila) return null;
  const permisos = await db
    .select({ permiso: usuarioPermiso.permiso })
    .from(usuarioPermiso)
    .where(eq(usuarioPermiso.usuarioId, id));
  return { ...aFila(fila), permisos: permisos.map((p) => p.permiso) };
}
