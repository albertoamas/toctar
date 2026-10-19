import { expect, test, type Page } from "@playwright/test";
import pg from "pg";
import { PNG, URL_BASE_E2E } from "./apoyo";

// HU-16 Formulario de reclamo. Criterios: docs/09-pruebas/criterios-entrega-1.md (16.x).
// Cada proyecto usa su propia placa y la busca en la base. El reclamo en el panel se prueba en HU-17.

const foto = (nombre: string) => ({ name: nombre, mimeType: "image/png", buffer: PNG });

async function reclamosConPlaca(placa: string) {
  const cliente = new pg.Client({ connectionString: URL_BASE_E2E });
  await cliente.connect();
  try {
    const { rows } = await cliente.query<{ fotos: number }>(
      "select (select count(*)::int from reclamo_archivo ra where ra.reclamo_id = r.id) as fotos from reclamo r where placa = $1",
      [placa],
    );
    return rows;
  } finally {
    await cliente.end();
  }
}

async function llenar(page: Page, placa: string) {
  await page.getByLabel("Nombre").fill("Cliente de prueba");
  await page.getByLabel("WhatsApp", { exact: true }).fill("71234567");
  await page.getByLabel("Placa del vehículo").fill(placa);
  await page.getByLabel("Servicio (opcional)").selectOption({ label: "Polarizado de vidrios" });
  await page.getByLabel("¿Qué pasó?").fill("El polarizado se está despegando en la ventana trasera.");
}

test("se envía un reclamo con fotos y se ve la confirmación", async ({ page }, info) => {
  const placa = info.project.name === "celular" ? "HU16C01" : "HU16E01";
  await page.goto("/garantia");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await llenar(page, placa.toLowerCase());
  await page.getByLabel("Archivos de las fotos").setInputFiles([foto("uno.png"), foto("dos.png")]);
  await expect(page.getByRole("list", { name: "Fotos elegidas" }).getByRole("listitem")).toHaveCount(2);
  // Campos y "quitar foto" de 44 px para el dedo (pulido 2.8)
  for (const etiqueta of ["Nombre", "Placa del vehículo", "Servicio (opcional)"]) {
    expect((await page.getByLabel(etiqueta).boundingBox())!.height, etiqueta).toBeGreaterThanOrEqual(44);
  }
  const quitar = (await page.getByRole("button", { name: "Quitar la foto 1" }).boundingBox())!;
  expect(Math.min(quitar.width, quitar.height)).toBeGreaterThanOrEqual(44);
  await page.waitForTimeout(3000); // tiempo mínimo para llenar el formulario
  await page.getByRole("button", { name: "Enviar reclamo" }).click();
  const confirmacion = page.getByRole("status").filter({ hasText: "Recibimos tu reclamo" });
  await expect(confirmacion.getByRole("heading", { name: "Recibimos tu reclamo" })).toBeVisible();
  // La pantalla sube a la confirmación y el foco va a ella: antes quedaba tapada por el encabezado (pulido 2.8)
  await expect(confirmacion.getByRole("heading", { name: "Recibimos tu reclamo" })).toBeInViewport({ ratio: 1 });
  await expect(confirmacion).toBeFocused();
  expect(await reclamosConPlaca(placa)).toEqual([{ fotos: 2 }]);
});

test("los obligatorios vacíos muestran su error", async ({ page }) => {
  await page.goto("/garantia");
  await page.getByRole("button", { name: "Enviar reclamo" }).click();
  await expect(page.getByText("Escribe tu nombre.")).toBeVisible();
  await expect(page.getByText("Escribe los 8 dígitos de tu celular.")).toBeVisible();
  await expect(page.getByText(/Escribe la placa del vehículo/)).toBeVisible();
  await expect(page.getByText(/Cuéntanos qué pasó/)).toBeVisible();
  await expect(page.getByLabel("Nombre")).toHaveAttribute("aria-invalid", "true");
  // El foco va al primer campo con error, y al corregirlo y volver a enviar, al siguiente (pulido 2.8)
  await expect(page.getByLabel("Nombre")).toBeFocused();
  await page.getByLabel("Nombre").fill("Cliente de prueba");
  await page.getByRole("button", { name: "Enviar reclamo" }).click();
  await expect(page.getByLabel("WhatsApp", { exact: true })).toBeFocused();
  await expect(page.getByLabel("WhatsApp", { exact: true })).toBeInViewport();
});

test("con la trampa llena se ve la confirmación pero no se guarda", async ({ page }, info) => {
  const placa = info.project.name === "celular" ? "HU16C02" : "HU16E02";
  await page.goto("/garantia");
  await llenar(page, placa);
  await page.locator("#sitio_web").evaluate((el: HTMLInputElement) => (el.value = "https://spam.example"));
  await page.waitForTimeout(3000);
  await page.getByRole("button", { name: "Enviar reclamo" }).click();
  await expect(page.getByRole("heading", { name: "Recibimos tu reclamo" })).toBeVisible();
  expect(await reclamosConPlaca(placa)).toEqual([]);
});

test("el pie y la página de contacto llevan a garantía y reclamos", async ({ page }) => {
  await page.goto("/contacto");
  await expect(page.getByRole("contentinfo").getByRole("link", { name: "Garantía y reclamos" })).toHaveAttribute("href", "/garantia");
  const seccion = page.getByRole("region", { name: "¿Algo no quedó bien?" });
  await expect(seccion.getByRole("link")).toHaveAttribute("href", "/garantia");
  await seccion.getByRole("link").click();
  await expect(page).toHaveURL(/\/garantia$/, { timeout: 15_000 });
});

test("las opciones de la lista de servicios se leen sobre el fondo oscuro", async ({ page }) => {
  // Con el fondo transparente, Chrome en Windows dibujaba la lista en blanco con el texto blanco (pulido 2.8)
  await page.goto("/garantia");
  const colores = await page.getByLabel("Servicio (opcional)").locator("option").first().evaluate((o) => {
    const s = getComputedStyle(o);
    return [s.backgroundColor, s.color];
  });
  expect(colores).toEqual(["rgb(0, 0, 0)", "rgb(255, 255, 255)"]);
});
