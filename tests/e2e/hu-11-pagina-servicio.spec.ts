import { expect, test, type TestInfo } from "@playwright/test";
import { crearServicioPublicado, ingresarComoDueno, PNG } from "./apoyo";

// HU-11 Página de cada servicio y HU-15 (mensaje con el servicio). Criterios: docs/09-pruebas/criterios-entrega-1.md (11.x).

const soloEscritorio = (info: TestInfo) => test.skip(info.project.name !== "escritorio", "Cambia servicios compartidos");

test("la página de un servicio muestra el proceso y abre WhatsApp con ese servicio escrito", async ({ page }) => {
  await page.goto("/servicios");
  await page.getByRole("link", { name: "Ver el servicio: Mantenimiento del nano cerámico" }).click();
  await expect(page).toHaveURL(/\/servicios\/mantenimiento-del-nano-ceramico$/);
  await expect(page).toHaveTitle("Mantenimiento del nano cerámico · TocTar Detailing");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Mantenimiento del nano cerámico");

  // Los 6 pasos que mandó el dueño, en orden
  const proceso = page.getByRole("region", { name: "Cómo lo hacemos" });
  await expect(proceso.getByRole("listitem")).toHaveCount(6);
  await expect(proceso.getByRole("listitem").first()).toContainText("Lavado técnico de carrocería");
  // Sin opciones: la variante "Única" no se muestra
  await expect(page.getByRole("region", { name: "Opciones" })).toHaveCount(0);

  const mensaje = "?text=Hola%2C%20quiero%20consultar%20por%20Mantenimiento%20del%20nano%20cer%C3%A1mico.";
  await expect(page.getByRole("link", { name: "Consultar por este servicio por WhatsApp" })).toHaveAttribute("href", `https://wa.me/59171234567${mensaje}`);
  // El cierre dice lo que gana el cliente y también manda el servicio escrito (pulido 2.3)
  await expect(page.getByRole("link", { name: "Mandar fotos de mi vehículo por WhatsApp" })).toHaveAttribute("href", `https://wa.me/59171234567${mensaje}`);
  // Por su enlace: al navegar dentro del sitio, Next.js guarda oculta la página anterior con su propio botón fijo.
  await expect(page.locator(`.tt-whatsapp--fijo[href="https://wa.me/59171234567${mensaje}"]`)).toHaveCount(1);
  await expect(page.locator("main")).not.toContainText(/\bBs\b/);
});

test("las variantes se muestran sin precio", async ({ page }) => {
  await page.goto("/servicios/pulido-y-nano-ceramico");
  const opciones = page.getByRole("region", { name: "Opciones" });
  await expect(opciones.getByRole("listitem")).toHaveText([/1 año/, /2 años/, /3 años/, /5 años/, /10 años/]);
  await expect(page.locator("main")).not.toContainText(/\bBs\b/);
});

// Pedido de la demo del 24/10: beneficios con ícono y, si las opciones van de menor a mayor, escalones
test("los beneficios van primero, con ícono, y las opciones de menor a mayor se ven como escalones", async ({ page }, info) => {
  soloEscritorio(info);
  await ingresarComoDueno(page);
  await page.goto("/panel/sitio/servicios");
  await page.getByRole("link", { name: /Pulido y nano cerámico/ }).click();
  await expect(page).toHaveURL(/\/panel\/sitio\/servicios\/\d+$/);
  const panel = page.url();
  // Empieza sin beneficios, aunque un intento anterior haya fallado a mitad de camino
  const quitar = page.getByRole("button", { name: "Quitar beneficio 1" });
  while (await quitar.isVisible()) await quitar.click();
  await page.getByRole("button", { name: "Agregar beneficio" }).click();
  await page.getByLabel("Beneficio 1", { exact: true }).fill("Protege del sol");
  await page.getByLabel("Beneficio 1, ícono").selectOption({ label: "Sol y rayos UV" });
  const escalera = page.getByRole("checkbox", { name: /Van de menor a mayor/ });
  await escalera.check();
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByText("Cambios guardados.")).toBeVisible();

  await page.goto("/servicios/pulido-y-nano-ceramico");
  // El beneficio con su ícono (decorativo: el texto dice lo mismo)
  const beneficio = page.getByRole("region", { name: "Qué gana tu vehículo" }).getByRole("listitem");
  await expect(beneficio).toHaveText("Protege del sol");
  await expect(beneficio.locator("svg")).toHaveAttribute("aria-hidden", "true");
  const opciones = page.getByRole("region", { name: "Opciones" });
  await expect(opciones.locator(".tt-escalon")).toHaveCount(5);
  // La capa crece: la última es más alta que la primera (en la computadora, columnas que suben)
  const capas = opciones.locator(".tt-escalon__capa");
  const [primera, ultima] = [await capas.first().boundingBox(), await capas.last().boundingBox()];
  expect(ultima!.height).toBeGreaterThan(primera!.height);

  // Sin la casilla, vuelven a ser recuadros; se quita el beneficio de prueba
  await page.goto(panel);
  await escalera.uncheck();
  await page.getByRole("button", { name: "Quitar beneficio 1" }).click();
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByText("Cambios guardados.")).toBeVisible();
  await page.goto("/servicios/pulido-y-nano-ceramico");
  await expect(opciones.getByRole("listitem")).toHaveCount(5);
  await expect(opciones.locator(".tt-escalon")).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Qué gana tu vehículo" })).toHaveCount(0);
});

test("un servicio oculto o inexistente muestra la página no encontrada", async ({ page }, info) => {
  await page.goto("/servicios/no-existe");
  await expect(page.getByRole("heading", { name: "No encontramos esta página" })).toBeVisible();
  // Responde 200 porque la página empieza a enviarse antes de saber si el servicio existe; Google no la indexa (pulido 2.9)
  await expect(page.locator('meta[name="robots"][content*="noindex"]').first()).toBeAttached();

  soloEscritorio(info);
  await ingresarComoDueno(page);
  await crearServicioPublicado(page, "Servicio oculto con página", "No se debe ver en el sitio.");
  await page.goto("/servicios/servicio-oculto-con-pagina");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Servicio oculto con página");

  await page.goBack();
  await page.getByRole("checkbox", { name: /Mostrar en el sitio/ }).uncheck();
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByText("Cambios guardados.")).toBeVisible();
  await page.goto("/servicios/servicio-oculto-con-pagina");
  await expect(page.getByRole("heading", { name: "No encontramos esta página" })).toBeVisible();
});

test("la lista de servicios termina con una invitación a mandar fotos, con un solo WhatsApp a la vista", async ({ page }) => {
  await page.goto("/servicios");
  await page.getByRole("heading", { name: "¿No sabes cuál elegir?" }).scrollIntoViewIfNeeded();
  await expect(page.getByRole("link", { name: "Mandar fotos de mi vehículo por WhatsApp" })).toBeInViewport();
  await expect(page.getByRole("link", { name: "Escribir a TocTar por WhatsApp" })).toBeHidden();
});

test("con el teclado se enmarca toda la tarjeta del servicio", async ({ page, isMobile }) => {
  test.skip(isMobile, "El teclado se prueba en la computadora");
  // Solo con el teclado y con la página ya hidratada: desde el último enlace del menú, Tab llega a la primera tarjeta
  await page.goto("/servicios", { waitUntil: "networkidle" });
  const enlace = page.locator(".tt-tarjeta__enlace").first();
  await page.getByRole("navigation", { name: "Principal" }).getByRole("link", { name: "Contacto" }).focus();
  await page.keyboard.press("Tab");
  await expect(enlace).toBeFocused();
  await expect(page.locator(".tt-tarjeta").first()).toHaveCSS("outline-style", "solid");
});

test("en la página de un servicio, volver a Servicios es lo primero y se toca con el dedo", async ({ page }) => {
  await page.goto("/servicios/pulido-y-nano-ceramico");
  const volver = page.getByRole("main").getByRole("link", { name: "Servicios", exact: true });
  const caja = (await volver.boundingBox())!;
  expect(caja.height).toBeGreaterThanOrEqual(44);
  // Antes que la foto y el título: en el celular la foto va arriba del título y el enlace, antes que los dos
  const foto = (await page.locator('main header [class*="aspect-[4/3]"]').boundingBox())!;
  const titulo = (await page.getByRole("heading", { level: 1 }).boundingBox())!;
  expect(caja.y + caja.height).toBeLessThanOrEqual(Math.min(foto.y, titulo.y));
});

// Pedido de la demo del 24/10: una foto al lado de "Cómo lo hacemos" y de "Opciones", subida en su lugar del panel.
// Decorativa: sin descripción y sin abrirse en grande (revisión de YankoSoft)
test("cada sección de la página lleva su foto al lado, subida en su lugar del panel", async ({ page }, info) => {
  test.setTimeout(60_000);
  await ingresarComoDueno(page);
  const { id, slug } = await crearServicioPublicado(page, `Servicio con fotos ${info.project.name}`);
  // Recargada: el aviso del guardado anterior ya no está y el formulario no se reinicia bajo lo que se escribe
  await page.reload();
  await page.getByRole("button", { name: "Agregar paso" }).click();
  await page.getByLabel("Paso 1, título", { exact: true }).fill("Lavado técnico");
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByText("Cambios guardados.")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Paso 1, título", { exact: true })).toHaveValue("Lavado técnico");

  const fotos = page.getByRole("region", { name: "Fotos de la página" });
  // Un lugar por sección. Sin opciones en el catálogo, "Opciones" no sale en el sitio: ni su foto ni su casilla se
  // ofrecen (pulido 13.2)
  await expect(fotos.getByRole("button", { name: "Subir foto: Cómo lo hacemos" })).toBeVisible();
  await expect(fotos.getByRole("button", { name: "Subir foto: Opciones" })).toHaveCount(0);
  await expect(page.getByText("Sin opciones en el catálogo: esta sección no sale en el sitio.")).toBeVisible();
  await expect(page.getByRole("checkbox", { name: /Van de menor a mayor/ })).toHaveCount(0);
  await expect(fotos.getByText("No se ve hasta que agregues pasos.")).toHaveCount(0);
  // Se sube al elegirla, sin descripción
  await page.getByLabel("Archivo de la foto: Cómo lo hacemos").setInputFiles({ name: "foto.png", mimeType: "image/png", buffer: PNG });
  await expect(fotos.getByRole("img", { name: 'Foto de "Cómo lo hacemos"' })).toBeVisible();
  await expect(fotos.getByRole("button", { name: "Cambiar foto: Cómo lo hacemos" })).toBeVisible();

  // En el sitio, al lado de su sección: decorativa y sin abrirse en grande
  await page.goto(`/servicios/${slug}`);
  const proceso = page.getByRole("region", { name: "Cómo lo hacemos" });
  await expect(proceso.locator("img")).toHaveAttribute("src", /servicios\/[\w-]+-640\.webp$/);
  await expect(proceso.locator("img")).toHaveAttribute("alt", "");
  await expect(proceso.getByRole("button")).toHaveCount(0);

  // Quitada, la sección queda solo con su texto
  await page.goto(`/panel/sitio/servicios/${id}`);
  await fotos.getByRole("button", { name: "Quitar foto: Cómo lo hacemos" }).click();
  await expect(fotos.getByRole("button", { name: "Subir foto: Cómo lo hacemos" })).toBeVisible();
  await page.goto(`/servicios/${slug}`);
  await expect(proceso).toContainText("Lavado técnico");
  await expect(proceso.locator("img")).toHaveCount(0);
});
