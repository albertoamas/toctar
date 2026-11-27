import { describe, expect, it } from "vitest";
import { ajustarPagina, conPagina, leerPagina, POR_PAGINA } from "@/lib/paginacion";

// Las listas largas del panel, de a páginas (17/11): src/lib/paginacion.ts.

describe("leerPagina", () => {
  it("lee un número de página de la dirección", () => {
    expect(leerPagina("3")).toBe(3);
  });

  it("lo raro es la primera: nada, texto, 0, negativos, decimales, números enormes y repetidos", () => {
    for (const raro of [undefined, "", "abc", "0", "-2", "1.5", "1e3", "9999999", ["2", "3"]]) expect(leerPagina(raro)).toBe(1);
  });
});

describe("ajustarPagina", () => {
  it("cuenta las páginas: una lista vacía o corta tiene una", () => {
    expect(ajustarPagina(1, 0)).toEqual({ pagina: 1, paginas: 1 });
    expect(ajustarPagina(1, POR_PAGINA)).toEqual({ pagina: 1, paginas: 1 });
    expect(ajustarPagina(1, POR_PAGINA + 1)).toEqual({ pagina: 1, paginas: 2 });
  });

  it("una página después de la última es la última", () => {
    expect(ajustarPagina(99, 78)).toEqual({ pagina: 4, paginas: 4 });
    expect(ajustarPagina(5, 0)).toEqual({ pagina: 1, paginas: 1 });
  });
});

describe("conPagina", () => {
  it("conserva los filtros y la búsqueda, y la primera página no lleva el parámetro", () => {
    expect(conPagina("/panel/clientes", { q: "ana", ver: "desactivados", pagina: "3" }, 2)).toBe("/panel/clientes?q=ana&ver=desactivados&pagina=2");
    expect(conPagina("/panel/clientes", { q: "ana", pagina: "3" }, 1)).toBe("/panel/clientes?q=ana");
    expect(conPagina("/panel/clientes", {}, 1)).toBe("/panel/clientes");
  });

  it("deja afuera los parámetros vacíos y escapa la búsqueda", () => {
    expect(conPagina("/panel/clientes", { q: "", otro: undefined }, 2)).toBe("/panel/clientes?pagina=2");
    expect(conPagina("/panel/clientes", { q: "josé & cía" }, 2)).toBe("/panel/clientes?q=jos%C3%A9+%26+c%C3%ADa&pagina=2");
  });
});
