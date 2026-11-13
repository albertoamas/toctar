import { describe, expect, test } from "vitest";
import { esquemaCrearUsuario, esquemaDatosUsuario, esquemaMiContrasena, esquemaPermisosUsuario } from "@/modulos/usuarios/esquemas";
import { puedeCambiar, type CambioDeCuenta } from "@/modulos/usuarios/reglas";

// HU-02 y RN-15 (pedido 50, docs/08-desarrollo/etapas/P50-cuenta-del-dueno-protegida.md): desde el panel, la cuenta de un
// dueño no se cambia, salvo su nombre por él mismo. Así siempre queda un dueño activo, sin candados.

const yo = 1;
const yoDueno = { id: yo, rol: "dueno" as const };
const otroDueno = { id: 2, rol: "dueno" as const };
const encargado = { id: 3, rol: "encargado" as const };
const todos: CambioDeCuenta[] = ["nombre", "permisos", "contrasena", "acceso"];

describe("puedeCambiar (RN-15)", () => {
  test("a un encargado, el dueño le cambia todo", () => {
    for (const c of todos) expect(puedeCambiar(encargado, yo, c), c).toBe(true);
  });
  test("de sí mismo, el dueño solo cambia el nombre (la contraseña, con la actual, en otra acción)", () => {
    expect(puedeCambiar(yoDueno, yo, "nombre")).toBe(true);
    for (const c of ["permisos", "contrasena", "acceso"] as const) expect(puedeCambiar(yoDueno, yo, c), c).toBe(false);
  });
  test("la cuenta de otro dueño no se cambia en nada", () => {
    for (const c of todos) expect(puedeCambiar(otroDueno, yo, c), c).toBe(false);
  });
});

describe("formulario de usuario", () => {
  const valido = { nombre: "Juan Pérez", usuario: "Juan.Perez", contrasena: "clave-123", permisos: ["agenda", "ordenes"] };

  test("normaliza el usuario a minúsculas", () => {
    expect(esquemaCrearUsuario.parse(valido).usuario).toBe("juan.perez");
  });

  test("rechaza contraseña corta y permiso inexistente", () => {
    expect(esquemaCrearUsuario.safeParse({ ...valido, contrasena: "1234" }).success).toBe(false);
    expect(esquemaCrearUsuario.safeParse({ ...valido, permisos: ["consultas"] }).success).toBe(false);
  });

  // Pedido 50: crear no lleva rol; uno que llegue a mano se descarta (la acción crea un encargado)
  test("crear no lleva el rol", () => {
    expect(esquemaCrearUsuario.parse({ ...valido, rol: "dueno" })).not.toHaveProperty("rol");
  });

  test("al editar, el id llega del formulario como texto", () => {
    expect(esquemaDatosUsuario.parse({ id: "7", nombre: "Ana" }).id).toBe(7);
    expect(esquemaPermisosUsuario.parse({ id: "7", permisos: [] }).id).toBe(7);
  });

  // C6: la ficha se guarda por partes. Cada parte lleva solo lo suyo: un cambio de nombre no puede traer un rol o permisos
  // viejos, ni un cambio de permisos un nombre viejo
  test("guardar los datos solo lleva el nombre", () => {
    const datos = esquemaDatosUsuario.parse({ id: "7", nombre: "Ana", rol: "dueno", permisos: ["agenda"] });
    expect(datos).toEqual({ id: 7, nombre: "Ana" });
    expect(esquemaDatosUsuario.safeParse({ id: "7", nombre: "A" }).success).toBe(false);
  });

  test("guardar los permisos no lleva el nombre ni el rol y rechaza un permiso inventado", () => {
    expect(esquemaPermisosUsuario.parse({ id: "7", nombre: "Viejo", rol: "dueno", permisos: ["agenda"] })).toEqual({ id: 7, permisos: ["agenda"] });
    expect(esquemaPermisosUsuario.safeParse({ id: "7", permisos: ["consultas"] }).success).toBe(false);
    expect(esquemaPermisosUsuario.safeParse({ id: "0", permisos: [] }).success).toBe(false);
  });

  test("cambiar mi contraseña pide la actual y una nueva de al menos 8", () => {
    expect(esquemaMiContrasena.safeParse({ actual: "", nueva: "nueva-1234" }).success).toBe(false);
    expect(esquemaMiContrasena.safeParse({ actual: "vieja", nueva: "1234" }).success).toBe(false);
    expect(esquemaMiContrasena.safeParse({ actual: "vieja", nueva: "nueva-1234" }).success).toBe(true);
  });
});
