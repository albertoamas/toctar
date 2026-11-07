import { expect, test, type TestInfo } from "@playwright/test";
import sharp from "sharp";
import { archivosArrastrados, ingresarComoDueno, PNG } from "./apoyo";

// HU-09 Galería en el panel. Criterios: docs/09-pruebas/criterios-entrega-1.md (9.1 a 9.4).
// La galería es compartida: las pruebas que guardan corren solo en escritorio.

const soloEscritorio = (info: TestInfo) => test.skip(info.project.name !== "escritorio", "Cambia la galería compartida");

const foto = (nombre: string) => ({ name: nombre, mimeType: "image/png", buffer: PNG });

test("sin servicio no se sube; la descripción es opcional", async ({ page }) => {
  await ingresarComoDueno(page);
  await page.goto("/panel/sitio");
  await page.getByRole("navigation", { name: "Partes del sitio web" }).getByRole("link", { name: /^Galería/ }).click();
  await page.getByRole("button", { name: "Subir fotos" }).click();
  await page.getByRole("button", { name: "Guardar en la galería" }).click();
  await expect(page.getByText("Elige el servicio.")).toBeVisible();
  // Desde el 24/10 la descripción es opcional: no se ve en el sitio (la leen Google y los lectores de pantalla)
  await expect(page.getByLabel("Descripción (opcional)")).not.toHaveAttribute("aria-invalid", "true");
});

test("la guía dice cómo sacar las fotos, y elegir una vertical o dos de distinta forma avisa sin bloquear", async ({ page }) => {
  const imagen = async (nombre: string, width: number, height: number) => ({
    name: nombre,
    mimeType: "image/png",
    buffer: await sharp({ create: { width, height, channels: 3, background: "#808080" } }).png().toBuffer(),
  });
  const vertical = "Esta foto es vertical: se va a recortar arriba y abajo. Mejor sácala con el celular acostado.";
  const distintas = "Las dos fotos tienen distinta forma: van a quedar con bandas a los costados. Mejor sácalas igual.";
  await ingresarComoDueno(page);
  await page.goto("/panel/sitio/galeria");
  await page.getByRole("button", { name: "Subir fotos" }).click();
  await expect(page.getByRole("button", { name: "Guardar en la galería" })).toBeEnabled();
  await expect(page.getByText(/^Formato 4:3, con el celular acostado\./)).toBeVisible();

  await page.getByLabel("Archivo: Después").setInputFiles(await imagen("vertical.png", 30, 40));
  await expect(page.getByText(vertical)).toBeVisible();
  await page.getByLabel("Archivo: Antes (opcional)").setInputFiles(await imagen("horizontal.png", 40, 30));
  await expect(page.getByText(distintas)).toBeVisible();
  // Corregida, los avisos se van
  await page.getByLabel("Archivo: Después").setInputFiles(await imagen("otra.png", 40, 30));
  await expect(page.getByText(vertical)).toHaveCount(0);
  await expect(page.getByText(distintas)).toHaveCount(0);
  // No bloquea: el botón sigue habilitado con el aviso a la vista
  await page.getByLabel("Archivo: Después").setInputFiles(await imagen("vertical.png", 30, 40));
  await expect(page.getByText(vertical)).toBeVisible();
  await expect(page.getByRole("button", { name: "Guardar en la galería" })).toBeEnabled();
});

test("se puede soltar una foto en la zona, cambiarla y quitarla; lo que no es una foto se rechaza", async ({ page }) => {
  await ingresarComoDueno(page);
  await page.goto("/panel/sitio/galeria");
  await page.getByRole("button", { name: "Subir fotos" }).click();
  await expect(page.getByRole("button", { name: "Guardar en la galería" })).toBeEnabled();
  const zona = page.locator("[data-zona-foto]").first();
  // Vacía invita a usarla, con lo que acepta
  await expect(zona).toContainText("JPG, PNG o WebP");

  const pdf = await archivosArrastrados(page, [{ name: "lista.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF") }]);
  await zona.dispatchEvent("dragenter", { dataTransfer: pdf });
  await expect(zona).toContainText("Suelta la foto aquí");
  await zona.dispatchEvent("drop", { dataTransfer: pdf });
  await expect(page.getByText("Eso no es una foto. Elige un JPG, PNG o WebP.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Quitar foto: Antes (opcional)" })).toHaveCount(0);
  // Elegirlo con el selector de archivos da lo mismo
  await page.getByLabel("Archivo: Antes (opcional)").setInputFiles({ name: "lista.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF") });
  await expect(page.getByText("Eso no es una foto. Elige un JPG, PNG o WebP.")).toBeVisible();
  await expect(zona.locator("img")).toHaveCount(0);

  // Varias donde va una: se usa la primera y lo dice
  const dos = await archivosArrastrados(page, [foto("una.png"), foto("otra.png")]);
  await zona.dispatchEvent("dragenter", { dataTransfer: dos });
  await zona.dispatchEvent("drop", { dataTransfer: dos });
  await expect(page.getByText("Soltaste 2 archivos: se usó la primera foto.")).toBeVisible();
  await expect(page.getByText("Eso no es una foto.", { exact: false })).toHaveCount(0);
  await expect(zona.locator("img")).toHaveAttribute("src", /^blob:/);

  await page.getByRole("button", { name: "Quitar foto: Antes (opcional)" }).click();
  await expect(zona.locator("img")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Elegir foto: Antes (opcional)" })).toBeVisible();
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
  // (sin la foto, que también es un botón: la abre en grande)
  const renglones = await item("Pulido y nano cerámico en una Hilux").getByRole("button").evaluateAll((botones) => new Set(botones.filter((b) => !b.getAttribute("aria-label")?.startsWith("Ver en grande")).map((b) => Math.round(b.getBoundingClientRect().top))).size);
  expect(renglones).toBe(1);

  // Al tocar la foto se ve en grande, con el antes y el después, y se pasa al trabajo de al lado (pulido 13.16)
  await item("Pulido y nano cerámico en una Hilux").getByRole("button", { name: "Ver en grande: Pulido y nano cerámico en una Hilux" }).click();
  const visor = page.getByRole("dialog", { name: /^Galería: trabajo \d+ de \d+$/ });
  await expect(visor.getByRole("img", { name: "Antes: Pulido y nano cerámico en una Hilux" })).toBeVisible();
  await expect(visor.getByRole("img", { name: "Después: Pulido y nano cerámico en una Hilux" })).toBeVisible();
  const titulo = (await visor.getByRole("heading").innerText()).trim();
  const [, n, total] = titulo.match(/trabajo (\d+) de (\d+)/)!.map(Number);
  await page.keyboard.press(n < total ? "ArrowRight" : "ArrowLeft");
  await expect(page.getByRole("dialog", { name: `Galería: trabajo ${n < total ? n + 1 : n - 1} de ${total}` })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);

  // Ordenar: la foto sola pasa antes que el par
  const posicion = async (texto: string) => (await galeria.getByRole("listitem").allTextContents()).findIndex((t) => t.includes(texto));
  await page.getByRole("button", { name: "Más: Vidrios sin manchas de ácido" }).click();
  await page.getByRole("menuitem", { name: "Mover antes" }).click();
  await expect.poll(async () => (await posicion("Vidrios sin manchas de ácido")) < (await posicion("Pulido y nano cerámico en una Hilux"))).toBe(true);

  // Filtrar por servicio
  await page.getByLabel("Ver fotos de").selectOption({ label: "Pulido de vidrios" });
  await expect(item("Vidrios sin manchas de ácido")).toHaveCount(1);
  await expect(item("Pulido y nano cerámico en una Hilux")).toHaveCount(0);
  await page.getByLabel("Ver fotos de").selectOption({ label: "Todos los servicios" });

  // Ocultar y editar
  await page.getByRole("button", { name: "Más: Vidrios sin manchas de ácido" }).click();
  await page.getByRole("menuitem", { name: "Ocultar del sitio" }).click();
  await expect(item("Vidrios sin manchas de ácido")).toContainText("Oculta");
  // Editar, en un modal: la tarjeta no cambia de forma (pulido 13.17)
  await page.getByRole("button", { name: "Editar: Vidrios sin manchas de ácido" }).click();
  const edicion = page.getByRole("dialog", { name: "Editar trabajo" });
  // Tras un error, el servicio elegido se conserva (React reinicia el formulario y el selector volvía al original)
  await edicion.getByLabel("Servicio").selectOption({ label: "Pulido y nano cerámico" });
  // La descripción es opcional, pero tiene un largo máximo
  await edicion.getByLabel("Descripción").fill("x".repeat(141));
  await edicion.getByRole("button", { name: "Guardar trabajo" }).click();
  await expect(edicion.getByLabel("Descripción")).toHaveAttribute("aria-invalid", "true");
  await expect(edicion.getByLabel("Servicio").locator("option:checked")).toHaveText("Pulido y nano cerámico");
  await edicion.getByLabel("Servicio").selectOption({ label: "Pulido de vidrios" });
  await edicion.getByLabel("Descripción").fill("Parabrisas sin manchas de ácido");
  await edicion.getByRole("button", { name: "Guardar trabajo" }).click();
  await expect(edicion).toHaveCount(0);
  await expect(galeria).toContainText("Parabrisas sin manchas de ácido");

  // Eliminar, con confirmación; las fotos se borran del almacenamiento
  const src = await galeria.getByRole("img", { name: "Parabrisas sin manchas de ácido" }).getAttribute("src");
  await page.getByRole("button", { name: "Más: Parabrisas sin manchas de ácido" }).click();
  await page.getByRole("menuitem", { name: "Eliminar foto" }).click();
  const confirmar = page.getByRole("dialog", { name: "¿Eliminar esta foto?" });
  // El foco en Cancelar: un Enter no la borra
  await expect(confirmar.getByRole("button", { name: "Cancelar" })).toBeFocused();
  await confirmar.getByRole("button", { name: "Eliminar foto" }).click();
  await expect(page.getByText("Foto eliminada.")).toBeVisible();
  await expect(item("Parabrisas sin manchas de ácido")).toHaveCount(0);
  expect((await page.request.get(src!)).status()).toBe(404);
});
