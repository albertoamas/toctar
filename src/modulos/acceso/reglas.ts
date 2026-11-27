// Límite de intentos de ingreso (RNF-04). Puro: se prueba en tests/unit/ingreso.test.ts.
// Se cuentan solo los fallidos de la ventana. Al ingresar bien, se borran los de ese usuario.

export const VENTANA_MINUTOS = 15;

/** Fallos en la ventana, por usuario y conexión: frena a quien prueba contraseñas de una cuenta. */
export const LIMITE_USUARIO_Y_CONEXION = 5;
/** Fallos en la ventana desde una conexión, sea cual sea el usuario: frena a quien recorre cuentas. */
export const LIMITE_POR_CONEXION = 20;
/**
 * Fallos en la ventana para un usuario, desde cualquier conexión: frena un ataque repartido.
 * Es alto a propósito: con un límite bajo, cualquiera podría dejar al dueño sin poder entrar.
 */
export const LIMITE_POR_USUARIO = 50;

export type Fallos = { usuarioYConexion: number; conexion: number; usuario: number };

export function ingresoBloqueado(f: Fallos): boolean {
  return f.usuarioYConexion >= LIMITE_USUARIO_Y_CONEXION || f.conexion >= LIMITE_POR_CONEXION || f.usuario >= LIMITE_POR_USUARIO;
}

export const MENSAJE_BLOQUEO = `Demasiados intentos. Espera ${VENTANA_MINUTOS} minutos y vuelve a probar, o pídele al dueño que te cambie la contraseña.`;
