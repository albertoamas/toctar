import { describe, expect, test } from "vitest";
import { debeActualizar, FUERA_MINIMO_MS } from "@/lib/actualizar-al-volver";

// Hallazgo 4 de la prueba en celulares (15/11): al volver a la app después de un rato, el panel se pone al día solo,
// salvo con algo a medio hacer.
describe("al volver a la app", () => {
  const base = { fueraMs: FUERA_MINIMO_MS, hayCambios: false, hayAlgoAbierto: false };

  test("después de un minuto fuera, se actualiza", () => {
    expect(debeActualizar(base)).toBe(true);
    expect(debeActualizar({ ...base, fueraMs: 30 * 60_000 })).toBe(true);
  });

  test("un vistazo corto a otra app no la toca", () => {
    expect(debeActualizar({ ...base, fueraMs: FUERA_MINIMO_MS - 1 })).toBe(false);
  });

  test("con cambios sin guardar, o con un modal o un menú abierto, nunca", () => {
    expect(debeActualizar({ ...base, hayCambios: true })).toBe(false);
    expect(debeActualizar({ ...base, hayAlgoAbierto: true })).toBe(false);
  });
});
