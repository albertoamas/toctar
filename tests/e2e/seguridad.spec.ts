import { expect, test, type TestInfo } from "@playwright/test";
import { alertaDeIngreso, crearUsuario, ingresar } from "./apoyo";

// Revisión de seguridad de la Entrega 1 (16/10/2026). Criterios: docs/09-pruebas/criterios-entrega-1.md.

const sufijo = (info: TestInfo) => (info.project.name === "celular" ? "c" : "e");

test("tras 5 contraseñas incorrectas se bloquea el ingreso, aunque la sexta sea la correcta", async ({ page }, info) => {
  const usuario = `bloqueo-${sufijo(info)}`;
  await crearUsuario({ usuario, nombre: "Prueba de bloqueo", contrasena: "correcta-123", rol: "encargado" });
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

// Proxy de Cloudflare (14/11, guía de despliegue, paso 3b): detrás de él, todos llegan desde IPs de Cloudflare. El límite
// usa la IP del visitante (CF-Connecting-IP) solo si el pedido trae el secreto de origen: así dos visitantes no se
// bloquean entre sí, y quien llega desde una IP de Cloudflare sin pasar por el proxy (WARP) no se inventa otra conexión.
test("detrás de Cloudflare, el límite es por visitante y sin el secreto no se puede cambiar de conexión", async ({ page }, info) => {
  const usuario = `cloudflare-${sufijo(info)}`;
  await crearUsuario({ usuario, nombre: "Prueba de Cloudflare", contrasena: "correcta-123", rol: "encargado" });
  const n = sufijo(info) === "c" ? 1 : 2;
  const deCloudflare = { "x-real-ip": `172.70.20.${n}`, "x-origen-cloudflare": "secreto-e2e-de-cloudflare" };

  // Un visitante que pasa por el proxy se equivoca 5 veces: ese visitante queda bloqueado
  await page.setExtraHTTPHeaders({ ...deCloudflare, "cf-connecting-ip": `200.87.20.${n}` });
  for (let i = 1; i <= 5; i++) {
    await ingresar(page, usuario, `incorrecta-${i}`);
    await expect(alertaDeIngreso(page)).toHaveText("Usuario o contraseña incorrectos.");
  }
  await ingresar(page, usuario, "correcta-123");
  await expect(alertaDeIngreso(page)).toContainText("Demasiados intentos");

  // Otro visitante, por el mismo servidor de Cloudflare: no comparte el bloqueo y entra
  await page.setExtraHTTPHeaders({ ...deCloudflare, "cf-connecting-ip": `200.87.21.${n}` });
  await ingresar(page, usuario, "correcta-123");
  await expect(page).toHaveURL(/\/panel$/);
});

test("desde una IP de Cloudflare sin el secreto (WARP), cambiar CF-Connecting-IP no da otra conexión", async ({ page }, info) => {
  const usuario = `warp-${sufijo(info)}`;
  await crearUsuario({ usuario, nombre: "Prueba de WARP", contrasena: "correcta-123", rol: "encargado" });
  const n = sufijo(info) === "c" ? 1 : 2;
  // Cada intento con otro CF-Connecting-IP, todos desde la misma IP de Cloudflare y sin el secreto
  for (let i = 1; i <= 5; i++) {
    await page.setExtraHTTPHeaders({ "x-real-ip": `104.28.30.${n}`, "cf-connecting-ip": `9.9.${i}.${n}` });
    await ingresar(page, usuario, `incorrecta-${i}`);
    await expect(alertaDeIngreso(page)).toHaveText("Usuario o contraseña incorrectos.");
  }
  // Sigue siendo una sola conexión: bloqueada, aunque cambie el encabezado otra vez
  await page.setExtraHTTPHeaders({ "x-real-ip": `104.28.30.${n}`, "cf-connecting-ip": `9.9.99.${n}` });
  await ingresar(page, usuario, "correcta-123");
  await expect(alertaDeIngreso(page)).toContainText("Demasiados intentos");
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
