import { expect, test, type TestInfo } from "@playwright/test";
import { ingresarComoDueno } from "./apoyo";

// HU-09 Galería en el panel. Criterios: docs/09-pruebas/criterios-entrega-1.md (9.1 a 9.4).
// La galería es compartida: las pruebas que guardan corren solo en escritorio.

const soloEscritorio = (info: TestInfo) => test.skip(info.project.name !== "escritorio", "Cambia la galería compartida");

// PNG de 1 × 1 píxel
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", "base64");
const foto = (nombre: string) => ({ name: nombre, mimeType: "image/png", buffer: PNG });

test("sin servicio ni descripción no se sube", async ({ page }) => {
  await ingresarComoDueno(page);
  await page.goto("/panel/sitio");
  await page.getByRole("navigation", { name: "Secciones del sitio web" }).getByRole("link", { name: "Galería" }).click();
  await page.getByRole("button", { name: "Subir fotos" }).click();
  await page.getByRole("button", { name: "Guardar en la galería" }).click();
  await expect(page.getByText("Elige el servicio.")).toBeVisible();
  await expect(page.getByText("Escribe una descripción corta: también la leen los buscadores.")).toBeVisible();
});

test("sube un par antes y después y una foto sola; los ordena, oculta, edita y elimina", async ({ page }, info) => {
  soloEscritorio(info);
  await ingresarComoDueno(page);
  await page.goto("/panel/sitio/galeria");
  const galeria = page.getByRole("list", { name: "Fotos de la galería" });

  // Par antes y después
  await page.getByRole("button", { name: "Subir fotos" }).click();
  await expect(page.getByRole("button", { name: "Guardar en la galería" })).toBeEnabled();
  await page.getByLabel("Archivo: Antes (opcional)").setInputFiles(foto("antes.png"));
  await page.getByLabel("Archivo: Después").setInputFiles(foto("despues.png"));
  await page.getByLabel("Servicio").selectOption({ label: "Pulido y nano cerámico" });
  await page.getByLabel("Descripción").fill("Pulido y nano cerámico en una Hilux");
  await page.getByRole("button", { name: "Guardar en la galería" }).click();
  await expect(page.getByText("Fotos guardadas.")).toBeVisible();
  await expect(galeria.getByRole("img", { name: "Antes: Pulido y nano cerámico en una Hilux" })).toHaveAttribute("src", /galeria\/[\w-]+-640\.webp$/);

  // Foto sola; sin la foto del resultado no se sube
  await page.getByRole("button", { name: "Subir fotos" }).click();
  await page.getByLabel("Servicio").selectOption({ label: "Pulido de vidrios" });
  await page.getByLabel("Descripción").fill("Vidrios sin manchas de ácido");
  await page.getByRole("button", { name: "Guardar en la galería" }).click();
  await expect(page.getByText("Elige la foto del resultado.")).toBeVisible();
  await page.getByLabel("Archivo: Después").setInputFiles(foto("vidrio.png"));
  await page.getByRole("button", { name: "Guardar en la galería" }).click();
  await expect(page.getByText("Foto guardada.")).toBeVisible();
  await expect(galeria.getByRole("listitem")).toHaveCount(2);

  // Ordenar: la foto sola pasa primero
  await page.getByRole("button", { name: "Subir: Vidrios sin manchas de ácido" }).click();
  await expect(galeria.getByRole("listitem").first()).toContainText("Vidrios sin manchas de ácido");

  // Filtrar por servicio
  await page.getByLabel("Ver fotos de").selectOption({ label: "Pulido de vidrios" });
  await expect(galeria.getByRole("listitem")).toHaveCount(1);
  await page.getByLabel("Ver fotos de").selectOption({ label: "Todos los servicios" });

  // Ocultar y editar
  await page.getByRole("button", { name: "Ocultar: Vidrios sin manchas de ácido" }).click();
  await expect(galeria.getByRole("listitem").first()).toContainText("Oculta");
  await page.getByRole("button", { name: "Editar: Vidrios sin manchas de ácido" }).click();
  await galeria.getByLabel("Descripción").fill("Parabrisas sin manchas de ácido");
  await galeria.getByRole("button", { name: "Guardar" }).click();
  await expect(galeria).toContainText("Parabrisas sin manchas de ácido");

  // Eliminar, con confirmación; las fotos se borran del almacenamiento
  const src = await galeria.getByRole("img", { name: "Parabrisas sin manchas de ácido" }).getAttribute("src");
  await page.getByRole("button", { name: "Eliminar: Parabrisas sin manchas de ácido" }).click();
  await page.getByRole("button", { name: "Eliminar foto" }).click();
  await expect(page.getByText("Foto eliminada.")).toBeVisible();
  await expect(galeria.getByRole("listitem")).toHaveCount(1);
  expect((await page.request.get(src!)).status()).toBe(404);
});
