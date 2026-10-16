import { describe, expect, test } from "vitest";
import { LARGO_DESCRIPCION, descripcionGaleria, descripcionServicios, enumerar, recortarDescripcion } from "@/modulos/sitio/metadatos";

// Descripciones para Google armadas con lo que carga el dueño (HU-18). Criterios: 18.1.

describe("descripciones para Google", () => {
  test("un texto corto queda igual, con los espacios normalizados", () => {
    expect(recortarDescripcion("  Hola\n  mundo ")).toBe("Hola mundo");
  });

  test("un texto largo se corta en una palabra entera, con puntos suspensivos", () => {
    const largo = "palabra ".repeat(40);
    const r = recortarDescripcion(largo);
    expect(r.length).toBeLessThanOrEqual(LARGO_DESCRIPCION);
    expect(r.endsWith("palabra…")).toBe(true);
  });

  test("enumera con comas y la última con y", () => {
    expect(enumerar([])).toBe("");
    expect(enumerar(["Pulido"])).toBe("Pulido");
    expect(enumerar(["Pulido", "Polarizado", "PPF"])).toBe("Pulido, Polarizado y PPF");
  });

  test("la de servicios nombra los servicios visibles; sin servicios, una genérica", () => {
    expect(descripcionServicios(["Pulido", "Polarizado"])).toBe("Servicios de detailing en Tarija: Pulido y Polarizado. Escríbenos por WhatsApp y te cotizamos.");
    expect(descripcionServicios([])).toContain("Tarija");
    expect(descripcionServicios(Array.from({ length: 20 }, (_, i) => `Servicio número ${i}`)).length).toBeLessThanOrEqual(LARGO_DESCRIPCION);
  });

  test("la de la galería nombra los servicios con fotos", () => {
    expect(descripcionGaleria(["Faroles"])).toBe("Trabajos reales en Tarija, con fotos de antes y después: Faroles.");
    expect(descripcionGaleria([])).toContain("antes y después");
  });
});
