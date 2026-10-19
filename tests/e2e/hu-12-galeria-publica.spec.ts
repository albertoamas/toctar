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

  // Filtro por servicio
  await page.getByRole("navigation", { name: "Filtrar por servicio" }).getByRole("link", { name: "Restauración de faroles con polímero" }).click();
  await expect(page).toHaveURL(/servicio=restauracion-de-faroles-con-polimero/);
  await expect(grilla.getByRole("button", { name: `Ampliar: ${sola}` })).toHaveCount(0);

  // Visor: antes y después en grande
  await grilla.getByRole("button", { name: `Ampliar: ${conPar}` }).click();
  const visor = page.getByRole("dialog", { name: "Restauración de faroles con polímero" });
  await expect(visor.getByRole("img", { name: `Antes: ${conPar}` })).toBeVisible();
  await expect(visor.getByRole("img", { name: `Después: ${conPar}` })).toHaveAttribute("src", /galeria\/[\w-]+\.webp$/);
  await page.keyboard.press("Escape");
  await expect(visor).toHaveCount(0);
  await expect(page.locator("main")).not.toContainText(/\bBs\b/);
});
