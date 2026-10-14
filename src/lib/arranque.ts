import { existsSync } from "node:fs";
import path from "node:path";
import { count } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db } from "@/db";
import { usuario } from "@/db/esquema";
import { auth } from "@/lib/auth";
import { correoInterno, esquemaNombreUsuario } from "@/lib/usuarios";

// Tareas de arranque del servidor (src/instrumentation.ts).

export async function prepararAlArrancar() {
  // En pruebas y producción la imagen trae las migraciones en ./migraciones y se aplican
  // antes de aceptar tráfico. En desarrollo se aplican a mano con `npm run db:migrate`.
  if (process.env.NODE_ENV === "production") {
    // En la imagen de Docker están en ./migraciones; con `next start` local, en src/db.
    const enImagen = path.join(process.cwd(), "migraciones");
    const carpeta = existsSync(enImagen) ? enImagen : path.join(process.cwd(), "src/db/migraciones");
    await migrate(db, { migrationsFolder: carpeta });
  }
  await crearDuenoInicial();
}

/**
 * Crea el primer usuario dueño si la base no tiene usuarios y están definidas
 * DUENO_INICIAL_USUARIO, DUENO_INICIAL_NOMBRE y DUENO_INICIAL_CONTRASENA.
 * Después de crearlo, esas variables se pueden borrar del entorno.
 */
async function crearDuenoInicial() {
  const nombreUsuario = process.env.DUENO_INICIAL_USUARIO;
  const nombre = process.env.DUENO_INICIAL_NOMBRE;
  const contrasena = process.env.DUENO_INICIAL_CONTRASENA;
  if (!nombreUsuario || !nombre || !contrasena) return;

  const [{ total }] = await db.select({ total: count() }).from(usuario);
  if (total > 0) return;

  const usuarioValido = esquemaNombreUsuario.parse(nombreUsuario);
  // Sin headers: es una tarea del servidor, no un pedido de un usuario.
  await auth.api.createUser({
    body: {
      email: correoInterno(usuarioValido),
      name: nombre,
      password: contrasena,
      role: "dueno",
      data: { username: usuarioValido },
    },
  });
  console.log(`[arranque] Usuario dueño inicial "${usuarioValido}" creado.`);
}
