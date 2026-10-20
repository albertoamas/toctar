import { expect, test } from "vitest";
import { anioMaximo, normalizarPlaca } from "@/modulos/clientes/reglas";

// C1 Clientes: la placa se guarda normalizada para detectar duplicados (RF-23).

test("normalizarPlaca: mayúsculas, sin espacios, guiones ni puntos", () => {
  expect(normalizarPlaca("1234 abc")).toBe("1234ABC");
  expect(normalizarPlaca(" 1234-ABC ")).toBe("1234ABC");
  expect(normalizarPlaca("ab.123")).toBe("AB123");
});

test("normalizarPlaca rechaza lo que no parece una placa", () => {
  for (const mala of ["", "a", "1234 ABC Ñ", "12345678901", "12/34"]) expect(normalizarPlaca(mala)).toBeNull();
});

test("el año máximo es el siguiente al actual", () => {
  expect(anioMaximo(new Date("2026-10-20T12:00:00Z"))).toBe(2027);
});
