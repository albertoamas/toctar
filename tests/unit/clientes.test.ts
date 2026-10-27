import { expect, test } from "vitest";
import { anioMaximo, detalleVehiculo, escaparLike, normalizarBusqueda, normalizarPlaca, placasEnFila } from "@/modulos/clientes/reglas";

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

test("normalizarBusqueda separa el texto, los dígitos del teléfono y la placa", () => {
  expect(normalizarBusqueda("  José   Pérez ")).toEqual({ texto: "José Pérez", digitos: null, placa: "JOSPREZ" });
  expect(normalizarBusqueda("+591 7123")).toEqual({ texto: "+591 7123", digitos: "5917123", placa: "5917123" });
  expect(normalizarBusqueda("1234-abc")).toEqual({ texto: "1234-abc", digitos: "1234", placa: "1234ABC" });
  expect(normalizarBusqueda("71")).toEqual({ texto: "71", digitos: null, placa: "71" });
  expect(normalizarBusqueda("   ")).toBeNull();
});

test("escaparLike deja los comodines como texto", () => {
  expect(escaparLike("50%_a\\b")).toBe("50\\%\\_a\\\\b");
});

test("la fila de un cliente muestra hasta tres placas y, si se buscó una, la buscada primero", () => {
  const cinco = ["1111AAA", "2222BBB", "3333CCC", "4444DDD", "5555EEE"];
  expect(placasEnFila([], null)).toBeNull();
  expect(placasEnFila(["1111AAA"], null)).toBe("1111AAA");
  expect(placasEnFila(cinco.slice(0, 3), null)).toBe("1111AAA, 2222BBB, 3333CCC");
  expect(placasEnFila(cinco, null)).toBe("1111AAA, 2222BBB, 3333CCC y 2 más");
  // La quinta, buscada con guion y en minúsculas, pasa adelante
  expect(placasEnFila(cinco, normalizarBusqueda("5555-eee"))).toBe("5555EEE, 1111AAA, 2222BBB y 2 más");
  // Una búsqueda que no está en ninguna placa (un nombre) no cambia el orden; una que sí, la pasa adelante
  expect(placasEnFila(cinco, normalizarBusqueda("josé"))).toBe("1111AAA, 2222BBB, 3333CCC y 2 más");
  expect(placasEnFila(cinco, normalizarBusqueda("ee"))).toBe("5555EEE, 1111AAA, 2222BBB y 2 más");
});

test("lo que se sabe del vehículo: marca y modelo, año y color, en ese orden y sin vacíos", () => {
  expect(detalleVehiculo({ marca: "Toyota", modelo: "Corolla", anio: 2019, color: "Blanco" })).toEqual(["Toyota Corolla", 2019, "Blanco"]);
  expect(detalleVehiculo({ marca: null, modelo: "  ", anio: null, color: " " })).toEqual([]);
  expect(detalleVehiculo({ marca: "Mazda", modelo: null, anio: null, color: "Rojo" })).toEqual(["Mazda", "Rojo"]);
});
