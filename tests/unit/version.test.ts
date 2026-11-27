import { expect, test } from "vitest";
import { hayVersionNueva } from "@/lib/version";

// Pedido 39: el aviso de versión nueva. Especificación: docs/08-desarrollo/etapas/P39-version-nueva.md §9.

test("avisa si la versión publicada es otra", () => {
  expect(hayVersionNueva("2026-11-05T10:00:00.000Z", "2026-11-05T12:00:00.000Z")).toBe(true);
  expect(hayVersionNueva("a1b2c3", "d4e5f6")).toBe(true);
});

test("no avisa si es la misma, o si falta alguna de las dos", () => {
  expect(hayVersionNueva("a1b2c3", "a1b2c3")).toBe(false);
  expect(hayVersionNueva("a1b2c3", undefined)).toBe(false);
  expect(hayVersionNueva("a1b2c3", "")).toBe(false);
  expect(hayVersionNueva(undefined, "a1b2c3")).toBe(false);
});
