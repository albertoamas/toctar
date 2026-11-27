import { describe, expect, it, test } from "vitest";
import { diaLegible, diasEntre, fechaEnBolivia, fechaYHoraCorta, sumarDias } from "@/lib/fechas";

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

describe("los días para leer en una ficha (20/11)", () => {
  it("hoy, mañana, ayer o el día con su nombre; el año solo si es de otro", () => {
    expect(diaLegible("2026-11-20", "2026-11-20")).toBe("Hoy");
    expect(diaLegible("2026-11-21", "2026-11-20")).toBe("Mañana");
    expect(diaLegible("2026-11-19", "2026-11-20")).toBe("Ayer");
    expect(diaLegible("2026-12-11", "2026-11-20")).toBe("Viernes 11 de diciembre");
    expect(diaLegible("2027-01-20", "2026-11-20")).toBe("Miércoles 20 de enero de 2027");
  });
  it("un momento corto para el historial, en hora de Bolivia", () => {
    // 19:10 UTC son las 15:10 en Bolivia
    expect(fechaYHoraCorta(new Date("2026-11-20T19:10:00Z"), "2026-11-20")).toBe("20 nov., 15:10");
    // 02:00 UTC del 21 todavía es el 20 en Bolivia
    expect(fechaYHoraCorta(new Date("2026-11-21T02:00:00Z"), "2026-11-20")).toBe("20 nov., 22:00");
  });
});
