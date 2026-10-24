import { describe, expect, test } from "vitest";
import { erroresDe } from "@/lib/formularios";
import { PATRON_SLUG, crearSlug } from "@/lib/slug";
import { esquemaId, esquemaIdFormulario, esquemaServicio, esquemaVisibilidad } from "@/modulos/sitio/esquemas";

// HU-07 Servicios del sitio: la página de cada servicio. Criterios: docs/09-pruebas/criterios-entrega-1.md (7.x). El
// alta, el nombre y las variantes son del catálogo (tests/unit/catalogo.test.ts).

describe("dirección de la página (slug)", () => {
  test.each([
    ["Pulido y nano cerámico", "pulido-y-nano-ceramico"],
    ["Restauración de faroles con polímero", "restauracion-de-faroles-con-polimero"],
    ["Lavado de interior — Premium!", "lavado-de-interior-premium"],
    ["  Instalación de PPF  ", "instalacion-de-ppf"],
    ["Año 2026 / ñandú", "ano-2026-nandu"],
  ])("%s → %s", (nombre, slug) => {
    expect(crearSlug(nombre)).toBe(slug);
    expect(PATRON_SLUG.test(slug)).toBe(true);
  });

  test("sin letras ni números queda vacío (se usa 'servicio')", () => {
    expect(crearSlug("¿?¡!")).toBe("");
  });

  test("no pasa de 80 caracteres ni termina en guion", () => {
    const slug = crearSlug("palabra ".repeat(20));
    expect(slug.length).toBeLessThanOrEqual(80);
    expect(slug.endsWith("-")).toBe(false);
  });
});

describe("esquema del servicio", () => {
  const valido = {
    id: "1",
    slug: "pulido-y-nano-ceramico",
    resumen: "Corregimos la pintura y la protegemos.",
    descripcion: "",
    beneficios: JSON.stringify(["Brillo", "Protección"]),
    pasos: JSON.stringify([{ titulo: "Lavado", detalle: "" }]),
    visible: true,
  };

  test("acepta un servicio completo y convierte las listas", () => {
    const r = esquemaServicio.parse(valido);
    expect(r.beneficios).toEqual(["Brillo", "Protección"]);
    expect(r.pasos).toEqual([{ titulo: "Lavado", detalle: "" }]);
  });

  test.each([
    ["resumen largo", { resumen: "x".repeat(161) }, { resumen: "Hasta 160 caracteres." }],
    ["dirección con mayúsculas", { slug: "Pulido_Ceramico" }, { slug: "La dirección solo lleva minúsculas, números y guiones." }],
    ["beneficio vacío", { beneficios: JSON.stringify(["Brillo", " "]) }, { "beneficios.1": "Escribe el beneficio o quita la fila." }],
    ["más de 8 beneficios", { beneficios: JSON.stringify(Array(9).fill("a")) }, { beneficios: "Hasta 8 beneficios." }],
    ["paso sin título", { pasos: JSON.stringify([{ titulo: "", detalle: "x" }]) }, { "pasos.0": "Cada paso necesita un título." }],
    ["más de 10 pasos", { pasos: JSON.stringify(Array(11).fill({ titulo: "a", detalle: "" })) }, { pasos: "Hasta 10 pasos." }],
  ])("rechaza %s", (_, cambio, errores) => {
    const r = esquemaServicio.safeParse({ ...valido, ...cambio });
    expect(r.success).toBe(false);
    expect(erroresDe(r.error!)).toEqual(errores);
  });

  test("RN-10: el servicio no tiene campos de precio", () => {
    expect(Object.keys(esquemaServicio.shape).some((c) => /precio|monto|costo/i.test(c))).toBe(false);
  });

  test("el nombre no se cambia desde el sitio: es del catálogo", () => {
    expect(Object.keys(esquemaServicio.shape)).not.toContain("nombre");
  });
});

describe("datos sueltos de las acciones (revisión de seguridad)", () => {
  test("los ids deben ser enteros positivos", () => {
    expect(esquemaId.safeParse(3).success).toBe(true);
    for (const malo of [0, -1, 1.5, Number.NaN, "3", null]) expect(esquemaId.safeParse(malo).success).toBe(false);
    expect(esquemaIdFormulario.parse("7")).toBe(7);
    expect(esquemaIdFormulario.safeParse("abc").success).toBe(false);
  });

  test("mostrar y ocultar piden un sí o no de verdad", () => {
    expect(esquemaVisibilidad.safeParse({ id: 1, visible: "true" }).success).toBe(false);
  });
});
