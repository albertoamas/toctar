import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { crearClienteEnBase, ingresarComoDueno } from "./apoyo";

// Hallazgo 4 de la prueba en celulares (15/11): lo que guarda otra persona aparece al volver a la app después de un rato,
// sin recargar. La app se oculta y se muestra como cuando se cambia de app en el celular; el reloj se adelanta.
test.describe.configure({ mode: "serial" });

const telefono = (info: TestInfo, n: number) => `5917${info.project.name === "celular" ? 7 : 8}55${info.retry}0${n}0`;

async function irseYVolver(page: Page, fuera: string) {
  const cambiar = (estado: "hidden" | "visible") =>
    page.evaluate((e) => {
      Object.defineProperty(document, "visibilityState", { value: e, configurable: true });
      document.dispatchEvent(new Event("visibilitychange"));
    }, estado);
  await cambiar("hidden");
  await page.clock.fastForward(fuera);
  await cambiar("visible");
}

test("al volver después de un rato, la lista muestra lo que guardó otra persona", async ({ page }, info) => {
  await page.clock.install();
  const nombre = `Llegó mientras tanto ${info.project.name}${info.retry}`;
  await ingresarComoDueno(page);
  await page.goto(`/panel/clientes?q=${encodeURIComponent(nombre)}`, { waitUntil: "networkidle" });
  await expect(page.getByRole("link", { name: new RegExp(nombre) })).toHaveCount(0);

  // Otra persona lo registra; un vistazo corto a otra app no pone la pantalla al día
  await crearClienteEnBase({ nombre, telefono: telefono(info, 1), placa: `AV${info.project.name === "celular" ? "C" : "E"}${info.retry}1` });
  await irseYVolver(page, "00:10");
  await page.waitForTimeout(1500);
  await expect(page.getByRole("link", { name: new RegExp(nombre) })).toHaveCount(0);

  // Después de dos minutos fuera, sí
  await irseYVolver(page, "02:00");
  await expect(page.getByRole("link", { name: new RegExp(nombre) }).filter({ visible: true }).first()).toBeVisible();
});

test("con un modal abierto, volver no toca la pantalla", async ({ page }, info) => {
  await page.clock.install();
  const nombre = `Con modal abierto ${info.project.name}${info.retry}`;
  await ingresarComoDueno(page);
  await page.goto(`/panel/clientes?q=${encodeURIComponent(nombre)}`, { waitUntil: "networkidle" });
  await crearClienteEnBase({ nombre, telefono: telefono(info, 2), placa: `AV${info.project.name === "celular" ? "C" : "E"}${info.retry}2` });
  // Un menú o un modal abierto (aquí, el diálogo de prueba): lo que se está haciendo no se toca
  await page.evaluate(() => {
    const d = document.createElement("div");
    d.setAttribute("role", "dialog");
    d.id = "dialogo-de-prueba";
    document.body.append(d);
  });
  await irseYVolver(page, "02:00");
  await page.waitForTimeout(1500);
  await expect(page.getByRole("link", { name: new RegExp(nombre) })).toHaveCount(0);
  // Cerrado lo que estaba abierto, la próxima vuelta sí la pone al día
  await page.evaluate(() => document.getElementById("dialogo-de-prueba")?.remove());
  await irseYVolver(page, "00:05");
  await expect(page.getByRole("link", { name: new RegExp(nombre) }).filter({ visible: true }).first()).toBeVisible();
});

test("sin conexión al volver, espera a que vuelva para ponerse al día", async ({ page, context }, info) => {
  await page.clock.install();
  const nombre = `Sin conexión ${info.project.name}${info.retry}`;
  await ingresarComoDueno(page);
  await page.goto(`/panel/clientes?q=${encodeURIComponent(nombre)}`, { waitUntil: "networkidle" });
  await crearClienteEnBase({ nombre, telefono: telefono(info, 3), placa: `AV${info.project.name === "celular" ? "C" : "E"}${info.retry}3` });
  await context.setOffline(true);
  await irseYVolver(page, "02:00");
  await page.waitForTimeout(1500);
  // Sigue en la misma pantalla (no en la página de error del navegador) y sin lo nuevo
  await expect(page).toHaveURL(/\/panel\/clientes\?q=/);
  await expect(page.getByRole("link", { name: new RegExp(nombre) })).toHaveCount(0);
  await context.setOffline(false);
  await expect(page.getByRole("link", { name: new RegExp(nombre) }).filter({ visible: true }).first()).toBeVisible();
});
