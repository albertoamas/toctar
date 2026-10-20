import { expect, test, type TestInfo } from "@playwright/test";
import { crearClienteEnBase as crearCliente, ingresarComoDueno } from "./apoyo";

// HU-22 Buscar clientes. Especificación: docs/08-desarrollo/etapas/C1-catalogo-clientes.md §9.
// Los clientes se crean directo en la base, con datos propios de cada proyecto (celular o escritorio).

const sufijo = (info: TestInfo) => (info.project.name === "celular" ? "C" : "E");
const telefono = (info: TestInfo, n: number) => `5917${info.project.name === "celular" ? 3 : 4}0000${n}0`;

test("se busca por parte del nombre sin tildes, por teléfono parcial y por placa, mientras se escribe", async ({ page }, info) => {
  const s = sufijo(info);
  const nombre = `José Pérez Búsqueda ${s}`;
  await crearCliente({ nombre, telefono: telefono(info, 1), placa: `BUS${s}123` });
  await ingresarComoDueno(page);
  await page.goto("/panel/clientes");
  const buscador = page.getByRole("searchbox", { name: "Buscar por nombre, teléfono o placa" });
  // En el celular la lista son tarjetas; en la computadora, una tabla: se mira la que se ve
  const resultado = () => page.getByRole("link", { name: nombre }).locator("visible=true");

  // Sin tildes ni mayúsculas, sin apretar nada
  await buscador.pressSequentially(`jose perez busqueda ${s.toLowerCase()}`);
  await expect(resultado()).toBeVisible();
  await expect(page).toHaveURL(/\?q=/);
  // El campo no pierde el foco mientras llegan los resultados
  await expect(buscador).toBeFocused();

  // Parte del teléfono
  await buscador.fill(telefono(info, 1).slice(3, 8));
  await expect(resultado()).toBeVisible();

  // La placa escrita con guion y en minúsculas
  await buscador.fill(`bus-${s.toLowerCase()} 123`);
  await expect(resultado()).toBeVisible();

  // Sin resultados
  await buscador.fill("nadie se llama así zzz");
  await expect(page.getByText("No hay clientes con «nadie se llama así zzz».")).toBeVisible();

  // Borrar la búsqueda vuelve a la lista completa
  await page.getByRole("button", { name: "Borrar la búsqueda" }).click();
  await expect(buscador).toHaveValue("");
  await expect(buscador).toBeFocused();
  await expect(page).not.toHaveURL(/\?q=/);

  // La búsqueda queda en la dirección: al recargar sigue ahí
  await buscador.fill(`busqueda ${s.toLowerCase()}`);
  // Se espera la dirección: sin búsqueda la lista ya muestra a este cliente, y la recarga llegaría antes de la pausa
  await expect(page).toHaveURL(/\?q=busqueda/);
  await page.reload();
  await expect(buscador).toHaveValue(`busqueda ${s.toLowerCase()}`);
  await expect(resultado()).toBeVisible();
});

test("los desactivados no salen en la lista, pero se ven aparte", async ({ page }, info) => {
  const nombre = `Desactivado buscado ${sufijo(info)}`;
  await crearCliente({ nombre, telefono: telefono(info, 2), activo: false });
  await ingresarComoDueno(page);
  await page.goto(`/panel/clientes?q=${encodeURIComponent(nombre)}`);
  await expect(page.getByText(`No hay clientes con «${nombre}».`)).toBeVisible();
  await page.getByRole("link", { name: "Ver desactivados" }).click();
  await expect(page.getByRole("link", { name: nombre }).locator("visible=true")).toBeVisible();
  // La búsqueda se conserva al cambiar de vista
  await expect(page).toHaveURL(/q=.*ver=desactivados/);
  await page.getByRole("link", { name: "Ver los activos" }).click();
  await expect(page).not.toHaveURL(/ver=desactivados/);
  await expect(page.getByRole("searchbox", { name: "Buscar por nombre, teléfono o placa" })).toHaveValue(nombre);
});
