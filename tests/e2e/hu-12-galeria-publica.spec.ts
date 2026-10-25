import { expect, test } from "@playwright/test";
import { ingresarComoDueno, PNG } from "./apoyo";

// HU-12 Galería pública. Criterios: docs/09-pruebas/criterios-entrega-1.md (12.1 a 12.3).
// Sube sus propias fotos por el panel (con servicios que no usa la prueba de HU-09) y las busca por su descripción.

const foto = (nombre: string) => ({ name: nombre, mimeType: "image/png", buffer: PNG });

test("la galería muestra los trabajos en una vitrina pareja, se filtra y los pares se comparan en la página", async ({ page }, info) => {
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
  // Una vitrina pareja (rediseño del 24/10): todos los trabajos en el mismo recuadro, los pares primero y comparables
  // ahí mismo; debajo de cada uno, su servicio, que lleva a su página
  const trabajos = page.getByRole("list", { name: "Trabajos" });
  const par = trabajos.getByRole("listitem").filter({ has: page.getByRole("img", { name: `Después: ${conPar}` }) });
  const fotoSola = trabajos.getByRole("listitem").filter({ has: page.getByRole("img", { name: sola }) });
  await expect(par.getByRole("img", { name: `Antes: ${conPar}` })).toBeVisible();
  await expect(fotoSola).toBeVisible();
  await expect(par.getByRole("link", { name: "Restauración de faroles con polímero" })).toHaveAttribute("href", "/servicios/restauracion-de-faroles-con-polimero");
  // Mismo recuadro para el par y la foto sola
  const [cajaPar, cajaSola] = [(await par.getByRole("img", { name: `Después: ${conPar}` }).boundingBox())!, (await fotoSola.getByRole("img").boundingBox())!];
  expect(Math.round(cajaPar.width)).toBe(Math.round(cajaSola.width));
  expect(Math.round(cajaPar.height)).toBe(Math.round(cajaSola.height));
  // Sin visor ni descripciones a la vista
  await expect(page.getByRole("button", { name: /^Ampliar/ })).toHaveCount(0);
  await expect(page.getByRole("main")).not.toContainText(conPar);

  // Filtro por servicio. En el celular, en una sola fila que se desliza (pulido 2.4)
  const filtro = page.getByRole("navigation", { name: "Filtrar por servicio" });
  if (info.project.name === "celular") expect((await filtro.boundingBox())!.height).toBeLessThan(60);
  await filtro.getByRole("link", { name: "Restauración de faroles con polímero" }).click();
  await expect(page).toHaveURL(/servicio=restauracion-de-faroles-con-polimero/);
  await expect(fotoSola).toHaveCount(0);

  // El comparador, en la página: con el teclado, las flechas mueven la línea
  const linea = par.getByRole("slider", { name: "Comparar antes y después" });
  await expect(linea).toHaveValue("50");
  await linea.focus();
  await page.keyboard.press("ArrowRight");
  await expect(linea).toHaveValue("51");
  // Con el dedo o el mouse: un toque cerca del borde izquierdo la lleva ahí, y un arrastre de costado, hasta donde se suelta
  const caja = (await par.getByRole("img", { name: `Después: ${conPar}` }).boundingBox())!;
  await page.mouse.click(caja.x + caja.width * 0.2, caja.y + caja.height / 2);
  await expect.poll(async () => Number(await linea.inputValue())).toBeLessThan(30);
  await page.mouse.move(caja.x + caja.width * 0.5, caja.y + caja.height / 2);
  await page.mouse.down();
  await page.mouse.move(caja.x + caja.width * 0.8, caja.y + caja.height / 2, { steps: 5 });
  await page.mouse.up();
  await expect.poll(async () => Number(await linea.inputValue())).toBeGreaterThan(70);
  // No abre nada al tocarla
  await expect(page.getByRole("dialog")).toHaveCount(0);
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

  // En la página del servicio, sus trabajos se ven en la galería: un enlace, sin repetir las fotos (revisión del 24/10)
  await page.goto("/servicios/restauracion-de-faroles-con-polimero");
  await expect(page.getByRole("main").getByRole("link", { name: "Ver la galería" })).toHaveAttribute("href", "/galeria?servicio=restauracion-de-faroles-con-polimero");
  await expect(page.getByRole("heading", { name: /^Trabajos de/ })).toHaveCount(0);
});
