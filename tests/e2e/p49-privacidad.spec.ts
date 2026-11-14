import { expect, test, type TestInfo } from "@playwright/test";
import { ingresarComoDueno } from "./apoyo";

// Pedido 49 (docs/08-desarrollo/etapas/P49-politica-de-privacidad.md): la política de privacidad, con el texto del panel y
// los datos del negocio completados desde Configuración.

const soloEscritorio = (info: TestInfo) => test.skip(info.project.name !== "escritorio", "Cambia el texto de la página, que es uno solo");

test("la política de privacidad se lee con sus secciones y los datos del negocio ya puestos", async ({ page }) => {
  await page.goto("/privacidad");
  await expect(page.getByRole("heading", { level: 1, name: "Política de privacidad" })).toBeVisible();
  await expect(page.getByText(/^Última actualización: \d{2}\/\d{2}\/\d{4}$/)).toBeVisible();
  for (const titulo of ["Quiénes somos", "Qué datos guardamos", "Para qué los usamos", "Quién más los ve", "Cuánto tiempo los guardamos", "Cookies y lo que guarda tu navegador", "Tus derechos", "Cambios a esta política"]) {
    await expect(page.getByRole("heading", { level: 2, name: titulo })).toBeVisible();
  }
  // Los campos entre llaves, completados con Configuración: no queda ninguno a la vista
  const main = page.getByRole("main");
  await expect(main).toContainText("TocTar Detailing");
  await expect(main).not.toContainText(/\{(negocio|direccion|whatsapp|correo)\}/);
  // Las líneas con "- " son una lista
  await expect(page.getByRole("region", { name: "Qué datos guardamos" }).getByRole("listitem").first()).toContainText("tu nombre, tu teléfono y la placa");
});

test("el pie y el formulario de reclamo llevan a la política; el menú del celular no la lleva", async ({ page, isMobile }) => {
  await page.goto("/");
  await expect(page.getByRole("contentinfo").getByRole("link", { name: "Política de privacidad" })).toHaveAttribute("href", "/privacidad");
  if (isMobile) {
    await page.getByRole("banner").getByRole("button", { name: /menú/i }).click();
    await expect(page.getByRole("dialog").getByRole("link", { name: "Garantía y reclamos" })).toBeVisible();
    await expect(page.getByRole("dialog").getByRole("link", { name: "Política de privacidad" })).toHaveCount(0);
    await page.keyboard.press("Escape");
  }
  await page.goto("/garantia");
  await expect(page.getByText("Usamos tus datos para atender tu reclamo y no los compartimos con nadie.")).toBeVisible();
  await expect(page.getByRole("main").getByRole("link", { name: "Política de privacidad" })).toHaveAttribute("href", "/privacidad");
});

test("la política está en el mapa del sitio para Google", async ({ request }) => {
  const mapa = await (await request.get("/sitemap.xml")).text();
  expect(mapa).toMatch(/<loc>[^<]+\/privacidad<\/loc>/);
});

test("el dueño cambia una sección de la política en el panel, sin tocar las otras, y el sitio la muestra", async ({ page }, info) => {
  soloEscritorio(info);
  test.setTimeout(60_000);
  await ingresarComoDueno(page);
  await page.goto("/panel/sitio");
  await page.getByRole("navigation", { name: "Partes del sitio web" }).getByRole("link", { name: /^Privacidad/ }).click();
  await expect(page).toHaveURL(/\/panel\/sitio\/textos\?pagina=privacidad$/);
  // Pulido 13.60: cada sección con su "Editar" y su modal con ese texto solo (antes, un modal con los 9)
  await expect(page.getByRole("button", { name: /^Editar / })).toHaveCount(9);
  const derechos = await page.getByRole("region", { name: "Tus derechos" }).textContent();
  await page.getByRole("button", { name: "Editar cambios a esta política" }).click();
  const modal = page.getByRole("dialog", { name: "Cambios a esta política" });
  await expect(modal.getByRole("textbox")).toHaveCount(1);
  const campo = modal.getByLabel("Cambios a esta política");
  const original = await campo.inputValue();
  const nuevo = "Si cambiamos algo, lo publicamos aquí. Contáctanos en {negocio}.";
  await campo.fill(nuevo);
  await expect(campo).toHaveValue(nuevo);
  await modal.getByRole("button", { name: "Guardar sección" }).click();
  await expect(modal).toBeHidden();
  await expect(page.getByText("Cambios a esta política: cambios guardados.")).toBeVisible();
  // Las demás secciones quedan como estaban: se mira lo guardado (recargando), no lo que la pantalla tenía
  await page.reload();
  expect(await page.getByRole("region", { name: "Tus derechos" }).textContent()).toBe(derechos);

  try {
    // El sitio se renueva al guardar: se visita hasta verlo, con el nombre del negocio ya puesto
    const seccion = page.getByRole("region", { name: "Cambios a esta política" });
    await expect(async () => {
      await page.goto("/privacidad");
      await expect(seccion).toContainText("Contáctanos en TocTar Detailing.", { timeout: 1000 });
    }).toPass({ timeout: 20_000 });
  } finally {
    // Vuelve el texto de antes, también si algo falló arriba: la página es una sola para todas las pruebas
    await page.goto("/panel/sitio/textos?pagina=privacidad");
    await page.getByRole("button", { name: "Editar cambios a esta política" }).click();
    await modal.getByLabel("Cambios a esta política").fill(original);
    await modal.getByRole("button", { name: "Guardar sección" }).click();
    await expect(modal).toBeHidden();
  }
});

test("una sección vacía da su error en el modal y no se guarda", async ({ page }, info) => {
  soloEscritorio(info);
  await ingresarComoDueno(page);
  await page.goto("/panel/sitio/textos?pagina=privacidad");
  // Se habilita al cargar la página (useHidratado): un toque antes no abriría el modal
  await expect(page.getByRole("button", { name: "Editar quiénes somos" })).toBeEnabled();
  await page.getByRole("button", { name: "Editar quiénes somos" }).click();
  const modal = page.getByRole("dialog", { name: "Quiénes somos" });
  await modal.getByLabel("Quiénes somos").fill("");
  await modal.getByRole("button", { name: "Guardar sección" }).click();
  await expect(modal.getByText("Escribe quiénes son.")).toBeVisible();
  await expect(modal.getByLabel("Quiénes somos")).toBeFocused();
  await modal.getByRole("button", { name: "Cancelar" }).click();
  await expect(page.getByRole("region", { name: "Quiénes somos" })).not.toBeEmpty();
});
