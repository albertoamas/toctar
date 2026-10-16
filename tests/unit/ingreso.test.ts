import { describe, expect, test } from "vitest";
import { esquemaIngreso } from "@/modulos/acceso/esquemas";
import { LIMITE_POR_CONEXION, LIMITE_POR_USUARIO, LIMITE_USUARIO_Y_CONEXION, ingresoBloqueado } from "@/modulos/acceso/reglas";

// Límite de intentos de ingreso (RNF-04). Criterios: docs/09-pruebas/criterios-entrega-1.md (1.x).

describe("límite de intentos de ingreso", () => {
  const ninguno = { usuarioYConexion: 0, conexion: 0, usuario: 0 };

  test("sin fallos, o por debajo de cada límite, se puede intentar", () => {
    expect(ingresoBloqueado(ninguno)).toBe(false);
    expect(ingresoBloqueado({ usuarioYConexion: LIMITE_USUARIO_Y_CONEXION - 1, conexion: LIMITE_POR_CONEXION - 1, usuario: LIMITE_POR_USUARIO - 1 })).toBe(false);
  });

  test("se bloquea al llegar a cualquiera de los tres límites", () => {
    expect(ingresoBloqueado({ ...ninguno, usuarioYConexion: LIMITE_USUARIO_Y_CONEXION })).toBe(true);
    expect(ingresoBloqueado({ ...ninguno, conexion: LIMITE_POR_CONEXION })).toBe(true);
    expect(ingresoBloqueado({ ...ninguno, usuario: LIMITE_POR_USUARIO })).toBe(true);
  });

  test("el límite por usuario es más alto que el de una conexión: nadie deja al dueño afuera con pocos intentos", () => {
    expect(LIMITE_POR_USUARIO).toBeGreaterThan(LIMITE_POR_CONEXION);
    expect(LIMITE_POR_CONEXION).toBeGreaterThan(LIMITE_USUARIO_Y_CONEXION);
  });
});

describe("datos de ingreso", () => {
  test("el usuario se pasa a minúsculas y sin espacios", () => {
    expect(esquemaIngreso.parse({ usuario: "  Dueno ", contrasena: "x" }).usuario).toBe("dueno");
  });

  test("una contraseña de más de 128 caracteres no se procesa y da el mensaje de siempre", () => {
    const r = esquemaIngreso.safeParse({ usuario: "dueno", contrasena: "x".repeat(129) });
    expect(r.error?.issues[0].message).toBe("Usuario o contraseña incorrectos.");
  });
});
