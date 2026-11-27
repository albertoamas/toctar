import { describe, expect, it } from "vitest";
import { aniosParaElegir, marcaExacta, marcasParaElegir } from "@/modulos/clientes/catalogo-vehiculos";

// Pedido 52 (etapas/P52-catalogo-de-marcas.md): menos escritura al registrar un vehículo.

const marcas = ["Hyundai", "Mitsubishi", "Toyota"];

describe("marcas", () => {
  it("la escrita con otras mayúsculas es la de la lista", () => {
    expect(marcaExacta(marcas, " toyota ")).toBe("Toyota");
    expect(marcaExacta(marcas, "Toyot")).toBeNull();
  });
  it("una marca vieja que ya no está en la lista se sigue ofreciendo en su vehículo", () => {
    expect(marcasParaElegir(marcas, "Lada")).toEqual(["Hyundai", "Lada", "Mitsubishi", "Toyota"]);
    expect(marcasParaElegir(marcas, "toyota")).toEqual(marcas);
  });
});

describe("año y color", () => {
  it("los años van del que viene hasta 1950, como la regla de la base", () => {
    const anios = aniosParaElegir(new Date("2026-11-19T15:00:00Z"));
    expect(anios[0]).toBe(2027);
    expect(anios.at(-1)).toBe(1950);
  });
});
