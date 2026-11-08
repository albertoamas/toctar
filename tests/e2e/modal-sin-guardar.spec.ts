import { expect, test, type Page } from "@playwright/test";
import { abrirParteNegocio, ingresarComoDueno } from "./apoyo";

// C6 (sistema-del-panel.md §4): ningún modal pierde lo escrito sin preguntar. Se prueba en el modal común, con el de
// Contacto de Negocio; ninguna de estas pruebas guarda, así que no choca con las demás.

const entrar = async (page: Page) => {
  await ingresarComoDueno(page);
  await page.goto("/panel/configuracion/negocio", { waitUntil: "networkidle" });
};

test("sin cambios, Cancelar y Escape cierran el modal sin preguntar", async ({ page }) => {
  await entrar(page);
  const contacto = await abrirParteNegocio(page, "Contacto");
  await contacto.getByRole("button", { name: "Cancelar" }).click();
  await expect(contacto).toHaveCount(0);
  await expect(page.getByRole("dialog", { name: "¿Salir sin guardar?" })).toHaveCount(0);

  const otraVez = await abrirParteNegocio(page, "Contacto");
  await page.keyboard.press("Escape");
  await expect(otraVez).toHaveCount(0);
  await expect(page.getByRole("dialog", { name: "¿Salir sin guardar?" })).toHaveCount(0);
});

test("con cambios pregunta: seguir editando conserva lo escrito y salir lo descarta", async ({ page }) => {
  await entrar(page);
  const contacto = await abrirParteNegocio(page, "Contacto");
  const nombre = contacto.getByLabel("Nombre del negocio");
  const original = await nombre.inputValue();
  await nombre.fill(`${original} cambiado`);

  await contacto.getByRole("button", { name: "Cancelar" }).click();
  const pregunta = page.getByRole("dialog", { name: "¿Salir sin guardar?" });
  await expect(pregunta).toBeVisible();
  // Con el foco en la opción que no pierde nada
  await expect(pregunta.getByRole("button", { name: "Seguir editando" })).toBeFocused();
  await pregunta.getByRole("button", { name: "Seguir editando" }).click();
  await expect(pregunta).toHaveCount(0);
  await expect(nombre).toHaveValue(`${original} cambiado`);

  // Escape también pregunta, y salir descarta lo escrito
  await nombre.focus();
  await page.keyboard.press("Escape");
  await pregunta.getByRole("button", { name: "Salir sin guardar" }).click();
  await expect(pregunta).toHaveCount(0);
  await expect(contacto).toHaveCount(0);
  const otraVez = await abrirParteNegocio(page, "Contacto");
  await expect(otraVez.getByLabel("Nombre del negocio")).toHaveValue(original);
});

test("volver a dejar el texto como estaba no cuenta como un cambio", async ({ page }) => {
  await entrar(page);
  const contacto = await abrirParteNegocio(page, "Contacto");
  const nombre = contacto.getByLabel("Nombre del negocio");
  const original = await nombre.inputValue();
  await nombre.fill(`${original} cambiado`);
  await nombre.fill(original);
  await contacto.getByRole("button", { name: "Cancelar" }).click();
  await expect(contacto).toHaveCount(0);
  await expect(page.getByRole("dialog", { name: "¿Salir sin guardar?" })).toHaveCount(0);
});
