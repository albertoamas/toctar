import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { ingresarComoDueno } from "./apoyo";

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
  // Una ficha con tres partes, cada una en su modal (pulido 13.29)
  await expect(page.getByRole("main").getByRole("heading", { level: 2 })).toHaveText(["Plazos de las cotizaciones", "Textos del PDF", "Agenda"]);
  await expect(page.getByRole("region", { name: "Agenda" })).toContainText("Adelanto sugerido");

  const plazos = await abrir(page, "Plazos de las cotizaciones");
  await plazos.getByLabel("Validez de la cotización").fill("");
  await plazos.getByRole("button", { name: "Guardar plazos" }).click();
  await expect(plazos.getByText("Entre 1 y 365 días.")).toBeVisible();
  // El error recibe el foco (pulido 6.3)
  await expect(plazos.getByLabel("Validez de la cotización")).toBeFocused();
  await plazos.getByRole("button", { name: "Cancelar" }).click();

  const pdf = await abrir(page, "Textos del PDF");
  await pdf.getByLabel("Condiciones").fill("");
  await pdf.getByRole("button", { name: "Guardar textos del PDF" }).click();
  await expect(pdf.getByText("Escribe las condiciones: sale en el PDF de la cotización.")).toBeVisible();
  await pdf.getByRole("button", { name: "Cancelar" }).click();

  const agenda = await abrir(page, "Agenda");
  await agenda.getByLabel("Adelanto sugerido").fill("-5");
  await agenda.getByRole("button", { name: "Guardar agenda" }).click();
  await expect(agenda.getByText("Escribe un monto mayor a cero, hasta Bs 100 000.")).toBeVisible();
  await expect(agenda.getByLabel("Adelanto sugerido")).toHaveValue("-5");
  await agenda.getByRole("button", { name: "Cancelar" }).click();

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

const activos = (page: Page) => page.getByRole("list", { name: "Espacios del taller activos" });

/** "Desactivar" va al pie del modal de cada espacio (pulido 13.27): tocar la fila lo abre. */
async function desactivar(page: Page, nombre: string) {
  await page.getByRole("button", { name: `Editar ${nombre}` }).click();
  await page.getByRole("dialog", { name: "Editar espacio" }).getByRole("button", { name: `Desactivar ${nombre}` }).click();
}

test("espacios del taller: agregar, renombrar, ordenar y desactivar; el último activo no se desactiva", async ({ page }, info) => {
  soloEscritorio(info);
  await ingresarComoDueno(page);
  await page.goto("/panel/configuracion/taller");

  // Los datos iniciales: 3 espacios y 5 tamaños
  await expect(activos(page).getByRole("listitem")).toHaveCount(3);
  await expect(page.getByRole("list", { name: "Tamaños de vehículo activos" }).getByRole("listitem")).toHaveCount(5);

  // Agregar, en su modal (pulido 13.27); un nombre repetido se rechaza
  await page.getByRole("button", { name: "Agregar espacio" }).click();
  const nuevo = page.getByRole("dialog", { name: "Nuevo espacio" });
  await nuevo.getByLabel("Nombre del espacio").fill("espacio 1");
  await nuevo.getByRole("button", { name: "Agregar espacio" }).click();
  await expect(nuevo.getByText("Ya existe un espacio con ese nombre.")).toBeVisible();
  await nuevo.getByLabel("Nombre del espacio").fill("Box nuevo");
  await nuevo.getByRole("button", { name: "Agregar espacio" }).click();
  await expect(page.getByText("Box nuevo agregado.")).toBeVisible();
  await expect(nuevo).toHaveCount(0);
  await expect(activos(page).getByRole("listitem")).toHaveCount(4);

  // Renombrar: tocar la fila abre su modal
  await page.getByRole("button", { name: "Editar Box nuevo" }).click();
  const editar = page.getByRole("dialog", { name: "Editar espacio" });
  await editar.getByLabel("Nombre del espacio").fill("Box 4");
  await editar.getByRole("button", { name: "Guardar espacio" }).click();
  await expect(editar).toHaveCount(0);
  await expect(activos(page).getByRole("listitem").last()).toContainText("Box 4");

  // Subir, en "Cambiar orden" de su lista
  await page.getByRole("region", { name: "Espacios del taller" }).getByRole("button", { name: "Cambiar orden" }).click();
  const orden = page.getByRole("dialog", { name: "Orden: Espacios del taller" });
  await orden.getByRole("button", { name: "Subir Box 4" }).click();
  await expect(orden.getByRole("listitem").nth(2)).toContainText("Box 4");
  await orden.getByRole("button", { name: "Listo" }).click();
  await expect(activos(page).getByRole("listitem").nth(2)).toContainText("Box 4");

  // Desactivar todos menos uno: el último no se puede
  for (const nombre of ["Espacio 1", "Espacio 2", "Espacio 3"]) {
    await desactivar(page, nombre);
    await expect(page.getByText(`${nombre} desactivado.`)).toBeVisible();
  }
  await desactivar(page, "Box 4");
  await expect(page.getByText("Debe quedar al menos un espacio activo.")).toBeVisible();
  // No se desactivó: el modal sigue abierto y se cierra sin cambios
  await page.getByRole("dialog", { name: "Editar espacio" }).getByRole("button", { name: "Cancelar" }).click();
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
