import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { crearUsuario, ingresar, ingresarComoDueno } from "./apoyo";

// HU-19 Catálogo con variantes y HU-20 Precios por tamaño y duración.
// Especificación: docs/08-desarrollo/etapas/C1-catalogo-clientes.md §9.
// Cada proyecto (celular o escritorio) trabaja sobre su propio servicio, para no pisarse al correr en paralelo.

const sufijo = (info: TestInfo) => (info.project.name === "celular" ? "C" : "E");

/** Crea un servicio desde Sitio web y devuelve su id y la dirección de su página. */
async function crearServicio(page: Page, nombre: string) {
  await page.goto("/panel/sitio/servicios/nuevo");
  await page.getByLabel("Nombre del servicio").fill(nombre);
  await page.getByLabel("Resumen").fill("Servicio de prueba del catálogo.");
  await page.getByRole("button", { name: "Crear servicio" }).click();
  await expect(page).toHaveURL(/\/panel\/sitio\/servicios\/\d+/);
  const slug = await page.getByLabel("Dirección de la página").inputValue();
  return { id: page.url().match(/servicios\/(\d+)/)![1], slug };
}

test("el dueño marca el mantenimiento, cambia la duración y desactiva un servicio, que sale del sitio", async ({ page }, info) => {
  test.setTimeout(60_000);
  const nombre = `Catálogo de prueba ${sufijo(info)}`;
  await ingresarComoDueno(page);
  const { id, slug } = await crearServicio(page, nombre);

  // Desde el menú
  await page.goto("/panel");
  if (info.project.name === "celular") await page.getByRole("button", { name: "Abrir menú" }).click();
  await page.getByRole("navigation", { name: "Panel" }).getByRole("link", { name: "Catálogo y precios" }).click();
  const lista = page.getByRole("list", { name: "Servicios del catálogo" });
  // Dato inicial: el nano cerámico genera mantenimiento (RN-08)
  await expect(lista.getByRole("link", { name: /Pulido y nano cerámico/ })).toContainText("Genera mantenimiento");
  await lista.getByRole("link", { name: new RegExp(nombre) }).click();
  await expect(page).toHaveURL(new RegExp(`/panel/catalogo/${id}$`));

  // Una duración fuera de rango se rechaza y el foco va al campo
  await page.getByLabel("Duración estimada").fill("0");
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(page.getByText("Escribe los días, de 1 a 60.")).toBeVisible();
  await expect(page.getByLabel("Duración estimada")).toBeFocused();

  await page.getByLabel("Duración estimada").fill("3");
  await page.getByText("Genera recordatorio de mantenimiento").click();
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(page.getByText("Cambios guardados.")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Duración estimada")).toHaveValue("3");
  await expect(page.getByRole("checkbox", { name: /Genera recordatorio/ })).toBeChecked();

  // Inactivo: no sale en el sitio (su página no existe) y queda marcado en el catálogo
  await page.getByText("Activo en el catálogo").click();
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(page.getByText("Cambios guardados.")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 }).locator("..")).toContainText("Inactivo");
  await page.goto(`/servicios/${slug}`);
  await expect(page.getByRole("heading", { name: "No encontramos esta página" })).toBeVisible();

  // Se reactiva: vuelve al sitio
  await page.goto(`/panel/catalogo/${id}`);
  await page.getByText("Activo en el catálogo").click();
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(page.getByText("Cambios guardados.")).toBeVisible();
  await page.goto(`/servicios/${slug}`);
  await expect(page.getByRole("heading", { level: 1, name: nombre })).toBeVisible();
});

test("las variantes se editan en el sitio web: el catálogo las muestra y enlaza ahí", async ({ page }) => {
  await ingresarComoDueno(page);
  await page.goto("/panel/catalogo");
  const fila = page.getByRole("list", { name: "Servicios del catálogo" }).getByRole("link", { name: /Pulido y nano cerámico/ });
  // Cuenta las variantes activas del servicio (datos iniciales: 1, 2, 3, 5 y 10 años)
  await expect(fila).toContainText("5 variantes");
  await fila.click();
  await expect(page.getByRole("region", { name: "Variantes" })).toContainText("5 años");
  await page.getByRole("link", { name: "Editar variantes" }).click();
  await expect(page).toHaveURL(/\/panel\/sitio\/servicios\/\d+$/);
});

test("el encargado, aun con todos sus permisos, y el técnico no entran al catálogo", async ({ page }, info) => {
  for (const rol of ["encargado", "tecnico"] as const) {
    const usuario = `${rol}-catalogo-${sufijo(info).toLowerCase()}`;
    const permisos = rol === "encargado" ? ["sitio", "reclamos", "clientes"] : [];
    await crearUsuario({ usuario, nombre: `${rol} catálogo`, contrasena: "clave-catalogo-1", rol, permisos });
    await page.context().clearCookies();
    await ingresar(page, usuario, "clave-catalogo-1");
    await expect(page).toHaveURL(/\/panel$/);
    await page.goto("/panel/catalogo");
    await expect(page).toHaveURL(/\/panel\/sin-acceso$/);
  }
});
