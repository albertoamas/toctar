import { describe, expect, test } from "vitest";
import { esquemaActualizarUsuario, esquemaCrearUsuario } from "@/modulos/usuarios/esquemas";
import { cambioDeRolDejaSinDueno, quedaOtroDuenoActivo } from "@/modulos/usuarios/reglas";

// HU-02: siempre queda al menos un dueño activo (docs/08-desarrollo/etapas/B1-acceso.md §3).

const ana = { id: 1, rol: "dueno" as const, desactivado: false };
const beto = { id: 2, rol: "dueno" as const, desactivado: false };
const ciro = { id: 3, rol: "dueno" as const, desactivado: true };
const tec = { id: 4, rol: "tecnico" as const, desactivado: false };

describe("quedaOtroDuenoActivo", () => {
  test("con un solo dueño, no queda otro", () => expect(quedaOtroDuenoActivo([ana, tec], 1)).toBe(false));
  test("con dos dueños activos, sí queda otro", () => expect(quedaOtroDuenoActivo([ana, beto], 1)).toBe(true));
  test("un dueño desactivado no cuenta", () => expect(quedaOtroDuenoActivo([ana, ciro, tec], 1)).toBe(false));
});

describe("cambioDeRolDejaSinDueno", () => {
  test("el único dueño no puede pasar a técnico", () => expect(cambioDeRolDejaSinDueno([ana, tec], 1, "tecnico")).toBe(true));
  test("con otro dueño activo, sí puede", () => expect(cambioDeRolDejaSinDueno([ana, beto], 1, "encargado")).toBe(false));
  test("seguir siendo dueño nunca deja sin dueño", () => expect(cambioDeRolDejaSinDueno([ana], 1, "dueno")).toBe(false));
  test("cambiar el rol de un técnico no afecta", () => expect(cambioDeRolDejaSinDueno([ana, tec], 4, "encargado")).toBe(false));
});

describe("formulario de usuario", () => {
  const valido = { nombre: "Juan Pérez", usuario: "Juan.Perez", contrasena: "clave-123", rol: "tecnico", permisos: [] };

  test("normaliza el usuario a minúsculas", () => {
    expect(esquemaCrearUsuario.parse(valido).usuario).toBe("juan.perez");
  });

  test("rechaza contraseña corta, rol inventado y permiso inexistente", () => {
    expect(esquemaCrearUsuario.safeParse({ ...valido, contrasena: "1234" }).success).toBe(false);
    expect(esquemaCrearUsuario.safeParse({ ...valido, rol: "admin" }).success).toBe(false);
    expect(esquemaCrearUsuario.safeParse({ ...valido, permisos: ["cotizaciones"] }).success).toBe(false);
  });

  test("al editar, el id llega del formulario como texto", () => {
    expect(esquemaActualizarUsuario.parse({ id: "7", nombre: "Ana", rol: "dueno", permisos: [] }).id).toBe(7);
  });
});
