import { describe, expect, it } from "vitest";
import { aniosParaElegir, colorFrecuente, filtrarMarcas, marcaExacta, marcasParaElegir, modelosDeLaMarca, tamanoSugerido } from "@/modulos/clientes/catalogo-vehiculos";

// Pedido 52 (etapas/P52-catalogo-de-marcas.md): menos escritura al registrar un vehículo.

const marcas = ["Hyundai", "Mitsubishi", "Toyota"];
const modelos = [
  { marca: "Toyota", modelo: "Hilux", tamanoId: 4 },
  { marca: "Toyota", modelo: "Corolla", tamanoId: 2 },
  { marca: "Nissan", modelo: "Sentra", tamanoId: 2 },
];

describe("marcas", () => {
  it("la escrita con otras mayúsculas es la de la lista", () => {
    expect(marcaExacta(marcas, " toyota ")).toBe("Toyota");
    expect(marcaExacta(marcas, "Toyot")).toBeNull();
  });
  it("filtra sin mayúsculas, las que empiezan así primero", () => {
    expect(filtrarMarcas(marcas, "su")).toEqual(["Mitsubishi"]);
    expect(filtrarMarcas(["Kia", "Nikia"], "ki")).toEqual(["Kia", "Nikia"]);
    expect(filtrarMarcas(marcas, "")).toEqual(marcas);
  });
  it("una marca vieja que ya no está en la lista se sigue ofreciendo en su vehículo", () => {
    expect(marcasParaElegir(marcas, "Lada")).toEqual(["Hyundai", "Lada", "Mitsubishi", "Toyota"]);
    expect(marcasParaElegir(marcas, "toyota")).toEqual(marcas);
  });
});

describe("modelos y tamaño sugerido", () => {
  it("sugiere los modelos de la marca, en orden", () => {
    expect(modelosDeLaMarca(modelos, "toyota").map((m) => m.modelo)).toEqual(["Corolla", "Hilux"]);
    expect(modelosDeLaMarca(modelos, "")).toEqual([]);
  });
  it("el tamaño que suele tener el modelo de esa marca", () => {
    expect(tamanoSugerido(modelos, "Toyota", "hilux")).toBe(4);
    expect(tamanoSugerido(modelos, "Nissan", "Hilux")).toBeNull();
  });
});

describe("año y color", () => {
  it("los años van del que viene hasta 1950, como la regla de la base", () => {
    const anios = aniosParaElegir(new Date("2026-11-19T15:00:00Z"));
    expect(anios[0]).toBe(2027);
    expect(anios.at(-1)).toBe(1950);
  });
  it("un color frecuente se reconoce sin mayúsculas; uno distinto es «Otro»", () => {
    expect(colorFrecuente("rojo")).toBe("Rojo");
    expect(colorFrecuente("Vino")).toBeNull();
  });
});
