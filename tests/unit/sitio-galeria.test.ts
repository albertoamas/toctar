import { describe, expect, test } from "vitest";
import { agruparPorServicio, filtrarPorServicio, ladoDelLema, nombreDelTrabajo, serviciosConFotos, trabajoDePortada } from "@/modulos/sitio/galeria";

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

describe("trabajo del comparador de la portada", () => {
  const foto = { url: "x" };
  const trabajo = (id: number, antes: boolean, enPortada = false) => ({ id, antes: antes ? foto : null, enPortada });

  test("va el elegido en el panel", () => {
    expect(trabajoDePortada([trabajo(1, true), trabajo(2, true, true)])?.id).toBe(2);
  });

  test("sin elegido, va el primero con foto de antes", () => {
    expect(trabajoDePortada([trabajo(1, false), trabajo(2, true), trabajo(3, true)])?.id).toBe(2);
  });

  test("sin ninguno con antes, no hay comparador", () => {
    expect(trabajoDePortada([trabajo(1, false), trabajo(2, false)])).toBeNull();
    expect(trabajoDePortada([])).toBeNull();
  });
});

describe("al lado del lema de la portada", () => {
  test("con un trabajo con antes va el comparador, haya o no foto del taller", () => {
    expect(ladoDelLema({ hayFotoTaller: false, hayComparador: true })).toBe("comparador");
    expect(ladoDelLema({ hayFotoTaller: true, hayComparador: true })).toBe("comparador");
  });

  test("sin comparador, el arte de la marca solo si no hay foto del taller", () => {
    expect(ladoDelLema({ hayFotoTaller: false, hayComparador: false })).toBe("arte");
    expect(ladoDelLema({ hayFotoTaller: true, hayComparador: false })).toBeNull();
  });
});

describe("galería por servicio", () => {
  const conAntes = (id: number, servicio: typeof pulido) => ({ id, servicio, antes: { url: "x" } });
  const sola = (id: number, servicio: typeof pulido) => ({ id, servicio, antes: null });

  test("una sección por servicio, en el orden en que aparecen, con los pares primero", () => {
    const grupos = agruparPorServicio([sola(1, pulido), conAntes(2, vidrios), conAntes(3, pulido), sola(4, vidrios)]);
    expect(grupos.map((g) => g.servicio.slug)).toEqual(["pulido-y-nano-ceramico", "pulido-de-vidrios"]);
    expect(grupos[0].pares.map((f) => f.id)).toEqual([3]);
    expect(grupos[0].solas.map((f) => f.id)).toEqual([1]);
    expect(grupos[1].pares.map((f) => f.id)).toEqual([2]);
    expect(grupos[1].solas.map((f) => f.id)).toEqual([4]);
  });

  test("un trabajo sin descripción se nombra por su servicio", () => {
    expect(nombreDelTrabajo("  ", "Instalación de PPF")).toBe("Trabajo de Instalación de PPF");
    // En el panel, con su número: varios sin descripción se distinguen
    expect(nombreDelTrabajo("", "Pulido de vidrios", 7)).toBe("Trabajo de Pulido de vidrios (n.º 7)");
    expect(nombreDelTrabajo("Hilux con nano cerámico", "Pulido y nano cerámico")).toBe("Hilux con nano cerámico");
  });
});
