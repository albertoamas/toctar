import { describe, expect, test } from "vitest";
import { MODULOS, modulosDelMenu, permisosAsignables, puede, puedeVerModulo, type Modulo, type Permiso } from "@/lib/permisos";

// La matriz de docs/08-desarrollo/etapas/B1-acceso.md §5, casilla por casilla (RNF-05).

const todos = Object.keys(MODULOS) as Modulo[];
const dueno = { rol: "dueno" as const, permisos: [] };
const tecnico = { rol: "tecnico" as const, permisos: [] };
const encargado = (permisos: Permiso[] | string[]) => ({ rol: "encargado" as const, permisos });

describe("dueño", () => {
  test.each(todos)("ve %s", (m) => expect(puedeVerModulo(dueno, m)).toBe(true));
  test("autoriza entregas con saldo", () => expect(puede(dueno, "entrega_con_saldo")).toBe(true));
});

describe("técnico (RN-12)", () => {
  const visibles: Modulo[] = ["inicio", "ordenes"];
  test.each(todos)("%s", (m) => expect(puedeVerModulo(tecnico, m)).toBe(visibles.includes(m)));
  test("no autoriza entregas con saldo", () => expect(puede(tecnico, "entrega_con_saldo")).toBe(false));
});

describe("encargado", () => {
  const conPermiso: [Modulo, Permiso][] = [
    ["sitio", "sitio"],
    ["reclamos", "reclamos"],
    ["clientes", "clientes"],
    ["consultas", "consultas"],
    ["agenda", "agenda"],
    ["ordenes", "ordenes"],
    ["pagos", "pagos"],
    ["mantenimientos", "mantenimientos"],
  ];

  test("sin permisos solo ve el inicio", () => {
    for (const m of todos) expect(puedeVerModulo(encargado([]), m)).toBe(m === "inicio");
  });

  test.each(conPermiso)("con el permiso del módulo ve %s, y solo ese", (modulo, permiso) => {
    const e = encargado([permiso]);
    for (const m of todos) expect(puedeVerModulo(e, m)).toBe(m === "inicio" || m === modulo);
  });

  test.each(["cotizaciones", "usuarios", "configuracion", "catalogo"] as Modulo[])(
    "nunca ve %s, aunque tenga todos los permisos (RN-01)",
    (m) => {
      // Incluso con un valor raro guardado a la fuerza con el nombre del módulo
      const e = encargado([...conPermiso.map(([, p]) => p), "cotizaciones", "usuarios", "configuracion", "catalogo"]);
      expect(puedeVerModulo(e, m)).toBe(false);
    },
  );

  test("autoriza entregas con saldo solo con ese permiso (RN-13, S-2)", () => {
    expect(puede(encargado([]), "entrega_con_saldo")).toBe(false);
    expect(puede(encargado(["entrega_con_saldo"]), "entrega_con_saldo")).toBe(true);
  });
});

describe("menú y casillas", () => {
  test("el menú solo muestra módulos construidos que el usuario puede ver", () => {
    expect(modulosDelMenu(dueno)).toEqual(todos.filter((m) => MODULOS[m].construido));
    expect(modulosDelMenu(tecnico)).toEqual(["inicio"].filter((m) => MODULOS[m as Modulo].construido));
    expect(modulosDelMenu(encargado([]))).toEqual(["inicio"]);
  });

  test("las casillas del encargado son las de módulos construidos más la entrega con saldo", () => {
    const asignables = permisosAsignables().map((p) => p.permiso);
    expect(asignables.at(-1)).toBe("entrega_con_saldo");
    for (const p of asignables.slice(0, -1)) {
      const modulo = todos.find((m) => MODULOS[m].permisoEncargado === p)!;
      expect(MODULOS[modulo].construido).toBe(true);
    }
  });
});
