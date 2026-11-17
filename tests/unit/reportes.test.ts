import { describe, expect, test, vi, afterEach } from "vitest";
import { esquemaAnularGasto, esquemaGasto } from "@/modulos/reportes/esquemas";
import { periodoDe, rangoValido, textoRango, bsRedondo, cambioPorcentual, entregasPorMes, escalaBonita, acumularPorDia, esMes, mesDe, nombreMes, primerDiaDeGastos, rangoDelMes, sumarMeses, tituloMes } from "@/modulos/reportes/reglas";

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

describe("la ganancia del mes", () => {



  test("los montos redondos, con punto de miles y el signo de una pérdida", () => {
    expect(bsRedondo(11330)).toBe("11.330 Bs");
    expect(bsRedondo(1234567.6)).toBe("1.234.568 Bs");
    expect(bsRedondo(-250)).toBe("−250 Bs");
    expect(bsRedondo(0)).toBe("0 Bs");
  });
});

describe("las pestañas de Reportes", () => {
  test("el cambio en por ciento, sin comparación si el mes anterior fue cero", () => {
    expect(cambioPorcentual(18450, 16470)).toBe(12);
    expect(cambioPorcentual(900, 1000)).toBe(-10);
    expect(cambioPorcentual(500, 0)).toBeNull();
  });

  test("un eje con números redondos", () => {
    expect(escalaBonita(18450)).toEqual({ tope: 20000, paso: 5000 });
    expect(escalaBonita(42)).toEqual({ tope: 60, paso: 20 });
    expect(escalaBonita(0)).toEqual({ tope: 4, paso: 1 });
  });

  test("lo acumulado día a día, con los días sin pagos", () => {
    expect(acumularPorDia([{ dia: 1, total: 100 }, { dia: 3, total: 50.5 }], 4)).toEqual([100, 100, 150.5, 150.5]);
  });

  test("entregados, nuevos y los que volvieron de cada mes", () => {
    const entregas = [
      { clienteId: 1, dia: "2026-09-10" },
      { clienteId: 1, dia: "2026-10-05" }, // volvió (ya vino en septiembre)
      { clienteId: 2, dia: "2026-10-07" }, // nuevo
      { clienteId: 3, dia: "2026-10-08" },
      { clienteId: 3, dia: "2026-10-28" }, // vino dos veces en el mes: volvió
    ];
    expect(entregasPorMes(entregas, ["2026-09", "2026-10"])).toEqual([
      { mes: "2026-09", entregados: 1, volvieron: 0, nuevos: 1 },
      { mes: "2026-10", entregados: 4, volvieron: 2, nuevos: 1 },
    ]);
  });
});

test("los ejes de cantidades van de a enteros", () => {
  expect(escalaBonita(1, 4, true)).toEqual({ tope: 1, paso: 1 });
  expect(escalaBonita(2, 4, true)).toEqual({ tope: 2, paso: 1 });
});

describe("los períodos", () => {
  const hoy = "2026-11-17"; // martes
  test("este mes, del 1 a hoy, contra los mismos días del mes pasado", () => {
    expect(periodoDe({}, hoy)).toMatchObject({ clave: "mes", inicio: "2026-11-01", fin: "2026-11-17", antes: { inicio: "2026-10-01", fin: "2026-10-17" }, titulo: "Noviembre de 2026, del 1 al 17", vs: "vs. oct.", mes: "2026-11" });
    // Un 31 contra un mes de 30 días: hasta su último día
    expect(periodoDe({}, "2026-12-31").antes).toEqual({ inicio: "2026-11-01", fin: "2026-11-30" });
  });
  test("hoy contra ayer y esta semana contra la misma parte de la pasada", () => {
    expect(periodoDe({ periodo: "hoy" }, hoy)).toMatchObject({ inicio: hoy, fin: hoy, antes: { inicio: "2026-11-16", fin: "2026-11-16" }, vs: "vs. ayer" });
    expect(periodoDe({ periodo: "semana" }, hoy)).toMatchObject({ inicio: "2026-11-16", fin: hoy, antes: { inicio: "2026-11-09", fin: "2026-11-10" } });
  });
  test("el mes pasado entero contra el anterior", () => {
    expect(periodoDe({ periodo: "mes-pasado" }, hoy)).toMatchObject({ inicio: "2026-10-01", fin: "2026-10-31", antes: { inicio: "2026-09-01", fin: "2026-09-30" }, titulo: "Octubre de 2026", mes: "2026-10" });
  });
  test("un rango, contra el anterior del mismo largo; uno que no sirve, los últimos 30 días", () => {
    expect(periodoDe({ periodo: "rango", desde: "2026-10-10", hasta: "2026-10-19" }, hoy)).toMatchObject({ inicio: "2026-10-10", fin: "2026-10-19", antes: { inicio: "2026-09-30", fin: "2026-10-09" }, titulo: "Del 10 al 19 de octubre" });
    expect(periodoDe({ periodo: "rango", desde: "2026-11-20", hasta: "2026-11-01" }, hoy)).toMatchObject({ inicio: "2026-10-19", fin: hoy });
    expect(periodoDe({ periodo: "raro" }, hoy).clave).toBe("mes");
  });
  test("qué rangos sirven", () => {
    expect(rangoValido("2026-01-01", "2026-11-17", hoy)).toBe(true);
    for (const [d, h] of [["2026-11-18", "2026-11-18"], ["2026-11-10", "2026-11-01"], ["2024-01-01", "2026-11-17"], ["1999-12-31", "2000-01-02"], ["2026-02-30", "2026-03-01"], [1, 2]]) expect(rangoValido(d, h, hoy)).toBe(false);
  });
  test("cómo se escribe un rango", () => {
    expect(textoRango("2026-11-17", "2026-11-17")).toBe("17 de noviembre");
    expect(textoRango("2026-10-28", "2026-11-03")).toBe("Del 28 de octubre al 3 de noviembre");
    expect(textoRango("2025-12-20", "2026-01-05")).toBe("Del 20 de diciembre de 2025 al 5 de enero de 2026");
  });
});
