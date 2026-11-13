import { expect, test } from "@playwright/test";

// HU-13 Nosotros y preguntas frecuentes, HU-14 Contacto y mapa. Criterios: docs/09-pruebas/criterios-entrega-1.md (13.x y 14.x).
// Leen los textos iniciales (migraciones de B2 y B3); otras pruebas pueden sumar o editar, por eso se buscan textos puntuales.

test("Nosotros muestra la historia, cómo trabajan y por qué elegirlos", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("contentinfo").getByRole("link", { name: "Nosotros" }).click();
  await expect(page).toHaveURL(/\/nosotros$/);
  await expect(page).toHaveTitle("Nosotros · TocTar Detailing");
  await expect(page.getByRole("main")).toContainText("TocTar Detailing empezó el 22 de junio de 2024");
  await expect(page.getByRole("region", { name: "Cómo trabajamos" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Por qué elegirnos" })).toContainText("Revisamos tu vehículo antes de darte un precio.");
  // Termina con el cierre común: un solo WhatsApp a la vista y, al lado, las preguntas frecuentes (pulido 2.5)
  await expect(page.getByRole("heading", { name: "¿Hablamos de tu vehículo?" })).toBeAttached();
  const mandarFotos = page.getByRole("link", { name: "Mandar fotos de mi vehículo por WhatsApp" });
  await mandarFotos.scrollIntoViewIfNeeded();
  await expect(mandarFotos).toBeInViewport();
  await expect(page.getByRole("link", { name: "Escribir a TocTar por WhatsApp" })).toBeHidden();
  await page.getByRole("link", { name: "Ver las preguntas frecuentes" }).click();
  await expect(page).toHaveURL(/\/preguntas-frecuentes$/);
});

test("las preguntas frecuentes se abren y se cierran una por una", async ({ page }) => {
  await page.goto("/preguntas-frecuentes");
  const primera = page.locator("details").filter({ hasText: "¿Cuánto tiempo se queda mi vehículo?" });
  const segunda = page.locator("details").filter({ hasText: "¿Necesitan ver el vehículo para cotizar?" });
  const respuesta = primera.getByText(/Depende del servicio/);

  await expect(respuesta).toBeHidden();
  await primera.locator("summary").click();
  await expect(respuesta).toBeVisible();
  // Abrir una no abre las demás
  await expect(segunda.getByText(/Es lo mejor/)).toBeHidden();
  await primera.locator("summary").click();
  await expect(respuesta).toBeHidden();

  // Termina con el cierre común para hacer la pregunta por WhatsApp: un solo WhatsApp a la vista (pulido 2.6)
  await expect(page.getByRole("heading", { name: "¿No encontraste tu respuesta?" })).toBeAttached();
  const preguntar = page.getByRole("link", { name: "Hacer mi pregunta por WhatsApp" });
  await preguntar.scrollIntoViewIfNeeded();
  await expect(preguntar).toBeInViewport();
  await expect(page.getByRole("link", { name: "Escribir a TocTar por WhatsApp" })).toBeHidden();
});

test("Contacto muestra la dirección con el mapa, el horario y el WhatsApp", async ({ page }) => {
  await page.goto("/contacto");
  await expect(page).toHaveTitle("Contacto · TocTar Detailing");
  const donde = page.getByRole("region", { name: "Dónde estamos" });
  // Pedido 38: la ficha del taller (o, sin ella, las coordenadas): siempre Google Maps
  await expect(donde.getByRole("link").first()).toHaveAttribute("href", /^https:\/\/www\.google\.com\/maps\//);
  await expect(donde).toContainText("Barrio Aeropuerto");
  await expect(page.getByRole("region", { name: "Horario" })).toContainText("Lunes a");
  await expect(page.getByRole("main").getByRole("link", { name: "Pedir cotización por WhatsApp" })).toHaveAttribute("href", /^https:\/\/wa\.me\/59171234567/);
  await expect(page.getByRole("main")).toContainText("+591 7123 4567");
});

test("en Contacto el mapa va junto a la dirección, dice si está abierto y los enlaces tienen 44 px para el dedo", async ({ page, isMobile }) => {
  await page.goto("/contacto");
  const donde = page.getByRole("region", { name: "Dónde estamos" });
  const mapa = (await donde.getByTitle("Mapa del taller de TocTar Detailing").boundingBox())!;
  const horario = (await page.getByRole("region", { name: "Horario" }).boundingBox())!;
  // Pedido 38: el mapa y la dirección van juntos. En el celular, antes del horario; en la computadora, a la derecha
  if (isMobile) expect(mapa.y).toBeLessThan(horario.y);
  else expect(mapa.x).toBeGreaterThan(horario.x + horario.width);
  // Si está abierto ahora (con el horario de Configuración y la hora de Bolivia), y el día de hoy en el horario
  await expect(page.getByRole("main").getByText(/^(Abierto|Cerrado) ahora/)).toBeVisible();
  await expect(page.getByRole("region", { name: "Horario" }).getByText("Hoy", { exact: true })).toBeVisible();
  for (const nombre of ["Cómo llegar", "Garantía de cada trabajo", "toctartarija@gmail.com"]) {
    const alto = (await page.getByRole("main").getByRole("link", { name: nombre }).boundingBox())!.height;
    expect(alto, nombre).toBeGreaterThanOrEqual(44);
  }
});

test("ninguna página pública muestra precios (RN-10) y todas tienen el botón de WhatsApp", async ({ page }) => {
  for (const ruta of ["/", "/servicios", "/servicios/pulido-y-nano-ceramico", "/galeria", "/nosotros", "/preguntas-frecuentes", "/contacto"]) {
    await page.goto(ruta);
    await expect(page.getByRole("main"), ruta).not.toContainText(/\bBs\.?\s?\d|\bprecio:/i);
    // El fijo puede estar escondido si el principal está a la vista (pulido 1.3): se cuenta por su clase.
    await expect(page.locator(".tt-whatsapp--fijo"), ruta).toHaveCount(1);
  }
  // Garantía y reclamos no lo lleva: tapaba el formulario
  await page.goto("/garantia");
  await expect(page.locator(".tt-whatsapp--fijo")).toHaveCount(0);
});
