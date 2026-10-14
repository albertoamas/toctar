import { relations, sql } from "drizzle-orm";
import { boolean, check, index, integer, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
// Ruta relativa: drizzle-kit también carga este archivo y no conoce el alias "@/".
import { PERMISOS } from "../../lib/permisos";

// Tablas de Better Auth (usuarios, sesiones y credenciales). Los nombres de las
// propiedades son los que espera Better Auth; las columnas están en español.
// Diferencias con el modelo de datos (docs/06-diseno/modelo-de-datos):
// - La contraseña (hash) está en `cuenta.contrasena`, no en `usuario`.
// - `usuario.correo` es interno (Better Auth lo exige): `<usuario>@usuarios.toctar.local`.
// - "Desactivar" un usuario usa el bloqueo del plugin admin (`desactivado`), que además
//   cierra sus sesiones.

const momento = (nombre: string) => timestamp(nombre, { withTimezone: true });

export const usuario = pgTable(
  "usuario",
  {
    id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
    name: text("nombre").notNull(),
    email: text("correo").notNull().unique(),
    emailVerified: boolean("correo_verificado").default(false).notNull(),
    image: text("imagen"),
    username: text("nombre_usuario").unique(),
    role: text("rol").notNull().default("tecnico"),
    banned: boolean("desactivado").default(false),
    banReason: text("motivo_desactivacion"),
    banExpires: momento("desactivado_hasta"),
    createdAt: momento("created_at").defaultNow().notNull(),
    updatedAt: momento("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [check("usuario_rol_valido", sql`${t.role} in ('dueno', 'encargado', 'tecnico')`)],
);

export const sesion = pgTable(
  "sesion",
  {
    id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
    token: text("token").notNull().unique(),
    userId: integer("usuario_id")
      .notNull()
      .references(() => usuario.id, { onDelete: "cascade" }),
    expiresAt: momento("expira_at").notNull(),
    ipAddress: text("ip"),
    userAgent: text("agente_usuario"),
    impersonatedBy: text("suplantado_por"),
    createdAt: momento("created_at").defaultNow().notNull(),
    updatedAt: momento("updated_at")
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [index("sesion_usuario_id_idx").on(t.userId)],
);

export const cuenta = pgTable(
  "cuenta",
  {
    id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
    accountId: text("id_en_proveedor").notNull(),
    providerId: text("proveedor").notNull(),
    userId: integer("usuario_id")
      .notNull()
      .references(() => usuario.id, { onDelete: "cascade" }),
    password: text("contrasena"),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: momento("access_token_expira_at"),
    refreshTokenExpiresAt: momento("refresh_token_expira_at"),
    scope: text("alcance"),
    createdAt: momento("created_at").defaultNow().notNull(),
    updatedAt: momento("updated_at")
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [index("cuenta_usuario_id_idx").on(t.userId)],
);

export const verificacion = pgTable(
  "verificacion",
  {
    id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
    identifier: text("identificador").notNull(),
    value: text("valor").notNull(),
    expiresAt: momento("expira_at").notNull(),
    createdAt: momento("created_at").defaultNow().notNull(),
    updatedAt: momento("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [index("verificacion_identificador_idx").on(t.identifier)],
);

// Permisos del encargado (HU-03, RF-16): módulos habilitados y "autorizar entrega con saldo" (RN-13).
// Dueño y técnico no usan esta tabla: su acceso sale del rol (src/lib/permisos.ts).


export const usuarioPermiso = pgTable(
  "usuario_permiso",
  {
    id: integer("id").generatedByDefaultAsIdentity().primaryKey(),
    usuarioId: integer("usuario_id")
      .notNull()
      .references(() => usuario.id, { onDelete: "cascade" }),
    permiso: text("permiso", { enum: PERMISOS }).notNull(),
    createdAt: momento("created_at").defaultNow().notNull(),
    createdBy: integer("created_by").references(() => usuario.id),
  },
  (t) => [
    uniqueIndex("usuario_permiso_unico").on(t.usuarioId, t.permiso),
    check("usuario_permiso_valido", sql.raw(`permiso in (${PERMISOS.map((p) => `'${p}'`).join(", ")})`)),
  ],
);

export const usuarioRelaciones = relations(usuario, ({ many }) => ({
  sesiones: many(sesion),
  cuentas: many(cuenta),
  permisos: many(usuarioPermiso, { relationName: "permisos" }),
}));

export const usuarioPermisoRelaciones = relations(usuarioPermiso, ({ one }) => ({
  usuario: one(usuario, { fields: [usuarioPermiso.usuarioId], references: [usuario.id], relationName: "permisos" }),
}));

export const sesionRelaciones = relations(sesion, ({ one }) => ({
  usuario: one(usuario, { fields: [sesion.userId], references: [usuario.id] }),
}));

export const cuentaRelaciones = relations(cuenta, ({ one }) => ({
  usuario: one(usuario, { fields: [cuenta.userId], references: [usuario.id] }),
}));
