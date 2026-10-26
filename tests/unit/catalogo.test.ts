import { describe, expect, test } from "vitest";
import { erroresDe } from "@/lib/formularios";
import { nombreRepetido, puedeDesactivar } from "@/lib/orden";
import { esquemaCrearServicio, esquemaDatosCatalogo, esquemaEstadoVariante, esquemaMoverVariante, esquemaVariante } from "@/modulos/catalogo/esquemas";
import { clavePrecio, duracionEfectiva, leerMonto, mostrarMonto, precioDesde, preciosCambiados, preciosFaltantes, textoDias, type Monto } from "@/modulos/catalogo/reglas";

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

describe("el servicio en el catálogo (alta y nombre)", () => {
  test("el alta pide solo el nombre", () => {
    expect(esquemaCrearServicio.parse({ nombre: "  Mantenimiento del nano cerámico " })).toEqual({ nombre: "Mantenimiento del nano cerámico" });
    expect(erroresDe(esquemaCrearServicio.safeParse({ nombre: " " }).error!)).toEqual({ nombre: "Escribe el nombre del servicio." });
    expect(erroresDe(esquemaCrearServicio.safeParse({ nombre: "x".repeat(61) }).error!)).toEqual({ nombre: "Hasta 60 caracteres." });
  });

  test("los datos del catálogo llevan el nombre", () => {
    const datos = { id: "4", nombre: "Pulido", duracionDias: "2", generaMantenimiento: false, activo: true };
    expect(esquemaDatosCatalogo.parse(datos)).toEqual({ id: 4, nombre: "Pulido", duracionDias: 2, generaMantenimiento: false, activo: true });
    expect(erroresDe(esquemaDatosCatalogo.safeParse({ ...datos, nombre: "" }).error!)).toEqual({ nombre: "Escribe el nombre del servicio." });
  });
});

describe("variantes (D-2)", () => {
  const variantes = [
    { id: 1, nombre: "1 año", activo: true },
    { id: 2, nombre: "2 años", activo: false },
  ];

  test("la última variante activa no se desactiva", () => {
    expect(puedeDesactivar(variantes, 1)).toBe(false);
    expect(puedeDesactivar([...variantes, { id: 3, nombre: "3 años", activo: true }], 1)).toBe(true);
  });

  test("el nombre no se repite dentro del servicio", () => {
    expect(nombreRepetido(variantes, "2 AÑOS")).toBe(true);
    expect(nombreRepetido(variantes, "5 años")).toBe(false);
  });

  test("la descripción es opcional", () => {
    expect(esquemaVariante.parse({ servicioId: "1", nombre: "Premium", descripcion: "" })).toEqual({ servicioId: 1, nombre: "Premium", descripcion: null });
  });

  test("mover y activar validan los datos sueltos", () => {
    expect(esquemaEstadoVariante.safeParse({ servicioId: 1, id: 2, activo: 1 }).success).toBe(false);
    expect(esquemaMoverVariante.safeParse({ servicioId: 1, id: 2, direccion: "subir" }).success).toBe(true);
    expect(esquemaMoverVariante.safeParse({ servicioId: 1, id: 2, direccion: "arriba" }).success).toBe(false);
    expect(esquemaMoverVariante.safeParse({ id: 2, direccion: "subir" }).success).toBe(false);
  });
});

test("el precio desde es el menor monto vigente; según evaluación, solo si todos lo son", () => {
  expect(precioDesde(["950.00", "700.00", "1100.00"])).toBe("700.00");
  expect(precioDesde([null, "1250.50", "980.00"])).toBe("980.00");
  expect(precioDesde([null, null])).toBeNull();
  // Sin precios cargados: no hay nada que mostrar (la fila dice cuántos faltan)
  expect(precioDesde([])).toBeUndefined();
});

test("la duración se lee en días, con singular", () => {
  expect(textoDias(1)).toBe("1 día");
  expect(textoDias(3)).toBe("3 días");
});
