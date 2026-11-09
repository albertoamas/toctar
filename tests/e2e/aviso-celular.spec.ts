import { expect, test, type Locator } from "@playwright/test";
import { crearUsuario, ingresarComoDueno } from "./apoyo";

// Los avisos en el celular (09/11): arriba tapaban el botón de volver y, mientras duraba el aviso, no se podía tocar
// (lo vio hu-07 de vez en cuando). Ahora van abajo, encima del pie fijo si la pantalla lo tiene (sonner.tsx).

test.skip(({ isMobile }) => !isMobile, "En la computadora los avisos ya van abajo a la derecha (pulido 13.23)");

const sePisan = async (a: Locator, b: Locator) => {
  const [x, y] = [(await a.boundingBox())!, (await b.boundingBox())!];
  return x.x < y.x + y.width && y.x < x.x + x.width && x.y < y.y + y.height && y.y < x.y + x.height;
};

test("después de guardar, el aviso no tapa el botón de volver y se puede volver enseguida", async ({ page }, info) => {
  const usuario = `aviso-cel-${info.retry}-${Math.floor(Math.random() * 1e6)}`;
  await crearUsuario({ usuario, nombre: "Aviso del celular", contrasena: "encargado-123", rol: "encargado" });
  await ingresarComoDueno(page);
  await page.goto("/panel/usuarios");
  await page.getByRole("link", { name: "Aviso del celular" }).first().click();
  await page.getByRole("button", { name: "Editar datos del usuario" }).click();
  const datos = page.getByRole("dialog", { name: "Datos del usuario" });
  await datos.getByLabel("Nombre").fill("Aviso del celular cambiado");
  await datos.getByRole("button", { name: "Guardar datos" }).click();
  const aviso = page.locator("[data-sonner-toast]").first();
  await expect(aviso).toContainText("Datos guardados.");
  await expect(datos).toHaveCount(0);

  const volver = page.getByRole("link", { name: "Volver a Usuarios" });
  expect(await sePisan(aviso, volver)).toBe(false);
  // Abajo, no arriba: el encabezado queda libre
  const caja = (await aviso.boundingBox())!;
  expect(caja.y).toBeGreaterThan(page.viewportSize()!.height / 2);
  // Con el aviso todavía a la vista, volver funciona al primer toque
  await volver.click();
  await expect(page).toHaveURL(/\/panel\/usuarios$/);
});

test("con un modal abierto el aviso va arriba y no tapa sus botones", async ({ page }, info) => {
  const usuario = `aviso-modal-${info.retry}-${Math.floor(Math.random() * 1e6)}`;
  await crearUsuario({ usuario, nombre: "Aviso con modal", contrasena: "encargado-123", rol: "encargado" });
  await ingresarComoDueno(page);
  await page.goto("/panel/usuarios");
  await page.getByRole("link", { name: "Aviso con modal" }).first().click();
  await page.getByRole("button", { name: "Editar datos del usuario" }).click();
  const datos = page.getByRole("dialog", { name: "Datos del usuario" });
  await datos.getByLabel("Nombre").fill("Aviso con modal cambiado");
  await datos.getByRole("button", { name: "Guardar datos" }).click();
  const aviso = page.locator("[data-sonner-toast]").first();
  await expect(aviso).toContainText("Datos guardados.");
  // Enseguida, otro modal (sube desde abajo): el aviso pasa arriba y sus botones se tocan
  await page.getByRole("button", { name: "Editar rol y permisos" }).click();
  const rol = page.getByRole("dialog", { name: "Rol y permisos" });
  await expect(rol).toBeVisible();
  await expect(aviso).toBeVisible();
  await expect.poll(async () => (await aviso.boundingBox())!.y).toBeLessThan(page.viewportSize()!.height / 3);
  for (const boton of [rol.getByRole("button", { name: "Guardar rol y permisos" }), rol.getByRole("button", { name: "Cancelar" })]) {
    expect(await sePisan(aviso, boton)).toBe(false);
  }
  await rol.getByRole("button", { name: "Cancelar" }).click();
  await expect(rol).toHaveCount(0);
});
