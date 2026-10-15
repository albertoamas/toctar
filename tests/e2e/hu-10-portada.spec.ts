import { expect, test, type TestInfo } from "@playwright/test";
import { ingresarComoDueno } from "./apoyo";

// HU-10 Portada y HU-15 Botón de WhatsApp. Criterios: docs/09-pruebas/criterios-entrega-1.md (10.x y 15.x).
// El WhatsApp lo carga tests/e2e/preparar.setup.ts antes de todas las pruebas.

const soloEscritorio = (info: TestInfo) => test.skip(info.project.name !== "escritorio", "Cambia datos compartidos del sitio");

test("la portada muestra el lema, los servicios y el botón de WhatsApp", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  // Servicios de los datos iniciales, en tarjetas que llevan a su página
  const servicios = page.getByRole("region", { name: "Servicios" });
  await expect(servicios.getByRole("heading", { name: "Pulido y nano cerámico" })).toBeVisible();
  await expect(servicios.getByRole("link", { name: "Ver el servicio: Pulido y nano cerámico" })).toHaveAttribute("href", "/servicios/pulido-y-nano-ceramico");

  // El botón principal y el fijo abren WhatsApp con el número cargado en el panel
  await expect(page.getByRole("link", { name: "Escribir por WhatsApp" }).first()).toHaveAttribute("href", /^https:\/\/wa\.me\/59171234567\?text=Hola/);
  await expect(page.getByRole("link", { name: "Escribir a TocTar por WhatsApp" })).toHaveAttribute(
    "href",
    "https://wa.me/59171234567?text=Hola%2C%20quiero%20consultar%20por%20un%20servicio.",
  );
});

test("los servicios sin foto muestran la imagen de reemplazo y ninguna página pública muestra precios", async ({ page }) => {
  for (const ruta of ["/", "/servicios"]) {
    await page.goto(ruta);
    await expect(page.locator("main")).not.toContainText(/\bBs\b|precio:/i);
  }
  await expect(page.locator(".tt-reemplazo").first()).toBeVisible();
});

test("ocultar un servicio en el panel lo saca del sitio sin volver a desplegar", async ({ page }, info) => {
  soloEscritorio(info);
  const nombre = "Servicio para ocultar";
  await ingresarComoDueno(page);
  await page.goto("/panel/sitio/servicios/nuevo");
  await page.getByLabel("Nombre del servicio").fill(nombre);
  await page.getByLabel("Resumen").fill("Aparece y desaparece del sitio.");
  await page.getByRole("button", { name: "Crear servicio" }).click();
  await expect(page.getByText("Servicio creado.")).toBeVisible();
  const panel = page.url();

  await page.goto("/servicios");
  await expect(page.getByRole("heading", { name: nombre })).toBeVisible();

  await page.goto(panel);
  await page.getByRole("checkbox", { name: /Mostrar en el sitio/ }).uncheck();
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByText("Cambios guardados.")).toBeVisible();

  await page.goto("/servicios");
  await expect(page.getByRole("heading", { name: "Servicios", level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { name: nombre })).toHaveCount(0);
});

test("una dirección que no existe muestra la página no encontrada", async ({ page }) => {
  const respuesta = await page.goto("/esta-pagina-no-existe");
  expect(respuesta?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "No encontramos esta página" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Ver los servicios" })).toHaveAttribute("href", "/servicios");
});
