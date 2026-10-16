import { expect, test, type TestInfo } from "@playwright/test";
import { alertaDeIngreso, crearUsuario, ingresar } from "./apoyo";

// Revisión de seguridad de la Entrega 1 (16/10/2026). Criterios: docs/09-pruebas/criterios-entrega-1.md.

const sufijo = (info: TestInfo) => (info.project.name === "celular" ? "c" : "e");

test("tras 5 contraseñas incorrectas se bloquea el ingreso, aunque la sexta sea la correcta", async ({ page }, info) => {
  const usuario = `bloqueo-${sufijo(info)}`;
  await crearUsuario({ usuario, nombre: "Prueba de bloqueo", contrasena: "correcta-123", rol: "tecnico" });
  // Una conexión propia: el límite por conexión no se mezcla con las demás pruebas.
  await page.setExtraHTTPHeaders({ "x-real-ip": `10.16.0.${sufijo(info) === "c" ? 1 : 2}` });

  for (let i = 1; i <= 5; i++) {
    await ingresar(page, usuario, `incorrecta-${i}`);
    await expect(alertaDeIngreso(page)).toHaveText("Usuario o contraseña incorrectos.");
  }
  await ingresar(page, usuario, "correcta-123");
  await expect(alertaDeIngreso(page)).toContainText("Demasiados intentos");
  await expect(page).toHaveURL(/\/ingresar$/);

  // Desde otra conexión, el mismo usuario entra: un atacante no deja afuera a nadie con 5 intentos.
  await page.setExtraHTTPHeaders({ "x-real-ip": `10.16.1.${sufijo(info) === "c" ? 1 : 2}` });
  await ingresar(page, usuario, "correcta-123");
  await expect(page).toHaveURL(/\/panel$/);
});

test("la API de Better Auth no está expuesta: no se averiguan usuarios ni se cambian datos", async ({ request }) => {
  const usuarioExiste = await request.post("/api/auth/is-username-available", { data: { username: "dueno" } });
  expect(usuarioExiste.status()).toBe(404);
  const cambiarDatos = await request.post("/api/auth/update-user", { data: { name: "Otro", username: "otro" } });
  expect(cambiarDatos.status()).toBe(404);
  const ingresoDirecto = await request.post("/api/auth/sign-in/username", { data: { username: "dueno", password: "x" } });
  expect(ingresoDirecto.status()).toBe(404);
});

test("las páginas llevan los encabezados de seguridad", async ({ request }) => {
  for (const ruta of ["/", "/ingresar", "/garantia"]) {
    const h = (await request.get(ruta)).headers();
    expect(h["x-frame-options"], ruta).toBe("DENY");
    expect(h["content-security-policy"], ruta).toContain("frame-ancestors 'none'");
    expect(h["x-content-type-options"], ruta).toBe("nosniff");
    expect(h["referrer-policy"], ruta).toBe("strict-origin-when-cross-origin");
    expect(h["strict-transport-security"], ruta).toContain("max-age=");
    expect(h["x-powered-by"], ruta).toBeUndefined();
  }
});
