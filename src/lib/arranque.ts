import { existsSync } from "node:fs";
import path from "node:path";
import { count, eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db } from "@/db";
import { usuario, usuarioPermiso } from "@/db/esquema";
import { auth } from "@/lib/auth";
import { completarMedianas } from "@/lib/fotos";
import { correoInterno, esquemaContrasena, esquemaNombreUsuario } from "@/lib/usuarios";

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
  await recuperarDueno();
  await completarVersionesDelCelular();
}

/**
 * Las fotos del sitio sin la versión de 1080 px (las subidas antes del 13/11) la reciben antes de atender, hasta 15 s:
 * las páginas que guarda la caché ya salen con ella. Un error no frena el arranque: el sitio sigue con las de antes.
 */
async function completarVersionesDelCelular() {
  try {
    const { hechas, quedan } = await completarMedianas(15_000);
    if (hechas > 0) console.log(`[arranque] ${hechas} fotos del sitio con su versión para el celular.`);
    if (quedan > 0) console.log(`[arranque] Quedan ${quedan} fotos para el próximo arranque.`);
  } catch (error) {
    console.error("[arranque] No se completaron las versiones para el celular", error);
  }
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

/**
 * Pedido 50: desde el panel no se crea un dueño ni se le cambia la contraseña sin la actual. YankoSoft lo hace aquí, con
 * DUENO_RECUPERAR_USUARIO y DUENO_RECUPERAR_CONTRASENA (y DUENO_RECUPERAR_NOMBRE para crearlo), en el entorno de Coolify:
 * al arrancar le pone esa contraseña, lo deja como dueño activo y cierra sus sesiones; si no existe, lo crea. Se borran
 * del entorno después de usarlas: mientras estén, cada arranque lo vuelve a hacer (docs/07-preparacion/guia-de-despliegue.md).
 */
async function recuperarDueno() {
  const nombreUsuario = process.env.DUENO_RECUPERAR_USUARIO;
  const contrasena = process.env.DUENO_RECUPERAR_CONTRASENA;
  if (!nombreUsuario || !contrasena) return;
  const usuarioValido = esquemaNombreUsuario.parse(nombreUsuario);
  // Las reglas de toda contraseña (de 8 a 128): una más larga no se podría escribir al ingresar
  if (!esquemaContrasena.safeParse(contrasena).success) throw new Error("[arranque] DUENO_RECUPERAR_CONTRASENA debe tener de 8 a 128 caracteres.");

  const [existente] = await db.select({ id: usuario.id }).from(usuario).where(eq(usuario.username, usuarioValido));
  // Sin headers: es una tarea del servidor, no un pedido de un usuario (createUser lo permite).
  if (!existente) {
    const nombre = process.env.DUENO_RECUPERAR_NOMBRE;
    if (!nombre) throw new Error(`[arranque] No existe "${usuarioValido}": para crearlo falta DUENO_RECUPERAR_NOMBRE.`);
    await auth.api.createUser({ body: { email: correoInterno(usuarioValido), name: nombre, password: contrasena, role: "dueno", data: { username: usuarioValido } } });
    console.warn(`[arranque] Dueño "${usuarioValido}" creado con DUENO_RECUPERAR_*. Borra esas variables del entorno.`);
    return;
  }
  // Las funciones del plugin admin, salvo createUser, piden una sesión: se usa lo mismo que ellas usan por dentro
  const userId = String(existente.id);
  const ctx = await auth.$context;
  await ctx.internalAdapter.updateUser(userId, { role: "dueno", banned: false, banReason: null, banExpires: null });
  // Un dueño no tiene permisos propios (los de un encargado que pasa a dueño no quedan guardados)
  await db.delete(usuarioPermiso).where(eq(usuarioPermiso.usuarioId, existente.id));
  const hash = await ctx.password.hash(contrasena);
  if (await ctx.internalAdapter.findCredentialAccount(userId)) await ctx.internalAdapter.updatePassword(userId, hash);
  else await ctx.internalAdapter.createAccount({ userId, providerId: "credential", accountId: userId, password: hash });
  await ctx.internalAdapter.deleteUserSessions(userId);
  console.warn(`[arranque] Dueño "${usuarioValido}" recuperado con DUENO_RECUPERAR_* (contraseña nueva, activo, sin sesiones). Borra esas variables del entorno.`);
}
