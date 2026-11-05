import { expect, test as preparar } from "@playwright/test";
import { ingresarComoDueno } from "./apoyo";

// Corre una vez antes de todas las pruebas (proyecto "preparar" en playwright.config.ts).
// Carga desde el panel lo que el sitio necesita y que los datos iniciales dejan vacío: el WhatsApp y la ubicación
// (sin ella Contacto no muestra el mapa), y el TikTok (el botón "Mira nuestros trabajos en TikTok"). Se hace por el panel y no directo en la base para que la caché del sitio
// se actualice. El WhatsApp y la ubicación son los mismos que usa la prueba de HU-04, así no se contradicen al correr
// en paralelo; HU-04 no toca el TikTok (su formulario lo guarda como está).

preparar("cargar el WhatsApp, la ubicación y el TikTok del negocio", async ({ page }) => {
  await ingresarComoDueno(page);
  await page.goto("/panel/configuracion/negocio");
  await page.getByLabel("WhatsApp").fill("71234567");
  await page.getByLabel("Enlace de Google Maps").fill("https://www.google.com/maps/place/x/data=!3d-21.5355!4d-64.7296");
  await page.getByLabel("TikTok").fill("https://www.tiktok.com/@toctar.detailing");
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByText("Cambios guardados.")).toBeVisible();
});
