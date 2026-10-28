import { describe, expect, test } from "vitest";
import { MODULOS, menuAgrupado, modulosDelMenu, nombreEnMenu, permisosAsignables, puede, puedeVerModulo, type Modulo, type Permiso } from "@/lib/permisos";

// La matriz de docs/08-desarrollo/etapas/B1-acceso.md §5, casilla por casilla (RNF-05).

const todos = Object.keys(MODULOS) as Modulo[];
const dueno = { rol: "dueno" as const, permisos: [] };
const tecnico = { rol: "tecnico" as const, permisos: [] };
const encargado = (permisos: Permiso[] | string[]) => ({ rol: "encargado" as const, permisos });

describe("dueño", () => {
  test.each(todos)("ve %s", (m) => expect(puedeVerModulo(dueno, m)).toBe(true));
  test("autoriza entregas con saldo", () => expect(puede(dueno, "entrega_con_saldo")).toBe(true));
  test("cotiza, suma adicionales y publica en la galería desde una orden (RN-01)", () => {
    expect(puede(dueno, "cotizar")).toBe(true);
    expect(puede(dueno, "agregar_adicional")).toBe(true);
    expect(puede(dueno, "publicar_en_galeria")).toBe(true);
  });
});

describe("técnico (RN-12)", () => {
  const visibles: Modulo[] = ["inicio", "ordenes"];
  test.each(todos)("%s", (m) => expect(puedeVerModulo(tecnico, m)).toBe(visibles.includes(m)));
  test("no autoriza entregas con saldo ni cotiza", () => {
    expect(puede(tecnico, "entrega_con_saldo")).toBe(false);
    expect(puede(tecnico, "cotizar")).toBe(false);
  });
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

  // Incluso con un valor raro guardado a la fuerza con el nombre del módulo o de la acción
  const conTodo = encargado([...conPermiso.map(([, p]) => p), "entrega_con_saldo", "cotizar", "cotizaciones", "usuarios", "configuracion", "catalogo"]);

  test.each(["usuarios", "configuracion", "catalogo"] as Modulo[])("nunca ve %s, aunque tenga todos los permisos (RN-01)", (m) => {
    expect(puedeVerModulo(conTodo, m)).toBe(false);
  });

  test("nunca cotiza, suma adicionales ni publica en la galería, aunque tenga todos los permisos (RN-01)", () => {
    expect(puede(conTodo, "cotizar")).toBe(false);
    expect(puede(conTodo, "agregar_adicional")).toBe(false);
    expect(puede(conTodo, "publicar_en_galeria")).toBe(false);
  });

  test("autoriza entregas con saldo solo con ese permiso (RN-13, S-2)", () => {
    expect(puede(encargado([]), "entrega_con_saldo")).toBe(false);
    expect(puede(encargado(["entrega_con_saldo"]), "entrega_con_saldo")).toBe(true);
  });
});

describe("menú en grupos (C5 §0)", () => {
  test("el dueño ve todos los grupos, con su título, en orden", () => {
    expect(menuAgrupado(dueno).map((g) => [g.titulo, g.modulos])).toEqual([
      [null, ["inicio"]],
      ["Taller", ["agenda", "ordenes"]],
      ["Clientes", ["clientes", "consultas", "pagos", "mantenimientos", "reclamos"]],
      [null, ["sitio"]],
      ["Administración", ["catalogo", "usuarios", "configuracion"]],
    ]);
  });

  test("un grupo con un solo módulo va sin título; uno vacío no aparece", () => {
    expect(menuAgrupado(tecnico)).toEqual([
      { titulo: null, modulos: ["inicio"] },
      { titulo: null, modulos: ["ordenes"] },
    ]);
    expect(menuAgrupado(encargado(["agenda", "ordenes", "pagos"])).map((g) => g.titulo)).toEqual([null, "Taller", null]);
  });
});

describe("menú y casillas", () => {
  test("el menú muestra los módulos que el usuario puede ver", () => {
    expect(modulosDelMenu(dueno)).toEqual(todos);
    // El técnico: solo sus órdenes (RN-12)
    expect(modulosDelMenu(tecnico)).toEqual(["inicio", "ordenes"]);
    expect(modulosDelMenu(encargado([]))).toEqual(["inicio"]);
  });

  test("las casillas del encargado son las de sus módulos más la entrega con saldo", () => {
    const deModulos = todos.map((m) => MODULOS[m].permisoEncargado).filter((p) => p !== null);
    expect(permisosAsignables().map((p) => p.permiso)).toEqual([...deModulos, "entrega_con_saldo"]);
  });
});

test("Pagos se llama «Saldos pendientes» en el menú y su casilla dice lo que da (HU-37, C5 §0)", () => {
  expect(nombreEnMenu("pagos", "dueno")).toBe("Saldos pendientes");
  expect(MODULOS.pagos.nombre).toBe("Pagos");
  // La casilla del encargado dice lo que da (C5 §0); las demás, el nombre del módulo
  expect(permisosAsignables().find((p) => p.permiso === "pagos")?.nombre).toBe("Pagos (cobrar y ver saldos)");
  expect(permisosAsignables().find((p) => p.permiso === "agenda")?.nombre).toBe("Agenda");
  expect(nombreEnMenu("agenda", "dueno")).toBe("Agenda");
  // El técnico ve solo las suyas: "Mis órdenes", como el título de su pantalla (pulido 13.1)
  expect(nombreEnMenu("ordenes", "tecnico")).toBe("Mis órdenes");
  expect(nombreEnMenu("ordenes", "dueno")).toBe("Órdenes");
  expect(modulosDelMenu({ rol: "encargado", permisos: ["pagos"] })).toEqual(["inicio", "pagos"]);
});
