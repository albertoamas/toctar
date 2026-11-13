import { expect, test, type Locator, type Page, type TestInfo } from "@playwright/test";
import { consultar, crearClienteEnBase, crearOrdenLista, crearUsuario, ingresarComoDueno } from "./apoyo";

// Los modales del panel (ModalFormulario), de la revisión del 13/11: en el celular, una hoja que sube desde abajo; el
// título deja lugar a la X. Con el teclado del iPhone, ver iphone.spec.ts.

const sufijo = (info: TestInfo) => (info.project.name === "celular" ? "c" : "e");

/** Abre "¿Desactivar a …?" de un encargado con un nombre largo, desde el menú "Más" de su ficha. */
async function abrirDesactivar(page: Page, info: TestInfo): Promise<Locator> {
  const usuario = `modal-largo-${sufijo(info)}`;
  const nombre = `Encargado con un nombre bien largo para la prueba ${sufijo(info)}`;
  await crearUsuario({ usuario, nombre, contrasena: "modal-largo-123", rol: "encargado", permisos: ["agenda"] });
  const [{ id }] = await consultar<{ id: number }>("select id from usuario where nombre_usuario = $1", [usuario]);
  await ingresarComoDueno(page);
  await page.goto(`/panel/usuarios/${id}`);
  await page.getByRole("main").getByRole("button", { name: /^Más/ }).first().click();
  await page.getByRole("menuitem", { name: "Desactivar usuario" }).click();
  const dialogo = page.getByRole("dialog", { name: `¿Desactivar a ${nombre}?` });
  await expect(dialogo).toBeVisible();
  return dialogo;
}

test("la X no tapa un título largo, y en el celular la hoja sube desde abajo", async ({ page, isMobile }, info) => {
  const dialogo = await abrirDesactivar(page, info);

  // Cómo entra: en el celular, deslizándose desde abajo (empieza debajo de la pantalla) y sin agrandarse
  const entrada = await dialogo.evaluate((d) => getComputedStyle(d).getPropertyValue("--tw-enter-translate-y").trim());
  if (isMobile) expect(entrada).toBe("100%");
  else expect(entrada).not.toBe("100%");

  // Ya en su lugar: en el celular, pegada abajo y de borde a borde
  const pantalla = page.viewportSize()!;
  if (isMobile) {
    await expect
      .poll(async () => {
        const caja = (await dialogo.boundingBox())!;
        return Math.round(caja.y + caja.height);
      })
      .toBe(pantalla.height);
    expect((await dialogo.boundingBox())!.width).toBeGreaterThan(pantalla.width - 2);
  }

  // El texto del título (no su caja) termina antes de la X
  const { finTitulo, inicioX } = await dialogo.evaluate((d) => {
    const rango = document.createRange();
    rango.selectNodeContents(d.querySelector("[data-slot=dialog-title]")!);
    return { finTitulo: rango.getBoundingClientRect().right, inicioX: d.querySelector("[data-slot=dialog-close]")!.getBoundingClientRect().left };
  });
  expect(finTitulo).toBeLessThanOrEqual(inicioX);

  // Con "reducir movimiento", solo aparece: no se desliza
  if (isMobile) {
    await page.keyboard.press("Escape");
    await expect(dialogo).toHaveCount(0);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.getByRole("main").getByRole("button", { name: /^Más/ }).first().click();
    await page.getByRole("menuitem", { name: "Desactivar usuario" }).click();
    await expect(dialogo).toBeVisible();
    expect(await dialogo.evaluate((d) => getComputedStyle(d).getPropertyValue("--tw-enter-translate-y").trim())).not.toBe("100%");
  }
});

// Revisión del 13/11: en el celular, "Registrar pago" se abre sin el foco en el monto (que ya viene con el saldo): en
// Android eso abría solo el teclado y el primer toque en "Efectivo" se perdía. Donde lo primero es escribir, el foco sigue
// en el campo.
test("en el celular, Registrar pago se abre sin el teclado; Nuevo servicio, en su campo", async ({ page, isMobile }, info) => {
  test.skip(!isMobile, "Solo con pantalla táctil");
  const placa = `MDP${sufijo(info).toUpperCase()}1`;
  await crearClienteEnBase({ nombre: `Cobro sin teclado ${sufijo(info)}`, telefono: "59171880010", placa });
  const id = await crearOrdenLista({ placa, espacio: 1, dias: 681, precio: 500, pagado: 0 });
  await ingresarComoDueno(page);
  await page.goto(`/panel/ordenes/${id}`);
  await page.getByRole("main").getByRole("button", { name: "Registrar pago" }).click();
  const pago = page.getByRole("dialog", { name: "Registrar pago" });
  await expect(pago).toBeVisible();
  await expect(pago).toBeFocused();
  await expect(pago.getByLabel("Monto")).not.toBeFocused();
  await pago.getByRole("button", { name: "Cancelar" }).click();

  await page.goto("/panel/catalogo");
  await page.getByRole("main").getByRole("button", { name: "Agregar servicio" }).click();
  await expect(page.getByRole("dialog", { name: "Nuevo servicio" }).getByLabel("Nombre del servicio")).toBeFocused();
});
