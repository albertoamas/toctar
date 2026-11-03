import { expect, test, type TestInfo } from "@playwright/test";
import { crearServicioPublicado, ingresarComoDueno, PNG } from "./apoyo";

// HU-10 Portada y HU-15 Botón de WhatsApp. Criterios: docs/09-pruebas/criterios-entrega-1.md (10.x y 15.x).
// El WhatsApp lo carga tests/e2e/preparar.setup.ts antes de todas las pruebas.

const soloEscritorio = (info: TestInfo) => test.skip(info.project.name !== "escritorio", "Cambia datos compartidos del sitio");

test("la portada muestra el lema, los servicios y el botón de WhatsApp", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  // Servicios de los datos iniciales, en tarjetas que llevan a su página
  const servicios = page.getByRole("region", { name: "Servicios" });
  await expect(servicios.getByRole("heading", { name: "Pulido y nano cerámico" })).toBeVisible();
  await expect(servicios.getByRole("link", { name: "Ver el servicio: Pulido y nano cerámico" })).toHaveAttribute("href", "/servicios/pulido-y-nano-ceramico");

  // El botón principal y el fijo abren WhatsApp con el número cargado en el panel
  // Los botones dicen lo que gana el cliente; su nombre accesible suma "por WhatsApp" (pulido 2.1)
  await expect(page.getByRole("link", { name: "Pedir cotización por WhatsApp" })).toHaveAttribute("href", /^https:\/\/wa\.me\/59171234567\?text=Hola/);
  await expect(page.getByRole("link", { name: "Mandar fotos de mi vehículo por WhatsApp" })).toHaveAttribute("href", /^https:\/\/wa\.me\/59171234567/);
  // El fijo se esconde mientras el principal está a la vista: se lo busca por su clase (pulido 1.3)
  await expect(page.locator(".tt-whatsapp--fijo")).toHaveAttribute(
    "href",
    "https://wa.me/59171234567?text=Hola%2C%20quiero%20consultar%20por%20un%20servicio.",
  );
});

test("los servicios sin foto muestran la imagen de reemplazo y ninguna página pública muestra precios", async ({ page }) => {
  for (const ruta of ["/", "/servicios"]) {
    await page.goto(ruta);
    await expect(page.locator("main")).not.toContainText(/\bBs\b|precio:/i);
  }
  await expect(page.locator(".tt-reemplazo").first()).toBeVisible();
});

test("ocultar un servicio en el panel lo saca del sitio sin volver a desplegar", async ({ page }, info) => {
  soloEscritorio(info);
  const nombre = "Servicio para ocultar";
  await ingresarComoDueno(page);
  await crearServicioPublicado(page, nombre, "Aparece y desaparece del sitio.");
  const panel = page.url();

  await page.goto("/servicios");
  await expect(page.getByRole("heading", { name: nombre })).toBeVisible();

  await page.goto(panel);
  await page.getByRole("checkbox", { name: /Mostrar en el sitio/ }).uncheck();
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByText("Cambios guardados.")).toBeVisible();

  await page.goto("/servicios");
  await expect(page.getByRole("heading", { name: "Servicios", level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { name: nombre })).toHaveCount(0);
});

test("una dirección que no existe muestra la página no encontrada", async ({ page }) => {
  const respuesta = await page.goto("/esta-pagina-no-existe");
  expect(respuesta?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "No encontramos esta página" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Ver los servicios" })).toHaveAttribute("href", "/servicios");
  // Con el encabezado y el pie del sitio, y su título en la pestaña (pulido 2.9)
  await expect(page.getByRole("link", { name: "TocTar, inicio" })).toBeVisible();
  await expect(page.getByRole("contentinfo")).toBeVisible();
  await expect(page).toHaveTitle("Página no encontrada · TocTar Detailing");
});

// Pulido visual 2.1
test("en el celular los servicios van en filas compactas; en la computadora, en tarjetas", async ({ page, isMobile }) => {
  await page.goto("/");
  const tarjeta = page.getByRole("region", { name: "Servicios" }).locator(".tt-tarjeta").first();
  const caja = (await tarjeta.boundingBox())!;
  if (isMobile) expect(caja.height).toBeLessThan(220);
  else expect(caja.height).toBeGreaterThan(300);
});

test("al llegar al cierre de la portada se ve un solo botón de WhatsApp", async ({ page }) => {
  await page.goto("/");
  const cierre = page.getByRole("heading", { name: "Cuéntanos qué necesita tu vehículo" });
  await cierre.scrollIntoViewIfNeeded();
  await expect(page.getByRole("link", { name: "Mandar fotos de mi vehículo por WhatsApp" })).toBeInViewport();
  await expect(page.getByRole("link", { name: "Escribir a TocTar por WhatsApp" })).toBeHidden();
});

test("al recargar, los títulos de la portada no aparecen antes que su contenido", async ({ page }) => {
  // Con red lenta, en cuanto se ve el título "Servicios" ya están sus tarjetas (llegan juntos)
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 300, downloadThroughput: 150000, uploadThroughput: 75000 });
  await page.goto("/", { waitUntil: "commit" });
  const titulo = page.getByRole("heading", { name: "Servicios", level: 2 });
  await titulo.waitFor({ state: "attached" });
  expect(await page.getByRole("region", { name: "Servicios" }).locator(".tt-tarjeta").count()).toBeGreaterThan(0);
});

// Pedido de la demo del 24/10: el comparador de antes y después, arriba en la portada. El trabajo se elige en la
// Galería del panel; si el elegido se oculta, va otro con antes.
test("el trabajo elegido en la galería del panel se compara arriba en la portada", async ({ page }, info) => {
  soloEscritorio(info);
  test.setTimeout(60_000);
  const [primero, elegido] = ["Portada: pulido de prueba", "Portada: faroles de prueba"];
  const foto = (nombre: string) => ({ name: nombre, mimeType: "image/png", buffer: PNG });
  await ingresarComoDueno(page);
  await page.goto("/panel/sitio/galeria");
  const lista = page.getByRole("list", { name: "Fotos de la galería" });
  for (const descripcion of [primero, elegido]) {
    await page.getByRole("button", { name: "Subir fotos" }).click();
    await expect(page.getByRole("button", { name: "Guardar en la galería" })).toBeEnabled();
    await page.getByLabel("Archivo: Antes (opcional)").setInputFiles(foto("antes.png"));
    await page.getByLabel("Archivo: Después").setInputFiles(foto("despues.png"));
    await page.getByLabel("Servicio").selectOption({ label: "Pulido y nano cerámico" });
    await page.getByLabel("Descripción").fill(descripcion);
    await page.getByRole("button", { name: "Guardar en la galería" }).click();
    await expect(lista.getByRole("listitem").filter({ hasText: descripcion })).toHaveCount(1);
  }

  await page.getByRole("button", { name: `Mostrar en la portada: ${elegido}` }).click();
  const tarjeta = lista.getByRole("listitem").filter({ hasText: elegido });
  await expect(tarjeta.getByText("En la portada")).toBeVisible();
  // El que está en la portada no ofrece elegirlo otra vez
  await expect(page.getByRole("button", { name: `Mostrar en la portada: ${elegido}` })).toHaveCount(0);

  await page.goto("/");
  await expect(page.getByRole("img", { name: `Después: ${elegido}` })).toBeVisible();
  // La línea se mueve sola (pedido de YankoSoft del 24/10) hasta que se toca: ahí queda donde se dejó
  // Se mide la línea (la variable --corte de la caja): el deslizador queda en el medio mientras se mueve sola, para
  // que su valor no cambie bajo el lector de pantalla
  const linea = page.getByRole("slider", { name: "Comparar antes y después" });
  const despues = page.getByRole("img", { name: `Después: ${elegido}` });
  const posicion = () => despues.evaluate((img) => Number(getComputedStyle(img.closest("[style*='--corte']")!).getPropertyValue("--corte")));
  await expect.poll(posicion, { timeout: 8000 }).not.toBe(50);
  await expect(linea).toHaveValue("50");
  const caja = (await despues.boundingBox())!;
  await page.mouse.click(caja.x + caja.width * 0.3, caja.y + caja.height / 2);
  await expect.poll(async () => Number(await linea.inputValue())).toBeLessThan(40);
  const tocada = await posicion();
  await page.waitForTimeout(1500);
  expect(await posicion()).toBe(tocada);
  await expect(page.getByText(elegido, { exact: true })).toBeVisible();
  // En un celular ancho no queda un hueco entre los botones y el comparador, ni se enciman (revisión de YankoSoft, 24/10)
  const pantalla = page.viewportSize()!;
  for (const ancho of [390, 480]) {
    await page.setViewportSize({ width: ancho, height: 900 });
    const boton = page.getByRole("main").getByRole("link", { name: "Ver los servicios" });
    const despues = page.getByRole("img", { name: `Después: ${elegido}` });
    await expect(boton).toBeVisible();
    await expect(despues).toBeVisible();
    const [b, c] = [(await boton.boundingBox())!, (await despues.boundingBox())!];
    const espacio = c.y - (b.y + b.height);
    expect(espacio, `a ${ancho} px`).toBeGreaterThanOrEqual(0);
    expect(espacio, `a ${ancho} px`).toBeLessThan(60);
  }
  await page.setViewportSize(pantalla);
  // TikTok, casi tan importante como WhatsApp (pedido 35): un bloque propio, con el usuario y su botón; y en el encabezado
  // (en la computadora, junto al menú; en el celular, dentro del menú)
  const tiktok = page.getByRole("region", { name: "Mira cómo trabajamos" });
  await expect(tiktok).toContainText("@toctar.detailing");
  await expect(tiktok.getByRole("link", { name: "Ver en TikTok" })).toHaveAttribute("href", "https://www.tiktok.com/@toctar.detailing");
  await expect(page.getByRole("region", { name: "Trabajos recientes" }).getByRole("link", { name: /TikTok/ })).toHaveCount(0);
  if (info.project.name === "escritorio") {
    await expect(page.getByRole("banner").getByRole("link", { name: "TikTok", exact: true })).toHaveAttribute("href", "https://www.tiktok.com/@toctar.detailing");
  } else {
    await page.getByRole("banner").getByRole("button", { name: /menú/i }).click();
    await expect(page.getByRole("dialog").getByRole("link", { name: "Míranos en TikTok" })).toHaveAttribute("href", "https://www.tiktok.com/@toctar.detailing");
    await page.keyboard.press("Escape");
  }

  // Con "reducir movimiento", no se mueve sola
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  await page.waitForTimeout(2500);
  expect(await posicion()).toBe(50);
  await page.emulateMedia({ reducedMotion: null });

  // Oculto, deja la portada: va otro trabajo con antes
  await page.goto("/panel/sitio/galeria");
  await page.getByRole("button", { name: `Ocultar: ${elegido}` }).click();
  await expect(tarjeta.getByText("Oculta")).toBeVisible();
  await page.goto("/");
  await expect(page.getByRole("slider", { name: "Comparar antes y después" })).toBeVisible();
  await expect(page.getByRole("img", { name: `Después: ${elegido}` })).toHaveCount(0);

  // Al ocultarlo dejó de ser el elegido: mostrarlo otra vez no cambia la portada sola
  await page.goto("/panel/sitio/galeria");
  await page.getByRole("button", { name: `Mostrar: ${elegido}` }).click();
  await expect(tarjeta.getByText("Oculta")).toHaveCount(0);
  await expect(tarjeta.getByText("En la portada")).toHaveCount(0);
  await expect(page.getByRole("button", { name: `Mostrar en la portada: ${elegido}` })).toBeVisible();
});

// La cabecera de la portada no hace correr lo que se ve al llegar los datos (2B.10: la reserva de alto queda solo
// mientras carga)
test("la portada carga sin que se corra lo que ya está a la vista", async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { cls: number }).cls = 0;
    new PerformanceObserver((lista) => {
      for (const e of lista.getEntries() as unknown as { value: number; hadRecentInput: boolean }[]) {
        if (!e.hadRecentInput) (window as unknown as { cls: number }).cls += e.value;
      }
    }).observe({ type: "layout-shift", buffered: true });
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.waitForTimeout(1000);
  expect(await page.evaluate(() => (window as unknown as { cls: number }).cls)).toBeLessThan(0.05);
});
