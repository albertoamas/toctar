import { expect, test } from "@playwright/test";
import { ingresarComoDueno } from "./apoyo";

// HU-06 App instalable. Criterios: docs/09-pruebas/criterios-entrega-1.md (6.1 a 6.4).
// La instalación real (Android e iPhone) necesita https: se prueba a mano en el entorno de pruebas.

test("el manifiesto tiene nombre, abre en el panel como app y sus íconos existen", async ({ request }) => {
  const respuesta = await request.get("/manifest.webmanifest");
  expect(respuesta.ok()).toBe(true);
  const manifiesto = await respuesta.json();
  // "any": la app instalada en Android gira con el celular (con "portrait" quedaba fija en vertical)
  expect(manifiesto).toMatchObject({ short_name: "TocTar", start_url: "/panel", display: "standalone", lang: "es", orientation: "any" });
  expect(manifiesto.icons.map((i: { sizes: string; purpose: string }) => `${i.sizes} ${i.purpose}`)).toEqual([
    "192x192 any",
    "512x512 any",
    "512x512 maskable",
  ]);
  for (const icono of [...manifiesto.icons.map((i: { src: string }) => i.src), "/apple-icon.png"]) {
    const archivo = await request.get(icono);
    expect(archivo.ok(), icono).toBe(true);
    expect(archivo.headers()["content-type"]).toBe("image/png");
  }
});

test("las páginas enlazan el manifiesto y el panel se abre como app en el iPhone", async ({ page }) => {
  await page.goto("/ingresar");
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", "/manifest.webmanifest");
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#000000");
  await ingresarComoDueno(page);
  await expect(page.locator('meta[name="mobile-web-app-capable"]')).toHaveAttribute("content", "yes");
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute("href", /apple-icon/);
});

test("sin internet, el panel muestra el aviso y una página nueva muestra «Sin conexión»", async ({ page, context }) => {
  await ingresarComoDueno(page);
  // El service worker queda activo
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => true));

  await context.setOffline(true);
  await expect(page.getByText("Sin conexión. Los cambios no se guardarán hasta que vuelva internet.")).toBeVisible();

  // Navegar a otra pantalla sin internet: el service worker responde con la página de aviso
  await page.goto("/panel/usuarios");
  await expect(page.getByRole("heading", { name: "Sin conexión" })).toBeVisible();
  await expect(page.getByText("El panel necesita internet. Revisa tu conexión y vuelve a intentar.")).toBeVisible();
  // Con las fuentes de la marca, que el service worker guardó junto con la página (pulido 2.10)
  const fuentes = await page.evaluate(async () => {
    await document.fonts.ready;
    return [...document.fonts].filter((f) => f.status === "loaded").map((f) => f.family.replaceAll('"', ""));
  });
  expect(fuentes).toEqual(expect.arrayContaining(["Barlow Condensed", "Montserrat"]));

  // Vuelve internet y "Reintentar" carga la pantalla
  await context.setOffline(false);
  await page.getByRole("button", { name: "Reintentar" }).click();
  await expect(page.getByRole("heading", { name: "Usuarios" })).toBeVisible();
  await expect(page.getByText("Sin conexión. Los cambios no se guardarán")).toHaveCount(0);
});
