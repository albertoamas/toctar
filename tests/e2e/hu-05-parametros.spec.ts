import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { ingresarComoDueno } from "./apoyo";

// HU-05 Parámetros del sistema. Criterios: docs/09-pruebas/criterios-entrega-1.md (5.1 a 5.5).
// Los parámetros y las listas son únicos: las pruebas que guardan corren solo en escritorio.

const soloEscritorio = (info: TestInfo) => test.skip(info.project.name !== "escritorio", "Guarda datos compartidos del negocio");

test("los parámetros vacíos o negativos muestran el error y no se guardan", async ({ page }) => {
  await ingresarComoDueno(page);
  await page.goto("/panel/configuracion");
  await page.getByRole("navigation", { name: "Secciones de configuración" }).getByRole("link", { name: "Cotizaciones y mantenimiento" }).click();
  await expect(page).toHaveURL(/\/panel\/configuracion\/cotizaciones$/);

  await page.getByLabel("Adelanto sugerido").fill("-5");
  await page.getByLabel("Validez de la cotización").fill("");
  await page.getByLabel("Condiciones").fill("");
  await page.getByRole("button", { name: "Guardar cambios" }).click();

  await expect(page.getByText("Escribe un monto mayor a cero, hasta Bs 100 000.")).toBeVisible();
  await expect(page.getByText("Entre 1 y 365 días.")).toBeVisible();
  await expect(page.getByText("Escribe las condiciones: sale en el PDF de la cotización.")).toBeVisible();
  await expect(page.getByLabel("Adelanto sugerido")).toHaveValue("-5");
  await expect(page.getByLabel("Adelanto sugerido")).toBeFocused(); // el primer error recibe el foco (pulido 6.3)

  await page.reload();
  await expect(page.getByLabel("Adelanto sugerido")).not.toHaveValue("-5");
});

test("el dueño cambia el adelanto y los textos del PDF, y quedan guardados", async ({ page }, info) => {
  soloEscritorio(info);
  await ingresarComoDueno(page);
  await page.goto("/panel/configuracion/cotizaciones");

  await page.getByLabel("Adelanto sugerido").fill("250");
  await page.getByLabel("Aviso de mantenimiento").fill("6");
  await page.getByLabel("Garantía").fill("Garantía de prueba: cubre el trabajo si se siguen los cuidados.");
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByText("Cambios guardados.")).toBeVisible();

  await page.reload();
  await expect(page.getByLabel("Adelanto sugerido")).toHaveValue("250");
  await expect(page.getByLabel("Aviso de mantenimiento")).toHaveValue("6");
  await expect(page.getByLabel("Garantía")).toHaveValue("Garantía de prueba: cubre el trabajo si se siguen los cuidados.");
});

const activos = (page: Page) => page.getByRole("list", { name: "Espacios del taller activos" });

/** "Desactivar" está dentro de la edición (pulido 6.2): se abre con el lápiz si no está abierta. */
async function desactivar(page: Page, nombre: string) {
  const boton = page.getByRole("button", { name: `Desactivar ${nombre}` });
  if (!(await boton.isVisible())) await page.getByRole("button", { name: `Editar ${nombre}` }).click();
  await boton.click();
}

test("espacios del taller: agregar, renombrar, ordenar y desactivar; el último activo no se desactiva", async ({ page }, info) => {
  soloEscritorio(info);
  await ingresarComoDueno(page);
  await page.goto("/panel/configuracion/taller");

  // Los datos iniciales: 3 espacios y 5 tamaños
  await expect(activos(page).getByRole("listitem")).toHaveCount(3);
  await expect(page.getByRole("list", { name: "Tamaños de vehículo activos" }).getByRole("listitem")).toHaveCount(5);

  // Agregar; un nombre repetido se rechaza
  await page.getByRole("button", { name: "Agregar espacio" }).click();
  await page.getByLabel("Nombre del espacio").fill("espacio 1");
  await page.getByRole("button", { name: "Agregar", exact: true }).click();
  await expect(page.getByText("Ya existe un espacio con ese nombre.")).toBeVisible();
  await page.getByLabel("Nombre del espacio").fill("Box nuevo");
  await page.getByRole("button", { name: "Agregar", exact: true }).click();
  await expect(page.getByText("Box nuevo agregado.")).toBeVisible();
  await expect(activos(page).getByRole("listitem")).toHaveCount(4);

  // Renombrar
  await page.getByRole("button", { name: "Editar Box nuevo" }).click();
  await page.getByLabel("Nombre del espacio").fill("Box 4");
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(activos(page).getByRole("listitem").last()).toContainText("Box 4");

  // Subir
  await page.getByRole("button", { name: "Subir Box 4" }).click();
  await expect(activos(page).getByRole("listitem").nth(2)).toContainText("Box 4");

  // Desactivar todos menos uno: el último no se puede
  for (const nombre of ["Espacio 1", "Espacio 2", "Espacio 3"]) {
    await desactivar(page, nombre);
    await expect(page.getByText(`${nombre} desactivado.`)).toBeVisible();
  }
  await desactivar(page, "Box 4");
  await expect(page.getByText("Debe quedar al menos un espacio activo.")).toBeVisible();
  await expect(activos(page).getByRole("listitem")).toHaveCount(1);

  // Se reactivan (no se borró nada) y se deja como estaba
  for (const nombre of ["Espacio 1", "Espacio 2", "Espacio 3"]) {
    await page.getByRole("button", { name: `Reactivar ${nombre}` }).click();
    await expect(page.getByText(`${nombre} reactivado.`)).toBeVisible();
  }
  await desactivar(page, "Box 4");
  await expect(activos(page).getByRole("listitem")).toHaveText([/Espacio 1/, /Espacio 2/, /Espacio 3/]);
  await expect(page.getByRole("list", { name: "Espacios del taller desactivados" })).toContainText("Box 4");
});
