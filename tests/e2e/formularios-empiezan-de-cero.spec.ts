import { expect, test, type Page } from "@playwright/test";
import { crearClienteEnBase, ingresarComoDueno } from "./apoyo";

// La causa del hallazgo 9 (prueba en celulares, 15/11) en las demás pantallas de crear: Next guarda oculta la última
// pantalla de cada ruta con lo que tenía escrito. Salir sin guardar y volver a entrar por el panel tiene que mostrar el
// formulario de cero, sin lo descartado. Nunca se envía nada.

/** Sale por "Volver" (el enlace de la pantalla a su lista) y descarta. */
async function salirSinGuardar(page: Page, lista: string) {
  await page.locator(`main a[href="${lista}"]`).filter({ visible: true }).first().click();
  await page.getByRole("alertdialog", { name: "¿Salir sin guardar?" }).getByRole("button", { name: "Salir sin guardar" }).click();
  await expect(page).toHaveURL(new RegExp(`${lista}$`));
}

const PANTALLAS = [
  { nombre: "Nuevo cliente", lista: "/panel/clientes", crear: "/panel/clientes/nuevo", campo: "Nombre" },
  { nombre: "Crear usuario", lista: "/panel/usuarios", crear: "/panel/usuarios/nuevo", campo: "Nombre" },
];

for (const p of PANTALLAS) {
  test(`${p.nombre}: al volver a entrar después de salir sin guardar, empieza de cero`, async ({ page }) => {
    await ingresarComoDueno(page);
    await page.goto(p.lista);
    const entrar = async () => {
      await page.locator(`main a[href="${p.crear}"]`).filter({ visible: true }).first().click();
      await expect(page).toHaveURL(new RegExp(`${p.crear}$`));
      await expect(page.getByLabel(p.campo, { exact: true })).toBeEditable();
    };
    await entrar();
    await page.getByLabel(p.campo, { exact: true }).fill("Lo que se descarta");
    await salirSinGuardar(page, p.lista);
    await entrar();
    await expect(page.getByLabel(p.campo, { exact: true })).toHaveValue("");
  });
}

test("Nueva cotización: al volver a entrar desde la ficha del cliente, los servicios empiezan de cero", async ({ page }, info) => {
  const placa = `FQ${info.project.name === "celular" ? "C" : "E"}${info.retry}A`;
  const nombre = `Cotiza Cero ${info.project.name}${info.retry}`;
  const id = await crearClienteEnBase({ nombre, telefono: `5917${info.project.name === "celular" ? 7 : 8}54${info.retry}010`, placa });
  await ingresarComoDueno(page);
  await page.goto(`/panel/clientes/${id}`);
  const entrar = async () => {
    await page.getByRole("link", { name: "Nueva cotización" }).click();
    await page.getByRole("button", { name: "Siguiente: servicios" }).click();
    await expect(page.getByLabel("Servicio 1", { exact: true })).toBeEnabled();
  };
  await entrar();
  await page.getByLabel("Servicio 1", { exact: true }).selectOption({ index: 1 });
  await expect(page.getByLabel("Servicio 1", { exact: true })).not.toHaveValue("");
  // "Volver" a la ficha del cliente, sin guardar
  await salirSinGuardar(page, `/panel/clientes/${id}`);
  await entrar();
  await expect(page.getByLabel("Servicio 1", { exact: true })).toHaveValue("");
});
