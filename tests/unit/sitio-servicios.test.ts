import { describe, expect, test } from "vitest";
import { erroresDe } from "@/lib/formularios";
import { nombreRepetido, puedeDesactivar } from "@/lib/orden";
import { PATRON_SLUG, crearSlug } from "@/lib/slug";
import {
  esquemaEstadoVariante,
  esquemaId,
  esquemaIdFormulario,
  esquemaMoverVariante,
  esquemaServicio,
  esquemaVariante,
  esquemaVisibilidad,
} from "@/modulos/sitio/esquemas";

// HU-07 Servicios del sitio. Criterios: docs/09-pruebas/criterios-entrega-1.md (7.x).

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
    nombre: "Pulido y nano cerámico",
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
    ["nombre", { nombre: " " }, { nombre: "Escribe el nombre del servicio." }],
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
});

describe("datos sueltos de las acciones (revisión de seguridad)", () => {
  test("los ids deben ser enteros positivos", () => {
    expect(esquemaId.safeParse(3).success).toBe(true);
    for (const malo of [0, -1, 1.5, Number.NaN, "3", null]) expect(esquemaId.safeParse(malo).success).toBe(false);
    expect(esquemaIdFormulario.parse("7")).toBe(7);
    expect(esquemaIdFormulario.safeParse("abc").success).toBe(false);
  });

  test("mostrar, ocultar y activar piden un sí o no de verdad", () => {
    expect(esquemaVisibilidad.safeParse({ id: 1, visible: "true" }).success).toBe(false);
    expect(esquemaEstadoVariante.safeParse({ servicioId: 1, id: 2, activo: 1 }).success).toBe(false);
    expect(esquemaMoverVariante.safeParse({ servicioId: 1, id: 2, direccion: "subir" }).success).toBe(true);
    expect(esquemaMoverVariante.safeParse({ id: 2, direccion: "subir" }).success).toBe(false);
  });
});
