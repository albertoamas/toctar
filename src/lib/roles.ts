import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements } from "better-auth/plugins/admin/access";

// Roles del sistema para el plugin admin de Better Auth. Solo cubren la gestión de
// usuarios y sesiones; los módulos del negocio se controlan en src/lib/permisos.ts.
// Pedido 32: dos roles. Lo que hace cada encargado sale de sus permisos (el técnico era un encargado con menos).

export const ROLES = ["dueno", "encargado"] as const;
export type Rol = (typeof ROLES)[number];

export const controlDeAcceso = createAccessControl(defaultStatements);

export const roles = {
  // Sin "delete" (los usuarios se desactivan, RN-14) ni "impersonate".
  dueno: controlDeAcceso.newRole({
    user: ["create", "list", "set-role", "ban", "set-password", "get", "update"],
    session: ["list", "revoke"],
  }),
  encargado: controlDeAcceso.newRole({ user: [], session: [] }),
};
