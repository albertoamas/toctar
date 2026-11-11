import { expect, test, type Page } from "@playwright/test";
import { abrirParteNegocio, ingresarComoDueno } from "./apoyo";

// C6 (sistema-del-panel.md §4) y pulido 13.48: ningún modal pierde lo escrito por un cierre sin querer. Con cambios, tocar
// afuera o Escape no cierran: el pie del mismo modal pregunta (nunca otro modal encima). "Cancelar" y la X cierran sin
// preguntar: son una decisión. Se prueba con el modal de Contacto de Negocio; ninguna prueba guarda.

const entrar = async (page: Page) => {
  await ingresarComoDueno(page);
  await page.goto("/panel/configuracion/negocio", { waitUntil: "networkidle" });
};
/** La pregunta en el pie del modal. */
const preguntaEn = (page: Page) => page.locator("[data-pregunta-salir]");

test("sin cambios, Cancelar y Escape cierran el modal sin preguntar", async ({ page }) => {
  await entrar(page);
  const contacto = await abrirParteNegocio(page, "Contacto");
  await contacto.getByRole("button", { name: "Cancelar" }).click();
  await expect(contacto).toHaveCount(0);

  const otraVez = await abrirParteNegocio(page, "Contacto");
  await page.keyboard.press("Escape");
  await expect(otraVez).toHaveCount(0);
  await expect(preguntaEn(page)).toHaveCount(0);
});

test("con cambios, Escape pregunta en el mismo modal: seguir editando conserva lo escrito y descartar lo pierde", async ({ page }) => {
  await entrar(page);
  const contacto = await abrirParteNegocio(page, "Contacto");
  const nombre = contacto.getByLabel("Nombre del negocio");
  const original = await nombre.inputValue();
  await nombre.fill(`${original} cambiado`);

  await page.keyboard.press("Escape");
  // La pregunta va en el pie del mismo modal: un solo diálogo a la vista
  await expect(preguntaEn(page)).toContainText("Tienes cambios sin guardar.");
  await expect(page.getByRole("dialog")).toHaveCount(1);
  await expect(contacto.getByRole("button", { name: "Seguir editando" })).toBeFocused();
  await contacto.getByRole("button", { name: "Seguir editando" }).click();
  await expect(preguntaEn(page)).toHaveCount(0);
  await expect(contacto.getByRole("button", { name: "Guardar contacto" })).toBeVisible();
  await expect(nombre).toHaveValue(`${original} cambiado`);
  // El foco vuelve al campo que se estaba editando
  await expect(nombre).toBeFocused();

  // Otro Escape con la pregunta abierta es seguir editando, no salir
  await nombre.focus();
  await page.keyboard.press("Escape");
  await expect(preguntaEn(page)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(preguntaEn(page)).toHaveCount(0);
  await expect(contacto).toBeVisible();

  // Con la pregunta a la vista y el cambio deshecho, Escape cierra: ya no hay nada que perder
  await page.keyboard.press("Escape");
  await expect(preguntaEn(page)).toBeVisible();
  await nombre.fill(original);
  await page.keyboard.press("Escape");
  await expect(contacto).toHaveCount(0);
  const deNuevo = await abrirParteNegocio(page, "Contacto");
  await deNuevo.getByLabel("Nombre del negocio").fill(`${original} cambiado`);

  // Descartar lo pierde
  await page.keyboard.press("Escape");
  await deNuevo.getByRole("button", { name: "Descartar cambios" }).click();
  await expect(deNuevo).toHaveCount(0);
  const otraVez = await abrirParteNegocio(page, "Contacto");
  await expect(otraVez.getByLabel("Nombre del negocio")).toHaveValue(original);
});

test("con cambios, Cancelar y la X cierran sin preguntar: son una decisión", async ({ page }) => {
  await entrar(page);
  for (const cerrarCon of ["Cancelar", "Cerrar"]) {
    const contacto = await abrirParteNegocio(page, "Contacto");
    const nombre = contacto.getByLabel("Nombre del negocio");
    const original = await nombre.inputValue();
    await nombre.fill(`${original} cambiado`);
    await contacto.getByRole("button", { name: cerrarCon, exact: true }).click();
    await expect(contacto).toHaveCount(0);
    await expect(preguntaEn(page)).toHaveCount(0);
    const otraVez = await abrirParteNegocio(page, "Contacto");
    await expect(otraVez.getByLabel("Nombre del negocio")).toHaveValue(original);
    await otraVez.getByRole("button", { name: "Cancelar" }).click();
    await expect(otraVez).toHaveCount(0);
  }
});

test("volver a dejar el texto como estaba no cuenta como un cambio", async ({ page }) => {
  await entrar(page);
  const contacto = await abrirParteNegocio(page, "Contacto");
  const nombre = contacto.getByLabel("Nombre del negocio");
  const original = await nombre.inputValue();
  await nombre.fill(`${original} cambiado`);
  await nombre.fill(original);
  await page.keyboard.press("Escape");
  await expect(contacto).toHaveCount(0);
  await expect(preguntaEn(page)).toHaveCount(0);
});
