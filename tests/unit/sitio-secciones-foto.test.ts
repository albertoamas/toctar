import { describe, expect, test } from "vitest";
import { ladosDeFotos } from "@/modulos/sitio/secciones-foto";

// Pedido de la demo del 24/10: la foto al lado de cada sección de la página de un servicio.

describe("lado de la foto de cada sección", () => {
  test("se alternan entre las secciones que tienen foto, empezando por la derecha", () => {
    expect(ladosDeFotos({ proceso: true, opciones: true })).toEqual({ proceso: "derecha", opciones: "izquierda" });
  });

  test("una sección sin foto no cuenta: la siguiente con foto empieza por la derecha", () => {
    expect(ladosDeFotos({ proceso: false, opciones: true }).opciones).toBe("derecha");
  });
});
