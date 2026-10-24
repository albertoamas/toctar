import { describe, expect, test } from "vitest";
import { ladosDeFotos } from "@/modulos/sitio/secciones-foto";

// Pedido de la demo del 24/10: la foto al lado de cada sección de la página de un servicio.

describe("lado de la foto de cada sección", () => {
  test("se alternan entre las secciones que tienen foto, empezando por la derecha", () => {
    expect(ladosDeFotos({ descripcion: true, proceso: true, opciones: true })).toEqual({ descripcion: "derecha", proceso: "izquierda", opciones: "derecha" });
  });

  test("una sección sin foto no cuenta: dos fotos seguidas nunca quedan del mismo lado", () => {
    const lados = ladosDeFotos({ descripcion: true, proceso: false, opciones: true });
    expect([lados.descripcion, lados.opciones]).toEqual(["derecha", "izquierda"]);
  });
});
