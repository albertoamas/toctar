import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { cancelarConCambios, consultar, ingresarComoDueno } from "./apoyo";

// HU-05 Parámetros del sistema. Criterios: docs/09-pruebas/criterios-entrega-1.md (5.1 a 5.5).
// Los parámetros y las listas son únicos: las pruebas que guardan corren solo en escritorio.

const soloEscritorio = (info: TestInfo) => test.skip(info.project.name !== "escritorio", "Guarda datos compartidos del negocio");

/** El modal de una parte de Parámetros (pulido 13.29), desde su "Editar". */
async function abrir(page: Page, parte: string) {
  await page.getByRole("button", { name: `Editar ${parte.toLowerCase()}` }).click();
  const modal = page.getByRole("dialog", { name: parte });
  await expect(modal).toBeVisible();
  return modal;
}

test("los parámetros vacíos o negativos muestran el error y no se guardan", async ({ page }) => {
  await ingresarComoDueno(page);
  await page.goto("/panel/configuracion");
  // Desde la portada de Configuración (pedido 26)
  await page.getByRole("navigation", { name: "Partes de la configuración" }).getByRole("link", { name: /^Parámetros/ }).click();
  await expect(page).toHaveURL(/\/panel\/configuracion\/parametros$/);
  // Por tema, en el orden del trabajo (el mantenimiento, desde el pedido 21, es de cada servicio del catálogo; la
  // consulta, desde el pedido 23, ya no existe: "Cotización sin respuesta" va en los plazos de las cotizaciones)
  // Una ficha con tres partes, cada una en su modal (pulido 13.29), y las categorías de gasto (pedido 16)
  await expect(page.getByRole("main").getByRole("heading", { level: 2 })).toHaveText(["Plazos de las cotizaciones", "Agenda", "Textos del PDF", "Categorías de gasto"]);
  await expect(page.getByRole("region", { name: "Agenda" })).toContainText("Adelanto sugerido");

  const plazos = await abrir(page, "Plazos de las cotizaciones");
  await plazos.getByLabel("Validez de la cotización").fill("");
  await plazos.getByRole("button", { name: "Guardar plazos" }).click();
  await expect(plazos.getByText("Entre 1 y 365 días.")).toBeVisible();
  // El error recibe el foco (pulido 6.3)
  await expect(plazos.getByLabel("Validez de la cotización")).toBeFocused();
  await cancelarConCambios(page, plazos);

  const pdf = await abrir(page, "Textos del PDF");
  await pdf.getByLabel("Condiciones").fill("");
  await pdf.getByRole("button", { name: "Guardar textos del PDF" }).click();
  await expect(pdf.getByText("Escribe las condiciones: sale en el PDF de la cotización.")).toBeVisible();
  await cancelarConCambios(page, pdf);

  const agenda = await abrir(page, "Agenda");
  await agenda.getByLabel("Adelanto sugerido").fill("-5");
  await agenda.getByRole("button", { name: "Guardar agenda" }).click();
  await expect(agenda.getByText("Escribe un monto mayor a cero, hasta Bs 100 000.")).toBeVisible();
  await expect(agenda.getByLabel("Adelanto sugerido")).toHaveValue("-5");
  await cancelarConCambios(page, agenda);

  // Nada se guardó: cada parte sigue con su valor
  await page.reload();
  await expect(page.getByRole("region", { name: "Agenda" })).not.toContainText("-5");
  await expect(page.getByRole("region", { name: "Plazos de las cotizaciones" })).toContainText(/Validez de la cotización\s*\d+ días/);
  await expect(page.getByRole("region", { name: "Textos del PDF" })).toContainText(/Condiciones\s*\S+/);

  // La dirección de antes de la reorganización (C5 §0) lleva a la nueva
  await page.goto("/panel/configuracion/cotizaciones");
  await expect(page).toHaveURL(/\/panel\/configuracion\/parametros$/);
});

test("el dueño cambia el adelanto y los textos del PDF, y quedan guardados", async ({ page }, info) => {
  soloEscritorio(info);
  await ingresarComoDueno(page);
  await page.goto("/panel/configuracion/parametros");

  // Cada parte se guarda sola
  const agenda = await abrir(page, "Agenda");
  await agenda.getByLabel("Adelanto sugerido").fill("250");
  await agenda.getByRole("button", { name: "Guardar agenda" }).click();
  await expect(page.getByText("Agenda guardada.")).toBeVisible();
  const pdf = await abrir(page, "Textos del PDF");
  await pdf.getByLabel("Garantía").fill("Garantía de prueba: cubre el trabajo si se siguen los cuidados.");
  await pdf.getByRole("button", { name: "Guardar textos del PDF" }).click();
  await expect(page.getByText("Textos del PDF guardados.")).toBeVisible();

  await page.reload();
  await expect(page.getByRole("region", { name: "Agenda" })).toContainText("250 Bs");
  await expect(page.getByRole("region", { name: "Textos del PDF" })).toContainText("Garantía de prueba: cubre el trabajo si se siguen los cuidados.");
  // Cada servicio dice cada cuánto es su mantenimiento, en el catálogo (pedido 21)
  await expect(page.getByText("Aviso de mantenimiento")).toHaveCount(0);
});

test("los lugares del taller: un número de 1 a 50 (pedido 55)", async ({ page }, info) => {
  soloEscritorio(info);
  await ingresarComoDueno(page);
  await page.goto("/panel/configuracion/taller");
  const [{ lugares }] = await consultar<{ lugares: number }>("select lugares from sucursal order by id limit 1");
  const seccion = page.getByRole("region", { name: "Lugares en el taller" });
  await expect(seccion).toContainText(String(lugares));
  // Sin lista de espacios
  await expect(page.getByRole("list", { name: /^Espacios del taller/ })).toHaveCount(0);
  await expect(page.getByRole("list", { name: "Tamaños de vehículo activos" }).getByRole("listitem")).toHaveCount(5);

  await page.getByRole("button", { name: "Editar lugares en el taller" }).click();
  const modal = page.getByRole("dialog", { name: "Lugares en el taller" });
  await modal.getByLabel("Lugares en el taller").fill("0");
  await modal.getByRole("button", { name: "Guardar lugares" }).click();
  await expect(modal.getByText("Al menos 1 lugar.")).toBeVisible();
  // El mismo valor que tenía: las demás pruebas corren a la vez y cuentan con él
  await modal.getByLabel("Lugares en el taller").fill(String(lugares));
  await modal.getByRole("button", { name: "Guardar lugares" }).click();
  await expect(page.getByText("Lugares guardados.")).toBeVisible();
  await expect(modal).toHaveCount(0);
});
