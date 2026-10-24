import { expect, test } from "@playwright/test";
import { ingresarComoDueno, PNG } from "./apoyo";

// HU-12 Galería pública. Criterios: docs/09-pruebas/criterios-entrega-1.md (12.1 a 12.3).
// Sube sus propias fotos por el panel (con servicios que no usa la prueba de HU-09) y las busca por su descripción.

const foto = (nombre: string) => ({ name: nombre, mimeType: "image/png", buffer: PNG });

test("la galería muestra las fotos visibles, se filtra por servicio y se amplían", async ({ page }, info) => {
  test.setTimeout(60_000);
  const sufijo = info.project.name === "celular" ? "c" : "e";
  const conPar = `Faroles como nuevos ${sufijo}`;
  const sola = `Polarizado de prueba ${sufijo}`;

  await ingresarComoDueno(page);
  await page.goto("/panel/sitio/galeria");
  for (const [servicio, descripcion, antes] of [["Restauración de faroles con polímero", conPar, true], ["Polarizado de vidrios", sola, false]] as const) {
    await page.getByRole("button", { name: "Subir fotos" }).click();
    await expect(page.getByRole("button", { name: "Guardar en la galería" })).toBeEnabled();
    if (antes) await page.getByLabel("Archivo: Antes (opcional)").setInputFiles(foto("antes.png"));
    await page.getByLabel("Archivo: Después").setInputFiles(foto("despues.png"));
    await page.getByLabel("Servicio").selectOption({ label: servicio });
    await page.getByLabel("Descripción").fill(descripcion);
    await page.getByRole("button", { name: "Guardar en la galería" }).click();
    // Se espera a ver la foto en la lista: el aviso de la subida anterior puede seguir en pantalla.
    await expect(page.getByRole("list", { name: "Fotos de la galería" }).getByRole("listitem").filter({ hasText: descripcion })).toHaveCount(1);
  }

  await page.goto("/galeria");
  const grilla = page.getByRole("list", { name: "Fotos de trabajos" });
  await expect(grilla.getByRole("button", { name: `Ampliar: ${conPar}` })).toBeVisible();
  await expect(grilla.getByRole("button", { name: `Ampliar: ${sola}` })).toBeVisible();

  // Filtro por servicio. En el celular, en una sola fila que se desliza (pulido 2.4)
  const filtro = page.getByRole("navigation", { name: "Filtrar por servicio" });
  if (info.project.name === "celular") expect((await filtro.boundingBox())!.height).toBeLessThan(60);
  await page.getByRole("navigation", { name: "Filtrar por servicio" }).getByRole("link", { name: "Restauración de faroles con polímero" }).click();
  await expect(page).toHaveURL(/servicio=restauracion-de-faroles-con-polimero/);
  await expect(grilla.getByRole("button", { name: `Ampliar: ${sola}` })).toHaveCount(0);

  // Visor: antes y después en grande
  await grilla.getByRole("button", { name: `Ampliar: ${conPar}` }).click();
  const visor = page.getByRole("dialog", { name: "Restauración de faroles con polímero" });
  await expect(visor.getByRole("img", { name: `Antes: ${conPar}` })).toBeVisible();
  // El foco entra por el título, no por el deslizador oculto
  await expect(visor.getByRole("heading", { name: "Restauración de faroles con polímero" })).toBeFocused();
  await expect(visor.getByRole("img", { name: `Después: ${conPar}` })).toHaveAttribute("src", /galeria\/[\w-]+\.webp$/);
  // El antes y el después en una sola foto, partida por una línea que se arrastra (pedido del 24/10). Entera a la vista,
  // sin bajar: lo mide el después, que ocupa toda la caja; el antes está recortado hasta la línea
  await expect(visor.getByRole("img", { name: `Después: ${conPar}` })).toBeInViewport({ ratio: 1 });
  await expect(visor.getByRole("img", { name: `Antes: ${conPar}` })).toBeInViewport();
  const linea = visor.getByRole("slider", { name: "Comparar antes y después" });
  await expect(linea).toHaveValue("50");
  // Con el teclado: las flechas mueven la línea
  await linea.focus();
  await page.keyboard.press("ArrowRight");
  await expect(linea).toHaveValue("51");
  // Con el dedo o el mouse: se arrastra sobre la foto (aquí, un toque cerca del borde izquierdo)
  const caja = (await visor.getByRole("img", { name: `Después: ${conPar}` }).boundingBox())!;
  await page.mouse.click(caja.x + caja.width * 0.2, caja.y + caja.height / 2);
  await expect.poll(async () => Number(await linea.inputValue())).toBeLessThan(30);
  // Y un arrastre de costado la lleva hasta donde se suelta
  await page.mouse.move(caja.x + caja.width * 0.5, caja.y + caja.height / 2);
  await page.mouse.down();
  await page.mouse.move(caja.x + caja.width * 0.8, caja.y + caja.height / 2, { steps: 5 });
  await page.mouse.up();
  await expect.poll(async () => Number(await linea.inputValue())).toBeGreaterThan(70);
  // Cerrar: en español y de 44 px; también cierra con Escape
  const cerrar = visor.getByRole("button", { name: "Cerrar" });
  // Se espera a que termine la animación de apertura (el diálogo entra con un leve zoom)
  await expect.poll(async () => (await cerrar.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await cerrar.click();
  await expect(visor).toHaveCount(0);
  await grilla.getByRole("button", { name: `Ampliar: ${conPar}` }).click();
  await page.keyboard.press("Escape");
  await expect(visor).toHaveCount(0);
  await expect(page.locator("main")).not.toContainText(/\bBs\b/);

  // Más trabajos en TikTok (pedido de la demo del 24/10): un enlace a su perfil, que carga preparar.setup.ts
  await expect(page.getByRole("link", { name: "Mira nuestros trabajos en TikTok" })).toHaveAttribute("href", "https://www.tiktok.com/@toctar.detailing");

  // Termina con la invitación a mandar fotos: un solo WhatsApp a la vista
  // El título del cierre arriba de la pantalla: su botón se ve con él
  const titulo = page.getByRole("heading", { name: "¿Quieres este resultado en tu vehículo?" });
  await titulo.evaluate((e) => e.scrollIntoView({ block: "start" }));
  await expect(titulo).toBeInViewport();
  await expect(page.getByRole("link", { name: "Mandar fotos de mi vehículo por WhatsApp" })).toBeInViewport();
  await expect(page.getByRole("link", { name: "Escribir a TocTar por WhatsApp" })).toBeHidden();
});
