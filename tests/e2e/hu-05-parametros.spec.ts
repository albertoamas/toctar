import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { ingresarComoDueno } from "./apoyo";

// HU-05 Parámetros del sistema. Criterios: docs/09-pruebas/criterios-entrega-1.md (5.1 a 5.5).
// Los parámetros y las listas son únicos: las pruebas que guardan corren solo en escritorio.

const soloEscritorio = (info: TestInfo) => test.skip(info.project.name !== "escritorio", "Guarda datos compartidos del negocio");

test("los parámetros vacíos o negativos muestran el error y no se guardan", async ({ page }) => {
  await ingresarComoDueno(page);
  await page.goto("/panel/configuracion");
  // Desde la portada de Configuración (pedido 26)
  await page.getByRole("navigation", { name: "Partes de la configuración" }).getByRole("link", { name: /^Parámetros/ }).click();
  await expect(page).toHaveURL(/\/panel\/configuracion\/parametros$/);
  // Por tema, en el orden del trabajo (el mantenimiento, desde el pedido 21, es de cada servicio del catálogo; la
  // consulta, desde el pedido 23, ya no existe: "Cotización sin respuesta" va en Cotizaciones)
  // (Next deja la pestaña anterior oculta en la página: se mira solo este formulario)
  const secciones = page.locator("form").filter({ has: page.getByLabel("Adelanto sugerido") }).locator("legend");
  await expect(secciones).toHaveText([/^Cotizaciones/, /^Agenda/]);

  await page.getByLabel("Adelanto sugerido").fill("-5");
  await page.getByLabel("Validez de la cotización").fill("");
  await page.getByLabel("Condiciones").fill("");
  await page.getByRole("button", { name: "Guardar cambios" }).click();

  await expect(page.getByText("Escribe un monto mayor a cero, hasta Bs 100 000.")).toBeVisible();
  await expect(page.getByText("Entre 1 y 365 días.")).toBeVisible();
  await expect(page.getByText("Escribe las condiciones: sale en el PDF de la cotización.")).toBeVisible();
  await expect(page.getByLabel("Adelanto sugerido")).toHaveValue("-5");
  // El primer error de la página recibe el foco (pulido 6.3): Cotizaciones va antes que Agenda
  await expect(page.getByLabel("Validez de la cotización")).toBeFocused();

  await page.reload();
  await expect(page.getByLabel("Adelanto sugerido")).not.toHaveValue("-5");

  // La dirección de antes de la reorganización (C5 §0) lleva a la nueva
  await page.goto("/panel/configuracion/cotizaciones");
  await expect(page).toHaveURL(/\/panel\/configuracion\/parametros$/);
});

test("el dueño cambia el adelanto y los textos del PDF, y quedan guardados", async ({ page }, info) => {
  soloEscritorio(info);
  await ingresarComoDueno(page);
  await page.goto("/panel/configuracion/parametros");

  await page.getByLabel("Adelanto sugerido").fill("250");
  await page.getByLabel("Garantía").fill("Garantía de prueba: cubre el trabajo si se siguen los cuidados.");
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByText("Cambios guardados.")).toBeVisible();

  await page.reload();
  await expect(page.getByLabel("Adelanto sugerido")).toHaveValue("250");
  // Cada servicio dice cada cuánto es su mantenimiento, en el catálogo (pedido 21)
  await expect(page.getByLabel("Aviso de mantenimiento")).toHaveCount(0);
  await expect(page.getByLabel("Garantía")).toHaveValue("Garantía de prueba: cubre el trabajo si se siguen los cuidados.");
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
