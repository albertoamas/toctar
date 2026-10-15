import { describe, expect, test } from "vitest";
import { erroresDe } from "@/lib/formularios";
import { CLAVES_PAGINA, datosDelFormulario, esquemaPagina, esquemaPregunta, leerContenido } from "@/modulos/sitio/contenido";

// HU-08 Textos del sitio. Criterios: docs/09-pruebas/criterios-entrega-1.md (8.x).

describe("textos de las páginas", () => {
  const nosotros = {
    historia: "Empezamos en 2024.",
    como_trabajamos: "Revisamos el vehículo.",
    por_que_elegirnos: JSON.stringify(["Productos profesionales"]),
  };

  test("hay textos de portada, nosotros y contacto (RF-10)", () => {
    expect(CLAVES_PAGINA).toEqual(["inicio", "nosotros", "contacto"]);
  });

  test("los campos de lista llegan como JSON y se validan como lista", () => {
    const datos = datosDelFormulario("nosotros", nosotros);
    expect(esquemaPagina("nosotros").parse(datos)).toEqual({ ...nosotros, por_que_elegirnos: ["Productos profesionales"] });
  });

  test.each([
    ["inicio", { lema: " ", presentacion: "Hola" }, { lema: "Escribe el lema." }],
    ["inicio", { lema: "x".repeat(81), presentacion: "Hola" }, { lema: "Hasta 80 caracteres." }],
    ["contacto", { bienvenida: "" }, { bienvenida: "Escribe el texto de bienvenida." }],
    ["nosotros", { ...nosotros, por_que_elegirnos: "[]" }, { por_que_elegirnos: "Agrega al menos un motivo." }],
    ["nosotros", { ...nosotros, por_que_elegirnos: JSON.stringify(["a", " "]) }, { "por_que_elegirnos.1": "Escribe el texto o quita la fila." }],
    ["nosotros", { ...nosotros, por_que_elegirnos: JSON.stringify(Array(7).fill("a")) }, { por_que_elegirnos: "Hasta 6." }],
  ] as const)("rechaza en %s: %j", (pagina, formulario, errores) => {
    const r = esquemaPagina(pagina).safeParse(datosDelFormulario(pagina, formulario as Record<string, string>));
    expect(r.success).toBe(false);
    expect(erroresDe(r.error!)).toEqual(errores);
  });

  test("si falta el texto en la base es un error, no un texto inventado en el código (RNF-11)", () => {
    expect(() => leerContenido("contacto", undefined)).toThrow(/contacto/);
    expect(leerContenido("contacto", { bienvenida: "Hola" })).toEqual({ bienvenida: "Hola" });
  });
});

describe("preguntas frecuentes", () => {
  test("pregunta y respuesta son obligatorias", () => {
    const r = esquemaPregunta.safeParse({ pregunta: " ", respuesta: "" });
    expect(erroresDe(r.error!)).toEqual({ pregunta: "Escribe la pregunta.", respuesta: "Escribe la respuesta." });
  });

  test("respeta los largos", () => {
    expect(esquemaPregunta.safeParse({ pregunta: "x".repeat(161), respuesta: "y" }).success).toBe(false);
    expect(esquemaPregunta.safeParse({ pregunta: "¿Hacen domicilio?", respuesta: "y".repeat(1000) }).success).toBe(true);
  });
});
