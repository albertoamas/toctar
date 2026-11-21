import { expect, test } from "@playwright/test";
import { crearServicioPublicado, ingresarComoDueno } from "./apoyo";

// Pedido 56: el probador de colores en la página de un servicio. Especificación:
// docs/08-desarrollo/etapas/P56-probador-de-colores.md §9.

test("el dueño carga los colores y la página del servicio los muestra en el probador; sin colores no aparece", async ({ page }, info) => {
  const nombre = `Repintado de aros ${info.project.name} ${Date.now()}`;
  await ingresarComoDueno(page);
  const { slug } = await crearServicioPublicado(page, nombre, "Devolvemos el color a tus aros.");

  // Sin colores, la ficha lo dice y el sitio no muestra el probador
  await expect(page.getByRole("region", { name: "Probador de colores" })).toContainText("Sin colores: el probador no sale en el sitio.");
  await page.goto(`/servicios/${slug}`);
  await expect(page.getByRole("heading", { level: 1, name: nombre })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Elige el color" })).toHaveCount(0);
  await page.goBack();

  // Dos colores: negro mate y bronce satinado
  await page.getByRole("button", { name: "Editar colores" }).click();
  const modal = page.getByRole("dialog", { name: "Probador de colores" });
  await modal.getByRole("button", { name: "Agregar color" }).click();
  await modal.getByLabel("Color 1, nombre").fill("Negro");
  await modal.getByRole("button", { name: "Agregar color" }).click();
  await modal.getByLabel("Color 2, tono").fill("#7a5530");
  await modal.getByLabel("Color 2, nombre").fill("Bronce");
  await modal.getByLabel("Color 2, acabado").selectOption("satinado");
  await expect(modal.getByLabel("Color 2, nombre")).toHaveValue("Bronce");
  await modal.getByRole("button", { name: "Guardar colores" }).click();
  await expect(modal).toHaveCount(0);
  const seccion = page.getByRole("region", { name: "Probador de colores" });
  await expect(seccion).toContainText("Negro");
  await expect(seccion).toContainText("Bronce");
  await expect(seccion).toContainText("Satinado");

  // En el sitio (se renueva en segundo plano): arranca con el primero; elegir otro lo marca y lo pide por WhatsApp
  await expect(async () => {
    await page.goto(`/servicios/${slug}`);
    await expect(page.getByRole("heading", { name: "Elige el color" })).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: 20_000 });
  const probador = page.getByRole("region", { name: "Elige el color" });
  await expect(probador.getByRole("button", { name: /^Negro/ })).toHaveAttribute("aria-pressed", "true");
  await probador.getByRole("button", { name: /^Bronce/ }).click();
  await expect(probador.getByRole("button", { name: /^Bronce/ })).toHaveAttribute("aria-pressed", "true");
  await expect(probador.getByRole("button", { name: /^Negro/ })).toHaveAttribute("aria-pressed", "false");
  const pedir = probador.getByRole("link", { name: "Quiero este color por WhatsApp" });
  await expect(pedir).toBeVisible();
  const href = (await pedir.getAttribute("href"))!;
  // Con el WhatsApp del negocio cargado, el mensaje lleva el color; sin él, lleva a Contacto
  if (href.startsWith("https://wa.me/")) expect(decodeURIComponent(href)).toContain(`${nombre} en bronce satinado.`);
  else expect(href).toBe("/contacto");
});
