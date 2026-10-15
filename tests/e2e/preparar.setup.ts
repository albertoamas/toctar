import { expect, test as preparar } from "@playwright/test";
import { ingresarComoDueno } from "./apoyo";

// Corre una vez antes de todas las pruebas (proyecto "preparar" en playwright.config.ts).
// Carga desde el panel lo que el sitio necesita y que los datos iniciales dejan vacío: el WhatsApp.
// Se hace por el panel y no directo en la base para que la caché del sitio se actualice.
// Es el mismo número que usa la prueba de HU-04, así no se contradicen al correr en paralelo.

preparar("cargar el WhatsApp del negocio", async ({ page }) => {
  await ingresarComoDueno(page);
  await page.goto("/panel/configuracion");
  await page.getByLabel("WhatsApp").fill("71234567");
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByText("Cambios guardados.")).toBeVisible();
});
