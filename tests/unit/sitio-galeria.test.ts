import { describe, expect, test } from "vitest";
import { filtrarPorServicio, serviciosConFotos } from "@/modulos/sitio/galeria";

// HU-12 Galería pública. Criterios: docs/09-pruebas/criterios-entrega-1.md (12.x).

const pulido = { nombre: "Pulido y nano cerámico", slug: "pulido-y-nano-ceramico" };
const vidrios = { nombre: "Pulido de vidrios", slug: "pulido-de-vidrios" };
const fotos = [
  { id: 1, servicio: pulido },
  { id: 2, servicio: vidrios },
  { id: 3, servicio: pulido },
];

describe("filtro de la galería", () => {
  test("las opciones son los servicios con fotos, sin repetir y en orden de aparición", () => {
    expect(serviciosConFotos(fotos)).toEqual([pulido, vidrios]);
  });

  test("filtra por servicio", () => {
    expect(filtrarPorServicio(fotos, "pulido-y-nano-ceramico").map((f) => f.id)).toEqual([1, 3]);
  });

  test("sin filtro, o con un servicio sin fotos, muestra todas", () => {
    expect(filtrarPorServicio(fotos, undefined)).toHaveLength(3);
    expect(filtrarPorServicio(fotos, "no-existe")).toHaveLength(3);
  });
});
