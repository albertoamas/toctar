import { describe, expect, test } from "vitest";
import { erroresDe } from "@/lib/formularios";
import { nombreRepetido, puedeDesactivar, reordenar } from "@/lib/orden";
import { esquemaElemento, type Elemento } from "@/modulos/configuracion/listas";
import { CLAVES_PARAMETRO, esquemaParametros, leerParametros } from "@/modulos/configuracion/parametros";

// HU-05 Parámetros del sistema. Criterios: docs/09-pruebas/criterios-entrega-1.md (5.x).

const validos = {
  adelanto_sugerido: "200",
  validez_cotizacion_dias: "15",
  dias_cotizacion_sin_respuesta: "7",
  condiciones_cotizacion: "Precios en bolivianos.",
  garantia_cotizacion: "Cubre el trabajo si se siguen los cuidados.",
  formas_pago_cotizacion: "Efectivo o QR.",
};

describe("parámetros: ninguno vacío ni negativo (HU-05)", () => {
  test("acepta los valores iniciales y los convierte a número", () => {
    expect(esquemaParametros.parse(validos)).toEqual({ ...validos, adelanto_sugerido: 200, validez_cotizacion_dias: 15, dias_cotizacion_sin_respuesta: 7 });
  });

  test.each([
    ["adelanto_sugerido", "", "Escribe un monto mayor a cero, hasta Bs 100 000."],
    ["adelanto_sugerido", "-5", "Escribe un monto mayor a cero, hasta Bs 100 000."],
    ["adelanto_sugerido", "0", "Escribe un monto mayor a cero, hasta Bs 100 000."],
    ["adelanto_sugerido", "200.5", "Escribe un número entero, sin decimales."],
    ["adelanto_sugerido", "100001", "Escribe un monto mayor a cero, hasta Bs 100 000."],
    ["validez_cotizacion_dias", "0", "Entre 1 y 365 días."],
    ["validez_cotizacion_dias", "366", "Entre 1 y 365 días."],
    ["dias_cotizacion_sin_respuesta", "0", "Entre 1 y 90 días."],
    ["dias_cotizacion_sin_respuesta", "91", "Entre 1 y 90 días."],
    ["condiciones_cotizacion", "   ", "Escribe las condiciones: sale en el PDF de la cotización."],
    ["garantia_cotizacion", "x".repeat(2001), "Hasta 2000 caracteres."],
  ])("rechaza %s = %j", (clave, valor, mensaje) => {
    const r = esquemaParametros.safeParse({ ...validos, [clave]: valor });
    expect(r.success).toBe(false);
    expect(erroresDe(r.error!)).toEqual({ [clave]: mensaje });
  });

  test("lee lo guardado en la base (números y textos en jsonb)", () => {
    const filas = [
      { clave: "adelanto_sugerido", valor: 250 },
      { clave: "validez_cotizacion_dias", valor: 10 },
      { clave: "dias_cotizacion_sin_respuesta", valor: 5 },
      { clave: "condiciones_cotizacion", valor: "Condiciones" },
      { clave: "garantia_cotizacion", valor: "Garantía" },
      { clave: "formas_pago_cotizacion", valor: "QR" },
    ];
    expect(leerParametros(filas)).toEqual({
      adelanto_sugerido: 250,
      validez_cotizacion_dias: 10,
      dias_cotizacion_sin_respuesta: 5,
      condiciones_cotizacion: "Condiciones",
      garantia_cotizacion: "Garantía",
      formas_pago_cotizacion: "QR",
    });
  });

  test("si falta un parámetro en la base es un error, no un valor inventado en el código (RNF-11)", () => {
    expect(() => leerParametros([{ clave: "adelanto_sugerido", valor: 200 }])).toThrow(/validez_cotizacion_dias/);
    expect(() =>
      leerParametros(CLAVES_PARAMETRO.map((clave) => ({ clave, valor: clave === "adelanto_sugerido" ? -1 : 5 }))),
    ).toThrow(/adelanto_sugerido/);
  });
});

describe("listas del taller", () => {
  const e = (id: number, orden: number, activo = true, nombre = `Espacio ${id}`): Elemento => ({ id, nombre, descripcion: null, orden, activo });
  const lista = [e(1, 1), e(2, 2), e(3, 3), e(4, 9, false)];

  test("subir y bajar intercambia con el vecino activo y renumera desde 1", () => {
    expect(reordenar(lista, 3, "subir")).toEqual([{ id: 1, orden: 1 }, { id: 3, orden: 2 }, { id: 2, orden: 3 }]);
    expect(reordenar(lista, 1, "bajar")).toEqual([{ id: 2, orden: 1 }, { id: 1, orden: 2 }, { id: 3, orden: 3 }]);
  });

  test("no se mueve más allá de los extremos ni un desactivado", () => {
    expect(reordenar(lista, 1, "subir")).toBeNull();
    expect(reordenar(lista, 3, "bajar")).toBeNull();
    expect(reordenar(lista, 4, "subir")).toBeNull();
  });

  test("el último activo no se puede desactivar (RN-06: sin espacios no hay agenda)", () => {
    expect(puedeDesactivar(lista, 1)).toBe(true);
    expect(puedeDesactivar([e(1, 1), e(2, 2, false)], 1)).toBe(false);
  });

  test("el nombre no se repite, sin importar mayúsculas ni si está desactivado", () => {
    expect(nombreRepetido(lista, "espacio 2")).toBe(true);
    expect(nombreRepetido(lista, "ESPACIO 4 ")).toBe(true);
    expect(nombreRepetido(lista, "Espacio 2", 2)).toBe(false); // renombrarse a sí mismo
    expect(nombreRepetido(lista, "Box 5")).toBe(false);
  });

  test("el nombre es obligatorio", () => {
    const r = esquemaElemento.safeParse({ lista: "espacios", nombre: "  " });
    expect(erroresDe(r.error!)).toEqual({ nombre: "Escribe un nombre." });
  });
});
