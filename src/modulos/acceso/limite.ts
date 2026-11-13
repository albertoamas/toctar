import "server-only";
import { and, eq, gt, like, lt, not, or, sql } from "drizzle-orm";
import { APIError } from "better-auth/api";
import { db } from "@/db";
import { intentoIngreso } from "@/db/esquema";
import { codigoDeConexion } from "@/lib/conexion";
import { VENTANA_MINUTOS, ingresoBloqueado, type Fallos } from "./reglas";

// El límite de intentos (RNF-04): el del ingreso y, desde el pedido 50, el de "Cambiar mi contraseña" (con la clave
// `cambio:<usuario>`; ningún usuario tiene ":", PATRON_NOMBRE_USUARIO). Cada tipo se cuenta aparte, también por conexión:
// el dueño que se equivoca con su contraseña actual no bloquea el ingreso de los encargados en el mismo Wi-Fi, ni al revés.
// Fuera de un archivo "use server": no se puede llamar desde el navegador.

const PREFIJO_CAMBIO = "cambio:";

async function contarIntentos(clave: string, ipHash: string): Promise<Fallos> {
  const desde = new Date(Date.now() - VENTANA_MINUTOS * 60_000);
  const deLaClave = eq(intentoIngreso.usuario, clave);
  // Los del mismo tipo que esta clave (ingreso o cambio de contraseña)
  const cambios = like(intentoIngreso.usuario, `${PREFIJO_CAMBIO}%`);
  const deLaConexion = and(eq(intentoIngreso.ipHash, ipHash), clave.startsWith(PREFIJO_CAMBIO) ? cambios : not(cambios));
  const [f] = await db
    .select({
      usuarioYConexion: sql<number>`count(*) filter (where ${and(deLaClave, deLaConexion)})`.mapWith(Number),
      conexion: sql<number>`count(*) filter (where ${deLaConexion})`.mapWith(Number),
      usuario: sql<number>`count(*) filter (where ${deLaClave})`.mapWith(Number),
    })
    .from(intentoIngreso)
    .where(and(gt(intentoIngreso.createdAt, desde), or(deLaClave, deLaConexion)));
  return f;
}

/** La clave de los intentos de "Cambiar mi contraseña" de un usuario. */
export const claveDeCambio = (usuario: string) => `${PREFIJO_CAMBIO}${usuario}`;

/**
 * Prueba una contraseña con el límite de intentos: "bloqueado" si ya se pasó (sin probarla), "incorrecto" si Better Auth
 * la rechazó (el intento queda anotado) y "ok" si pasó (se borran los fallos de esa clave). `esRechazo` dice qué error es
 * una contraseña equivocada (por defecto, todo APIError: el ingreso no dice qué falló); otro error se deja subir.
 */
export async function conLimiteDeIntentos(
  clave: string,
  probar: () => Promise<unknown>,
  esRechazo: (error: APIError) => boolean = () => true,
): Promise<"ok" | "incorrecto" | "bloqueado"> {
  const ipHash = await codigoDeConexion();
  // Se anota el intento ANTES de probar la contraseña y recién después se cuenta (incluido este).
  // Así varios intentos al mismo tiempo se ven entre sí y no pasan juntos el límite, sin candados
  // ni transacciones abiertas mientras Better Auth verifica la contraseña.
  const [intento] = await db.insert(intentoIngreso).values({ usuario: clave, ipHash }).returning({ id: intentoIngreso.id });
  const quitarIntento = () => db.delete(intentoIngreso).where(eq(intentoIngreso.id, intento.id));
  const f = await contarIntentos(clave, ipHash);
  if (ingresoBloqueado({ usuarioYConexion: f.usuarioYConexion - 1, conexion: f.conexion - 1, usuario: f.usuario - 1 })) {
    // Un intento rechazado no cuenta: la espera no se alarga mientras alguien sigue probando.
    await quitarIntento();
    return "bloqueado";
  }

  try {
    await probar();
  } catch (error) {
    if (!(error instanceof APIError) || !esRechazo(error)) {
      await quitarIntento();
      throw error;
    }
    // El intento queda anotado como fallido. Los de más de un día ya no sirven.
    await db.delete(intentoIngreso).where(lt(intentoIngreso.createdAt, new Date(Date.now() - 24 * 3_600_000)));
    return "incorrecto";
  }

  // Pasó: sus fallos (y este intento) se borran.
  await db.delete(intentoIngreso).where(eq(intentoIngreso.usuario, clave));
  return "ok";
}
