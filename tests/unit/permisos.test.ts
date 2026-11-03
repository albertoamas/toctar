import { describe, expect, test } from "vitest";
import { MODULOS, menuAgrupado, modulosDelMenu, nombreEnMenu, PERFILES, perfilDe, PERMISOS, permisosAsignables, puede, puedeVerModulo, type Modulo, type Permiso } from "@/lib/permisos";
import { ROLES } from "@/lib/roles";

// La matriz de docs/08-desarrollo/etapas/B1-acceso.md §5, casilla por casilla (RNF-05).

const todos = Object.keys(MODULOS) as Modulo[];
const dueno = { rol: "dueno" as const, permisos: [] };
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

test("dos roles: dueño y encargado (pedido 32, sin técnico)", () => {
  expect(ROLES).toEqual(["dueno", "encargado"]);
});

test("un rol que no existe (un técnico viejo en la base) no ve ni puede nada, aunque traiga permisos", () => {
  const viejo = { rol: "tecnico" as never, permisos: [...PERMISOS] };
  for (const m of todos) expect(puedeVerModulo(viejo, m)).toBe(false);
  expect(puede(viejo, "recibir_vehiculo")).toBe(false);
  expect(puede(viejo, "entregar_vehiculo")).toBe(false);
  // Con los mismos permisos, un encargado sí
  expect(puede(encargado([...PERMISOS]), "recibir_vehiculo")).toBe(true);
});

describe("perfiles del encargado (pedido 32)", () => {
  const [taller, atencion, todo] = PERFILES;

  test("Taller: agenda y órdenes; recibe, trabaja y entrega, sin ver precios ni cotizar (RN-12)", () => {
    expect(taller.permisos).toEqual(["agenda", "ordenes"]);
    const e = encargado([...taller.permisos]);
    expect(puede(e, "recibir_vehiculo")).toBe(true);
    expect(puede(e, "entregar_vehiculo")).toBe(true);
    expect(puedeVerModulo(e, "pagos")).toBe(false);
    expect(puede(e, "cotizar")).toBe(false);
  });

  test("Atención incluye Taller; Todo tiene todos los permisos", () => {
    expect(taller.permisos.every((p) => (atencion.permisos as readonly string[]).includes(p))).toBe(true);
    expect([...todo.permisos].sort()).toEqual([...PERMISOS].sort());
  });

  test("cada perfil usa permisos que existen, sin repetir", () => {
    for (const p of PERFILES) {
      expect(new Set(p.permisos).size).toBe(p.permisos.length);
      for (const x of p.permisos) expect(PERMISOS).toContain(x);
    }
  });

  test("perfilDe reconoce el perfil sin importar el orden, y ninguno si se ajustó una casilla", () => {
    expect(perfilDe(["ordenes", "agenda"])?.clave).toBe("taller");
    expect(perfilDe([...atencion.permisos].reverse())?.clave).toBe("atencion");
    expect(perfilDe(PERMISOS)?.clave).toBe("todo");
    expect(perfilDe(["agenda", "ordenes", "reclamos"])).toBeNull();
    expect(perfilDe([])).toBeNull();
  });
});

describe("encargado", () => {
  const conPermiso: [Modulo, Permiso][] = [
    ["sitio", "sitio"],
    ["reclamos", "reclamos"],
    ["clientes", "clientes"],
    ["cotizaciones", "cotizaciones"],
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

  test("cotiza solo con «Cotizaciones» (pedido 24, RN-01)", () => {
    expect(puede(encargado([]), "cotizar")).toBe(false);
    expect(puede(encargado(["cotizaciones"]), "cotizar")).toBe(true);
    // Ni con todos los demás permisos
    expect(puede(encargado(["clientes", "agenda", "ordenes", "pagos", "entrega_con_saldo"]), "cotizar")).toBe(false);
  });

  test("nunca suma adicionales ni publica en la galería, aunque tenga todos los permisos", () => {
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
      ["Clientes", ["clientes", "cotizaciones", "pagos", "mantenimientos", "reclamos"]],
      [null, ["sitio"]],
      ["Administración", ["catalogo", "usuarios", "configuracion"]],
    ]);
  });

  test("un grupo con un solo módulo va sin título; uno vacío no aparece", () => {
    expect(menuAgrupado(encargado(["ordenes"]))).toEqual([
      { titulo: null, modulos: ["inicio"] },
      { titulo: null, modulos: ["ordenes"] },
    ]);
    expect(menuAgrupado(encargado(["agenda", "ordenes", "pagos"])).map((g) => g.titulo)).toEqual([null, "Taller", null]);
  });
});

describe("menú y casillas", () => {
  test("el menú muestra los módulos que el usuario puede ver", () => {
    expect(modulosDelMenu(dueno)).toEqual(todos);
    // El perfil Taller: la agenda y las órdenes
    expect(modulosDelMenu(encargado(["agenda", "ordenes"]))).toEqual(["inicio", "agenda", "ordenes"]);
    expect(modulosDelMenu(encargado([]))).toEqual(["inicio"]);
  });

  test("las casillas del encargado son las de sus módulos más la entrega con saldo", () => {
    const deModulos = todos.map((m) => MODULOS[m].permisoEncargado).filter((p) => p !== null);
    expect(permisosAsignables().map((p) => p.permiso)).toEqual([...deModulos, "entrega_con_saldo"]);
  });
});

test("Pagos se llama «Saldos pendientes» en el menú y su casilla dice lo que da (HU-37, C5 §0)", () => {
  expect(nombreEnMenu("pagos")).toBe("Saldos pendientes");
  expect(MODULOS.pagos.nombre).toBe("Pagos");
  // La casilla del encargado dice lo que da (C5 §0); las demás, el nombre del módulo
  expect(permisosAsignables().find((p) => p.permiso === "pagos")?.nombre).toBe("Pagos (cobrar y ver saldos)");
  expect(permisosAsignables().find((p) => p.permiso === "agenda")?.nombre).toBe("Agenda");
  expect(nombreEnMenu("agenda")).toBe("Agenda");
  expect(nombreEnMenu("ordenes")).toBe("Órdenes");
  expect(modulosDelMenu({ rol: "encargado", permisos: ["pagos"] })).toEqual(["inicio", "pagos"]);
});
