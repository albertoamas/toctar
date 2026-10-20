import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { crearClienteEnBase, crearUsuario, ingresar, PNG } from "./apoyo";

// HU-24 Registrar consulta. Especificación: docs/08-desarrollo/etapas/C2-consultas-cotizaciones.md §9.
// Cada proyecto (celular o escritorio) usa sus propios teléfonos y placas.

const sufijo = (info: TestInfo) => (info.project.name === "celular" ? "C" : "E");
/** Local, 8 dígitos (lo que se escribe en el campo). */
const local = (info: TestInfo, n: number) => `7${info.project.name === "celular" ? 7 : 8}2400${n}0`;
const telefono = (info: TestInfo, n: number) => `591${local(info, n)}`;

/**
 * Cada prueba entra con su propio encargado (Consultas y Clientes): las de este archivo corren a la vez y, con el mismo
 * usuario, chocaban con el límite de intentos de ingreso (RNF-04), que cuenta también los ingresos en curso. No son
 * dueños: otro dueño cambiaría las pruebas de "único dueño" (HU-02).
 */
async function ingresarComoEncargado(page: Page, info: TestInfo, n: number) {
  const usuario = `enc-hu24-${n}-${sufijo(info).toLowerCase()}`;
  await crearUsuario({ usuario, nombre: "Encargado de consultas", contrasena: "encargado-123", rol: "encargado", permisos: ["consultas", "clientes"] });
  await ingresar(page, usuario, "encargado-123");
  await expect(page).toHaveURL(/\/panel$/);
}

async function registrar(page: Page) {
  await page.getByRole("button", { name: "Registrar consulta" }).click();
}

test("desde la ficha del cliente: llega elegido, con su único vehículo marcado, y la consulta queda en su ficha", async ({ page }, info) => {
  const s = sufijo(info);
  const id = await crearClienteEnBase({ nombre: `Consulta ficha ${s}`, telefono: telefono(info, 1), placa: `CF24${s}1` });
  await ingresarComoEncargado(page, info, 1);
  await page.goto(`/panel/clientes/${id}`);
  await expect(page.getByText("Todavía no tiene consultas.")).toBeVisible();

  await page.getByRole("link", { name: "Nueva consulta" }).click();
  await expect(page).toHaveURL(new RegExp(`/panel/consultas/nueva\\?cliente=${id}$`));
  await expect(page.getByRole("main").getByText(`Consulta ficha ${s}`, { exact: true }).locator("visible=true")).toBeVisible();
  await expect(page.getByRole("radio", { name: new RegExp(`CF24${s}1`) })).toBeChecked();

  // Sin canal no se registra; el foco va al error
  await registrar(page);
  await expect(page.getByText("Elige por dónde llegó la consulta.")).toBeVisible();
  await expect(page.getByRole("radio", { name: "WhatsApp" })).toBeFocused();

  await page.getByRole("radio", { name: "WhatsApp" }).check();
  await page.getByLabel("Servicio de interés").selectOption({ index: 1 });
  await page.getByLabel("Nota", { exact: true }).fill("Quiere sacar las rayas del capó antes de venderlo.");
  await registrar(page);
  await expect(page).toHaveURL(/\/panel\/consultas\/\d+\?creada=1$/);
  await expect(page.getByText(/^Consulta registrada\./)).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: `Consulta ficha ${s}` })).toBeVisible();
  await expect(page.locator("dl").locator("visible=true")).toContainText(`CF24${s}1`);
  await expect(page.getByLabel(/Qué pidió/)).toHaveValue("Quiere sacar las rayas del capó antes de venderlo.");

  // Queda en la ficha y en la lista de abiertas
  await page.getByRole("link", { name: `Consulta ficha ${s}` }).click();
  await expect(page.getByRole("heading", { level: 2, name: "Consultas" })).toBeVisible();
  await expect(page.getByRole("link", { name: `CF24${s}1` }).locator("visible=true")).toBeVisible();
  await page.goto("/panel/consultas");
  await expect(page.getByRole("link", { name: `Consulta ficha ${s}` }).locator("visible=true")).toBeVisible();
});

test("se busca al cliente, se elige y se agrega otro vehículo suyo", async ({ page }, info) => {
  const s = sufijo(info);
  await crearClienteEnBase({ nombre: `Consulta buscada ${s}`, telefono: telefono(info, 2), placa: `CB24${s}1` });
  await ingresarComoEncargado(page, info, 2);
  await page.goto("/panel/consultas");
  await page.getByRole("link", { name: "Nueva consulta" }).click();

  await page.getByLabel("Buscar por nombre, teléfono o placa").fill(`cb24${s}`);
  const elegir = page.getByRole("list", { name: "Elegir cliente" });
  await expect(elegir.getByRole("link")).toHaveCount(1);
  await elegir.getByRole("link", { name: new RegExp(`Consulta buscada ${s}`) }).click();
  await expect(page).toHaveURL(/\?cliente=\d+$/);

  await page.getByRole("radio", { name: "Otro vehículo" }).check();
  await page.getByLabel("Placa", { exact: true }).fill(`cb24-${s.toLowerCase()}2`);
  await page.getByLabel("Tamaño").selectOption({ index: 1 });
  await page.getByRole("radio", { name: "En el taller" }).check();
  await registrar(page);
  await expect(page).toHaveURL(/\/panel\/consultas\/\d+\?creada=1$/);
  const datos = page.locator("dl").locator("visible=true");
  await expect(datos).toContainText(`CB24${s}2`);
  await expect(datos).toContainText("En el taller");
  await expect(datos).toContainText("Todavía no sabe");
});

test("cliente nuevo: se registra con la consulta; un WhatsApp repetido avisa y ofrece usar a ese cliente", async ({ page }, info) => {
  const s = sufijo(info);
  const existente = await crearClienteEnBase({ nombre: `Ya registrado ${s}`, telefono: telefono(info, 3) });
  await ingresarComoEncargado(page, info, 3);
  await page.goto("/panel/consultas/nueva");
  await page.getByRole("link", { name: "Cliente nuevo" }).click();
  await expect(page.getByRole("heading", { name: "Cliente nuevo" })).toBeVisible();

  // Vacío: los errores de cliente y vehículo juntos
  await registrar(page);
  await expect(page.getByText("Escribe el nombre.")).toBeVisible();
  await expect(page.getByText("Escribe la placa.")).toBeVisible();
  await expect(page.getByLabel("Nombre", { exact: true })).toBeFocused();

  await page.getByLabel("Nombre", { exact: true }).fill(`Nuevo por consulta ${s}`);
  await page.getByRole("textbox", { name: "WhatsApp" }).fill(local(info, 3));
  await page.getByLabel("Placa", { exact: true }).fill(`CN24${s}1`);
  await page.getByLabel("Tamaño").selectOption({ index: 1 });
  await page.getByRole("radio", { name: "WhatsApp" }).check();
  await registrar(page);
  await expect(page.getByText(`Ese número ya es de Ya registrado ${s}.`)).toBeVisible();
  await expect(page.getByRole("link", { name: `Usar a Ya registrado ${s}` })).toHaveAttribute("href", `/panel/consultas/nueva?cliente=${existente}`);
  // Lo escrito se conserva tras el error, también el tamaño y el canal
  await expect(page.getByLabel("Tamaño")).not.toHaveValue("");
  await expect(page.getByRole("radio", { name: "WhatsApp" })).toBeChecked();

  await page.getByRole("textbox", { name: "WhatsApp" }).fill(local(info, 4));
  await registrar(page);
  await expect(page).toHaveURL(/\/panel\/consultas\/\d+\?creada=1$/);
  await expect(page.getByRole("heading", { level: 1, name: `Nuevo por consulta ${s}` })).toBeVisible();
  await expect(page.locator("dl").locator("visible=true")).toContainText(`CN24${s}1`);

  // El cliente quedó registrado, con su vehículo
  await page.getByRole("link", { name: `Nuevo por consulta ${s}` }).click();
  await expect(page.getByRole("list", { name: "Vehículos", exact: true })).toContainText(`CN24${s}1`);
});

test("las fotos se suben, se ven en grande y se quitan", async ({ page }, info) => {
  const s = sufijo(info);
  const id = await crearClienteEnBase({ nombre: `Con fotos ${s}`, telefono: telefono(info, 5), placa: `CP24${s}1` });
  await ingresarComoEncargado(page, info, 4);
  await page.goto(`/panel/consultas/nueva?cliente=${id}`);
  await page.getByRole("radio", { name: "WhatsApp" }).check();
  await registrar(page);
  await expect(page).toHaveURL(/\/panel\/consultas\/\d+\?creada=1$/);

  const fotos = page.getByRole("list", { name: "Fotos de la consulta" });
  await expect(page.getByRole("button", { name: "Agregar fotos" })).toBeEnabled();
  await page.getByLabel("Archivos de las fotos").setInputFiles([
    { name: "capo.png", mimeType: "image/png", buffer: PNG },
    { name: "puerta.png", mimeType: "image/png", buffer: PNG },
  ]);
  await expect(page.getByText("2 fotos agregadas.")).toBeVisible();
  await expect(fotos.getByRole("listitem")).toHaveCount(2);

  await page.getByRole("button", { name: "Ver la foto 1" }).click();
  const dialogo = page.getByRole("dialog", { name: "Foto 1 de 2" });
  await expect(dialogo.getByRole("img")).toBeVisible();
  await dialogo.getByRole("button", { name: "Quitar foto" }).click();
  await expect(page.getByText("Quitado.")).toBeVisible();
  await expect(dialogo).toBeHidden();
  await expect(fotos.getByRole("listitem")).toHaveCount(1);

  // La nota se edita
  await page.getByLabel(/Qué pidió/).fill("Mandó fotos del capó.");
  await page.getByRole("button", { name: "Guardar nota" }).click();
  await expect(page.getByText("Nota guardada.")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel(/Qué pidió/)).toHaveValue("Mandó fotos del capó.");
  await expect(fotos.getByRole("listitem")).toHaveCount(1);
});

test("el encargado con Consultas registra sin ver fichas; el técnico no entra", async ({ page }, info) => {
  const s = sufijo(info);
  const id = await crearClienteEnBase({ nombre: `Para encargado ${s}`, telefono: telefono(info, 6), placa: `CE24${s}1` });
  await crearUsuario({ usuario: `enc-consultas-${s.toLowerCase()}`, nombre: "Encargado de consultas", contrasena: "encargado-123", rol: "encargado", permisos: ["consultas"] });
  await ingresar(page, `enc-consultas-${s.toLowerCase()}`, "encargado-123");
  await expect(page).toHaveURL(/\/panel$/);
  await page.goto(`/panel/consultas/nueva?cliente=${id}`);
  await page.getByRole("radio", { name: "En el taller" }).check();
  await registrar(page);
  await expect(page).toHaveURL(/\/panel\/consultas\/\d+\?creada=1$/);
  // Sin el módulo Clientes, el nombre no enlaza a la ficha
  await expect(page.getByRole("link", { name: `Para encargado ${s}` })).toHaveCount(0);

  await page.context().clearCookies();
  await crearUsuario({ usuario: `tec-consultas-${s.toLowerCase()}`, nombre: "Técnico", contrasena: "tecnico-123", rol: "tecnico" });
  await ingresar(page, `tec-consultas-${s.toLowerCase()}`, "tecnico-123");
  await expect(page).toHaveURL(/\/panel$/);
  await page.goto("/panel/consultas");
  await expect(page).toHaveURL(/\/panel\/sin-acceso$/);
});
