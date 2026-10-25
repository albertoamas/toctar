import { expect, test, type TestInfo } from "@playwright/test";
import { ingresarComoDueno, PNG } from "./apoyo";

// HU-09 Galería en el panel. Criterios: docs/09-pruebas/criterios-entrega-1.md (9.1 a 9.4).
// La galería es compartida: las pruebas que guardan corren solo en escritorio.

const soloEscritorio = (info: TestInfo) => test.skip(info.project.name !== "escritorio", "Cambia la galería compartida");

const foto = (nombre: string) => ({ name: nombre, mimeType: "image/png", buffer: PNG });

test("sin servicio no se sube; la descripción es opcional", async ({ page }) => {
  await ingresarComoDueno(page);
  await page.goto("/panel/sitio");
  await page.getByRole("navigation", { name: "Secciones del sitio web" }).getByRole("link", { name: "Galería" }).click();
  await page.getByRole("button", { name: "Subir fotos" }).click();
  await page.getByRole("button", { name: "Guardar en la galería" }).click();
  await expect(page.getByText("Elige el servicio.")).toBeVisible();
  // Desde el 24/10 la descripción es opcional: no se ve en el sitio (la leen Google y los lectores de pantalla)
  await expect(page.getByLabel("Descripción (opcional)")).not.toHaveAttribute("aria-invalid", "true");
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
  // Otras pruebas suben fotos al mismo tiempo: se miran solo las de esta prueba, por su descripción.
  const item = (texto: string) => galeria.getByRole("listitem").filter({ hasText: texto });
  await expect(item("Vidrios sin manchas de ácido")).toHaveCount(1);
  await expect(item("Pulido y nano cerámico en una Hilux")).toHaveCount(1);
  // Los 5 íconos de la foto van en un solo renglón, también en el celular (pulido 4.7)
  const renglones = await item("Pulido y nano cerámico en una Hilux").getByRole("button").evaluateAll((botones) => new Set(botones.map((b) => Math.round(b.getBoundingClientRect().top))).size);
  expect(renglones).toBe(1);

  // Ordenar: la foto sola pasa antes que el par
  const posicion = async (texto: string) => (await galeria.getByRole("listitem").allTextContents()).findIndex((t) => t.includes(texto));
  await page.getByRole("button", { name: "Subir: Vidrios sin manchas de ácido" }).click();
  await expect.poll(async () => (await posicion("Vidrios sin manchas de ácido")) < (await posicion("Pulido y nano cerámico en una Hilux"))).toBe(true);

  // Filtrar por servicio
  await page.getByLabel("Ver fotos de").selectOption({ label: "Pulido de vidrios" });
  await expect(item("Vidrios sin manchas de ácido")).toHaveCount(1);
  await expect(item("Pulido y nano cerámico en una Hilux")).toHaveCount(0);
  await page.getByLabel("Ver fotos de").selectOption({ label: "Todos los servicios" });

  // Ocultar y editar
  await page.getByRole("button", { name: "Ocultar: Vidrios sin manchas de ácido" }).click();
  await expect(item("Vidrios sin manchas de ácido")).toContainText("Oculta");
  await page.getByRole("button", { name: "Editar: Vidrios sin manchas de ácido" }).click();
  // Tras un error, el servicio elegido se conserva (React reinicia el formulario y el selector volvía al original)
  await galeria.getByLabel("Servicio").selectOption({ label: "Pulido y nano cerámico" });
  // La descripción es opcional, pero tiene un largo máximo
  await galeria.getByLabel("Descripción").fill("x".repeat(141));
  await galeria.getByRole("button", { name: "Guardar" }).click();
  await expect(galeria.getByLabel("Descripción")).toHaveAttribute("aria-invalid", "true");
  await expect(galeria.getByLabel("Servicio").locator("option:checked")).toHaveText("Pulido y nano cerámico");
  await galeria.getByLabel("Servicio").selectOption({ label: "Pulido de vidrios" });
  await galeria.getByLabel("Descripción").fill("Parabrisas sin manchas de ácido");
  await galeria.getByRole("button", { name: "Guardar" }).click();
  await expect(galeria).toContainText("Parabrisas sin manchas de ácido");

  // Eliminar, con confirmación; las fotos se borran del almacenamiento
  const src = await galeria.getByRole("img", { name: "Parabrisas sin manchas de ácido" }).getAttribute("src");
  await page.getByRole("button", { name: "Eliminar: Parabrisas sin manchas de ácido" }).click();
  await page.getByRole("button", { name: "Eliminar foto" }).click();
  await expect(page.getByText("Foto eliminada.")).toBeVisible();
  await expect(item("Parabrisas sin manchas de ácido")).toHaveCount(0);
  expect((await page.request.get(src!)).status()).toBe(404);
});
