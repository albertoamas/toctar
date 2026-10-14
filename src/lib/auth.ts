import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { admin, username } from "better-auth/plugins";
import { db } from "@/db";
import * as esquema from "@/db/esquema";
import { controlDeAcceso, roles } from "@/lib/roles";
import { PATRON_NOMBRE_USUARIO } from "@/lib/usuarios";

// Autenticación con usuario y contraseña (HU-01). Nadie se registra solo: los usuarios
// los crea el dueño desde el panel (HU-02) o el script del primer dueño.
//
// IMPORTANTE: las funciones de auth.api.* del plugin admin (createUser, banUser,
// setUserPassword...) solo verifican permisos si reciben los headers de la sesión.
// En acciones del panel, pasar SIEMPRE `headers: await headers()`.

const DIA = 60 * 60 * 24;

export const auth = betterAuth({
  appName: "TocTar",
  database: drizzleAdapter(db, { provider: "pg", schema: esquema }),
  advanced: {
    database: { generateId: "serial" },
  },
  user: { modelName: "usuario" },
  session: {
    modelName: "sesion",
    // Vence tras 7 días sin uso; cada día de uso extiende el plazo (RNF-04).
    expiresIn: 7 * DIA,
    updateAge: DIA,
  },
  account: { modelName: "cuenta" },
  verification: { modelName: "verificacion" },
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    minPasswordLength: 8,
  },
  plugins: [
    username({
      minUsernameLength: 3,
      maxUsernameLength: 30,
      displayUsername: false,
      // El mismo patrón que el formulario: el validador por defecto del plugin no acepta guiones.
      usernameValidator: (nombre) => PATRON_NOMBRE_USUARIO.test(nombre),
    }),
    admin({
      ac: controlDeAcceso,
      roles,
      adminRoles: ["dueno"],
      defaultRole: "tecnico",
      bannedUserMessage: "Usuario o contraseña incorrectos.",
    }),
    nextCookies(), // siempre al final
  ],
});

export type Sesion = typeof auth.$Infer.Session;
