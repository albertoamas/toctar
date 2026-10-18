import { expect, test, type TestInfo } from "@playwright/test";
import { ingresarComoDueno } from "./apoyo";

// HU-11 Página de cada servicio y HU-15 (mensaje con el servicio). Criterios: docs/09-pruebas/criterios-entrega-1.md (11.x).

const soloEscritorio = (info: TestInfo) => test.skip(info.project.name !== "escritorio", "Cambia servicios compartidos");

test("la página de un servicio muestra el proceso y abre WhatsApp con ese servicio escrito", async ({ page }) => {
  await page.goto("/servicios");
  await page.getByRole("link", { name: "Ver el servicio: Mantenimiento del nano cerámico" }).click();
  await expect(page).toHaveURL(/\/servicios\/mantenimiento-del-nano-ceramico$/);
  await expect(page).toHaveTitle("Mantenimiento del nano cerámico · TocTar Detailing");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Mantenimiento del nano cerámico");

  // Los 6 pasos que mandó el dueño, en orden
  const proceso = page.getByRole("region", { name: "Cómo lo hacemos" });
  await expect(proceso.getByRole("listitem")).toHaveCount(6);
  await expect(proceso.getByRole("listitem").first()).toContainText("Lavado técnico de carrocería");
  // Sin opciones: la variante "Única" no se muestra
  await expect(page.getByRole("region", { name: "Opciones" })).toHaveCount(0);

  const mensaje = "?text=Hola%2C%20quiero%20consultar%20por%20Mantenimiento%20del%20nano%20cer%C3%A1mico.";
  await expect(page.getByRole("link", { name: "Consultar por este servicio" }).first()).toHaveAttribute("href", `https://wa.me/59171234567${mensaje}`);
  // Por su enlace: al navegar dentro del sitio, Next.js guarda oculta la página anterior con su propio botón fijo.
  await expect(page.locator(`.tt-whatsapp--fijo[href="https://wa.me/59171234567${mensaje}"]`)).toHaveCount(1);
  await expect(page.locator("main")).not.toContainText(/\bBs\b/);
});

test("las variantes se muestran sin precio", async ({ page }) => {
  await page.goto("/servicios/pulido-y-nano-ceramico");
  const opciones = page.getByRole("region", { name: "Opciones" });
  await expect(opciones.getByRole("listitem")).toHaveText([/1 año/, /2 años/, /3 años/, /5 años/, /10 años/]);
  await expect(page.locator("main")).not.toContainText(/\bBs\b/);
});

test("un servicio oculto o inexistente muestra la página no encontrada", async ({ page }, info) => {
  await page.goto("/servicios/no-existe");
  await expect(page.getByRole("heading", { name: "No encontramos esta página" })).toBeVisible();

  soloEscritorio(info);
  await ingresarComoDueno(page);
  await page.goto("/panel/sitio/servicios/nuevo");
  await page.getByLabel("Nombre del servicio").fill("Servicio oculto con página");
  await page.getByLabel("Resumen").fill("No se debe ver en el sitio.");
  await page.getByRole("button", { name: "Crear servicio" }).click();
  await expect(page.getByText("Servicio creado.")).toBeVisible();
  await page.goto("/servicios/servicio-oculto-con-pagina");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Servicio oculto con página");

  await page.goBack();
  await page.getByRole("checkbox", { name: /Mostrar en el sitio/ }).uncheck();
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByText("Cambios guardados.")).toBeVisible();
  await page.goto("/servicios/servicio-oculto-con-pagina");
  await expect(page.getByRole("heading", { name: "No encontramos esta página" })).toBeVisible();
});

test("la lista de servicios termina con una invitación a mandar fotos, con un solo WhatsApp a la vista", async ({ page }) => {
  await page.goto("/servicios");
  await page.getByRole("heading", { name: "¿No sabes cuál elegir?" }).scrollIntoViewIfNeeded();
  await expect(page.getByRole("link", { name: "Mandar fotos de mi vehículo por WhatsApp" })).toBeInViewport();
  await expect(page.getByRole("link", { name: "Escribir a TocTar por WhatsApp" })).toBeHidden();
});

test("con el teclado se enmarca toda la tarjeta del servicio", async ({ page, isMobile }) => {
  test.skip(isMobile, "El teclado se prueba en la computadora");
  await page.goto("/servicios");
  const enlace = page.locator(".tt-tarjeta__enlace").first();
  await enlace.focus();
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Tab");
  await expect(enlace).toBeFocused();
  await expect(page.locator(".tt-tarjeta").first()).toHaveCSS("outline-style", "solid");
});
