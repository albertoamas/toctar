import { describe, expect, test } from "vitest";
import { diasEntre, fechaEnBolivia, sumarDias } from "@/lib/fechas";

describe("fechaEnBolivia", () => {
  test("a las 23:30 de Bolivia ya es el día siguiente en UTC, pero la fecha es la de Bolivia", () => {
    // 2026-10-11 03:30 UTC = 2026-10-10 23:30 en Bolivia (UTC-4)
    expect(fechaEnBolivia(new Date("2026-10-11T03:30:00Z"))).toBe("2026-10-10");
  });

  test("a partir de las 04:00 UTC cambia el día en Bolivia", () => {
    expect(fechaEnBolivia(new Date("2026-10-11T04:00:00Z"))).toBe("2026-10-11");
  });
});

describe("sumarDias", () => {
  test("cruza fin de mes y de año", () => {
    expect(sumarDias("2026-12-30", 3)).toBe("2027-01-02");
  });

  test("respeta el 29 de febrero en año bisiesto", () => {
    expect(sumarDias("2028-02-28", 1)).toBe("2028-02-29");
  });

  test("acepta días negativos", () => {
    expect(sumarDias("2026-10-01", -1)).toBe("2026-09-30");
  });
});

describe("diasEntre", () => {
  test("cuenta días calendario", () => {
    expect(diasEntre("2026-10-10", "2026-10-25")).toBe(15);
    expect(diasEntre("2026-10-25", "2026-10-10")).toBe(-15);
  });
});
