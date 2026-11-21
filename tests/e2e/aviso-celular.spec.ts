import { expect, test, type Locator } from "@playwright/test";
import { consultar, crearClienteEnBase, crearUsuario, ingresarComoDueno } from "./apoyo";

// Los avisos en el celular (19/11, prueba en un iPhone 14): arriba, sobre la barra negra, como una notificación del
// iPhone, y se cierran con la X o deslizándolos (sonner.tsx). No tapan el botón de volver de la página (lo vio hu-07 el
// 09/11, cuando iban arriba sin dejar lugar), ni el pie fijo, ni el de un modal.

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
  // Arriba, sobre la barra negra
  const caja = (await aviso.boundingBox())!;
  expect(caja.y).toBeLessThan(page.viewportSize()!.height / 4);
  // Se cierra con su X
  await aviso.getByRole("button", { name: "Cerrar el aviso" }).click();
  await expect(page.locator("[data-sonner-toast]")).toHaveCount(0);
  // Volver funciona al primer toque
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
  await page.getByRole("button", { name: "Editar permisos" }).click();
  const rol = page.getByRole("dialog", { name: "Permisos" });
  await expect(rol).toBeVisible();
  await expect(aviso).toBeVisible();
  await expect.poll(async () => (await aviso.boundingBox())!.y).toBeLessThan(page.viewportSize()!.height / 3);
  for (const boton of [rol.getByRole("button", { name: "Guardar permisos" }), rol.getByRole("button", { name: "Cancelar" })]) {
    expect(await sePisan(aviso, boton)).toBe(false);
  }
  await rol.getByRole("button", { name: "Cancelar" }).click();
  await expect(rol).toHaveCount(0);
});

test("al final de Recibir, el pie sigue fijo abajo y el aviso va encima de él", async ({ page }, info) => {
  // 10/11 (lo vio hu-33-checklist en el CI): al bajar hasta el final, el pie queda al cierre de la tarjeta, más arriba que
  // el borde, y el aviso (a una altura fija) tapaba "Recibir vehículo" mientras duraba. Ahora el pie dice dónde está
  // (pie-formulario.tsx). Una reserva de hoy, directo en la base (como en hu-33-checklist)
  const placa = `AV33${info.retry}`;
  await crearClienteEnBase({ nombre: `Aviso recibir ${info.retry}`, telefono: `5917533990${info.retry}`, placa });
  const hoy = new Intl.DateTimeFormat("en-CA", { timeZone: "America/La_Paz" }).format(new Date());
  const [{ id }] = await consultar<{ id: number }>(
    `insert into trabajo (sucursal_id, cliente_id, vehiculo_id, fecha_inicio, fecha_fin, created_by)
     select e.sucursal_id, v.cliente_id, v.id, $2::date, $2::date, v.created_by from vehiculo v, (select id as sucursal_id from sucursal order by id limit 1) e where v.placa = $1 returning id`,
    [placa, hoy],
  );
  await ingresarComoDueno(page);
  await page.goto(`/panel/ordenes/${id}/recibir`, { waitUntil: "networkidle" });
  const recibir = page.getByRole("button", { name: "Recibir vehículo" });
  await expect(recibir).toBeEnabled();
  // Con la página ya hidratada: "Detalle" se habilita con JavaScript
  await expect(page.getByRole("button", { name: "Detalle: Capó" })).toBeEnabled();
  // Un detalle guardado: su aviso sale abajo, sobre la página
  await page.getByRole("button", { name: "Detalle: Techo" }).click();
  const techo = page.getByRole("dialog", { name: "Detalle: Techo" });
  await techo.getByRole("radio", { name: "Otro" }).check();
  await techo.getByLabel("Qué es").fill("Falta la antena");
  await techo.getByRole("button", { name: "Guardar detalle" }).click();
  await expect(techo).toBeHidden();
  const aviso = page.locator("[data-sonner-toast]").filter({ hasText: "Detalle guardado." });
  await expect(aviso).toBeVisible();
  // Al final de la pantalla, el pie sigue fijo al borde de abajo (19/11, prueba en un iPhone 14: antes se detenía al
  // cierre de la tarjeta, más arriba que el borde)
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  const pie = page.locator("[data-pie-movil]");
  await expect
    .poll(async () => {
      const caja = (await pie.boundingBox())!;
      return Math.abs(page.viewportSize()!.height - (caja.y + caja.height));
    })
    .toBeLessThan(2);
  // Con el aviso todavía a la vista: arriba, lejos del pie, y el botón se puede tocar
  await expect(aviso).toBeVisible();
  await expect.poll(async () => (await aviso.boundingBox())!.y).toBeLessThan(page.viewportSize()!.height / 4);
  expect(await sePisan(aviso, pie)).toBe(false);
  await recibir.click({ trial: true, timeout: 2000 });
});
