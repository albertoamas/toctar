import { describe, expect, test } from "vitest";
import { correoInterno, esquemaContrasena, esquemaNombreUsuario } from "@/lib/usuarios";

describe("esquemaNombreUsuario", () => {
  test("normaliza a minúsculas y quita espacios", () => {
    expect(esquemaNombreUsuario.parse("  Juan.Perez ")).toBe("juan.perez");
  });

  test.each(["ab", "a".repeat(31), "josé", "juan perez", "juan@toctar"])("rechaza %s", (valor) => {
    expect(esquemaNombreUsuario.safeParse(valor).success).toBe(false);
  });

  test.each(["dueno", "tecnico_1", "ana-maria", "j.p"])("acepta %s", (valor) => {
    expect(esquemaNombreUsuario.safeParse(valor).success).toBe(true);
  });
});

test("el correo interno se arma con el nombre de usuario", () => {
  expect(correoInterno("dueno")).toBe("dueno@usuarios.toctar.local");
});

test("la contraseña tiene al menos 8 caracteres", () => {
  expect(esquemaContrasena.safeParse("1234567").success).toBe(false);
  expect(esquemaContrasena.safeParse("12345678").success).toBe(true);
});
