import { describe, expect, test } from "vitest";
import { AVISO_FORMAS_DISTINTAS, AVISO_FOTO_VERTICAL, avisosDeGaleria, esVertical, soloFotos, tienenMismaForma } from "@/lib/formato-fotos";

// El estándar de las fotos del sitio (pulido 13.12): cuándo se avisa. Avisar no bloquea la subida.

const horizontal = { ancho: 1600, alto: 1200 };
const vertical = { ancho: 1200, alto: 1600 };

describe("esVertical", () => {
  test("solo si el alto es mayor; una cuadrada o una vieja sin medidas no avisa", () => {
    expect(esVertical(vertical)).toBe(true);
    expect(esVertical(horizontal)).toBe(false);
    expect(esVertical({ ancho: 1000, alto: 1000 })).toBe(false);
    expect(esVertical({ ancho: null, alto: null })).toBe(false);
  });
});

describe("tienenMismaForma", () => {
  test("con 5 % de tolerancia", () => {
    expect(tienenMismaForma(horizontal, { ancho: 800, alto: 600 })).toBe(true);
    expect(tienenMismaForma(horizontal, { ancho: 1600, alto: 1250 })).toBe(true);
    expect(tienenMismaForma(horizontal, { ancho: 1600, alto: 900 })).toBe(false);
  });
});

describe("soloFotos", () => {
  test("deja lo que dice ser imagen, también HEIC (la decide el servidor), y saca lo demás", () => {
    const tipos = (lista: string[]) => soloFotos(lista.map((type) => ({ type }))).map((a) => a.type);
    expect(tipos(["image/jpeg", "image/heic", "application/pdf", ""])).toEqual(["image/jpeg", "image/heic"]);
    expect(tipos(["text/plain"])).toEqual([]);
  });
});

describe("avisosDeGaleria", () => {
  test("sin fotos o con horizontales iguales, ninguno", () => {
    expect(avisosDeGaleria(null, null)).toEqual([]);
    expect(avisosDeGaleria(horizontal, horizontal)).toEqual([]);
    expect(avisosDeGaleria(null, horizontal)).toEqual([]);
  });

  test("una vertical avisa, también sola", () => {
    expect(avisosDeGaleria(null, vertical)).toEqual([AVISO_FOTO_VERTICAL]);
    expect(avisosDeGaleria(vertical, vertical)).toEqual([AVISO_FOTO_VERTICAL]);
  });

  test("dos de distinta forma avisan, también si ninguna es vertical", () => {
    expect(avisosDeGaleria(horizontal, { ancho: 1600, alto: 900 })).toEqual([AVISO_FORMAS_DISTINTAS]);
    expect(avisosDeGaleria(horizontal, vertical)).toEqual([AVISO_FOTO_VERTICAL, AVISO_FORMAS_DISTINTAS]);
  });
});
