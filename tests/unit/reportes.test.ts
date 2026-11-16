import { describe, expect, test, vi, afterEach } from "vitest";
import { esquemaAnularGasto, esquemaGasto } from "@/modulos/reportes/esquemas";
import { esMes, mesDe, nombreMes, primerDiaDeGastos, rangoDelMes, sumarMeses, tituloMes } from "@/modulos/reportes/reglas";

// Pedido 16 (P16-reportes-y-gastos.md §9): los meses de los gastos y el esquema de un gasto.

describe("los meses", () => {
  test("un mes va del día 1 al último, también en febrero y en uno bisiesto", () => {
    expect(rangoDelMes("2026-11")).toEqual({ inicio: "2026-11-01", fin: "2026-11-30" });
    expect(rangoDelMes("2026-12")).toEqual({ inicio: "2026-12-01", fin: "2026-12-31" });
    expect(rangoDelMes("2026-02")).toEqual({ inicio: "2026-02-01", fin: "2026-02-28" });
    expect(rangoDelMes("2028-02")).toEqual({ inicio: "2028-02-01", fin: "2028-02-29" });
  });

  test("se suman y restan meses cruzando el año", () => {
    expect(sumarMeses("2026-01", -1)).toBe("2025-12");
    expect(sumarMeses("2026-11", 2)).toBe("2027-01");
    expect(sumarMeses("2026-11", -6)).toBe("2026-05");
  });

  test("el mes de una fecha guardada en hora de Bolivia (un gasto del último día a las 23:30 es de ese mes)", () => {
    // La fecha ya es el día en Bolivia (fechaEnBolivia), no el instante en UTC, que sería del día siguiente
    expect(mesDe("2026-11-30")).toBe("2026-11");
  });

  test("solo un mes válido de la dirección", () => {
    expect(esMes("2026-11")).toBe(true);
    for (const raro of ["2026-13", "2026-1", "26-11", "1999-12", "2101-01", "", null, 202611]) expect(esMes(raro)).toBe(false);
  });

  test("su nombre", () => {
    expect(nombreMes("2026-11")).toBe("noviembre de 2026");
    expect(tituloMes("2026-01")).toBe("Enero de 2026");
  });

  test("se registran gastos desde el 1 de enero del año pasado", () => {
    expect(primerDiaDeGastos("2026-11-16")).toBe("2025-01-01");
  });
});

describe("el esquema de un gasto", () => {
  afterEach(() => vi.useRealTimers());
  const hoy = () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-16T15:00:00Z"));
  };
  const bueno = { categoriaId: "2", monto: "1180,50", metodo: "qr", fecha: "2026-11-12", detalle: "  Cera y microfibras  " };

  test("uno bien escrito, con el monto leído y el detalle sin espacios", () => {
    hoy();
    const r = esquemaGasto.safeParse(bueno);
    expect(r.success && r.data).toEqual({ categoriaId: 2, monto: "1180.50", metodo: "qr", fecha: "2026-11-12", detalle: "Cera y microfibras" });
  });

  test("sin detalle queda null", () => {
    hoy();
    const r = esquemaGasto.safeParse({ ...bueno, detalle: "" });
    expect(r.success && r.data.detalle).toBeNull();
  });

  test("cada error, con su mensaje", () => {
    hoy();
    const error = (cambio: Partial<typeof bueno>) => {
      const r = esquemaGasto.safeParse({ ...bueno, ...cambio });
      return r.success ? null : r.error.issues[0].message;
    };
    expect(error({ categoriaId: "" })).toBe("Elige qué se pagó.");
    expect(error({ monto: "" })).toBe("Escribe el monto del gasto.");
    expect(error({ monto: "0" })).toMatch(/^Revisa el monto/);
    expect(error({ metodo: "tarjeta" })).toBe("Elige cómo se pagó.");
    expect(error({ fecha: "2026-11-17" })).toBe("La fecha del gasto no puede ser futura.");
    expect(error({ fecha: "2024-12-31" })).toBe("Solo se registran gastos de este año o del pasado.");
    expect(error({ fecha: "2026-02-30" })).toBe("Elige el día del gasto.");
    expect(error({ detalle: "x".repeat(201) })).toBe("Hasta 200 caracteres.");
  });

  test("anular pide el motivo", () => {
    expect(esquemaAnularGasto.safeParse({ id: "5", motivo: " " }).success).toBe(false);
    expect(esquemaAnularGasto.safeParse({ id: "5", motivo: "Se cargó dos veces" }).success).toBe(true);
  });
});
