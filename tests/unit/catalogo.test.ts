import { describe, expect, test } from "vitest";
import { clavePrecio, duracionEfectiva, leerMonto, mostrarMonto, preciosCambiados, preciosFaltantes, type Monto } from "@/modulos/catalogo/reglas";

// C1 Catálogo: reglas de precios (RF-26, RF-28, D-3) y duración (RF-27).

describe("leerMonto", () => {
  test("acepta enteros y decimales con coma o punto", () => {
    expect(leerMonto("250")).toBe("250.00");
    expect(leerMonto(" 250,5 ")).toBe("250.50");
    expect(leerMonto("1250.75")).toBe("1250.75");
  });
  test("vacío es según evaluación", () => {
    expect(leerMonto("")).toBeNull();
    expect(leerMonto("   ")).toBeNull();
  });
  test("rechaza cero, negativos, más de dos decimales, separador de miles, texto y montos enormes", () => {
    for (const malo of ["0", "-5", "250,123", "1.250,50", "1.250", "abc", "100000,01"]) expect(leerMonto(malo)).toBeUndefined();
  });
  test("el máximo se acepta", () => {
    expect(leerMonto("100000")).toBe("100000.00");
  });
});

test("mostrarMonto saca los ceros y usa coma", () => {
  expect(mostrarMonto("250.00")).toBe("250");
  expect(mostrarMonto("250.50")).toBe("250,50");
});

describe("preciosCambiados (D-3: solo se guarda lo que cambió)", () => {
  const vigentes = new Map<number, Monto>([
    [1, "250.00"],
    [2, null],
  ]);
  test("un monto igual no es cambio, uno distinto sí", () => {
    expect(preciosCambiados(vigentes, new Map<number, Monto>([[1, "250.00"]]))).toEqual([]);
    expect(preciosCambiados(vigentes, new Map<number, Monto>([[1, "300.00"]]))).toEqual([{ tamanoId: 1, monto: "300.00" }]);
  });
  test("pasar a según evaluación es cambio; seguir en según evaluación no", () => {
    expect(preciosCambiados(vigentes, new Map<number, Monto>([[1, null]]))).toEqual([{ tamanoId: 1, monto: null }]);
    expect(preciosCambiados(vigentes, new Map<number, Monto>([[2, null]]))).toEqual([]);
  });
  test("sin cargar: al guardar, vacío pasa a según evaluación; con monto, se carga", () => {
    expect(preciosCambiados(vigentes, new Map<number, Monto>([[3, null]]))).toEqual([{ tamanoId: 3, monto: null }]);
    expect(preciosCambiados(vigentes, new Map<number, Monto>([[3, "90.00"]]))).toEqual([{ tamanoId: 3, monto: "90.00" }]);
  });
});

test("preciosFaltantes cuenta los pares sin ninguna fila", () => {
  const cargados = new Set([clavePrecio(1, 10), clavePrecio(1, 11), clavePrecio(2, 10)]);
  expect(preciosFaltantes([1, 2], [10, 11], cargados)).toBe(1);
  expect(preciosFaltantes([1], [10, 11], cargados)).toBe(0);
  expect(preciosFaltantes([], [10, 11], cargados)).toBe(0);
});

test("duracionEfectiva: la de la variante pisa la del servicio", () => {
  expect(duracionEfectiva({ duracionDias: 2 }, { duracionDias: null })).toBe(2);
  expect(duracionEfectiva({ duracionDias: 2 }, { duracionDias: 3 })).toBe(3);
});
