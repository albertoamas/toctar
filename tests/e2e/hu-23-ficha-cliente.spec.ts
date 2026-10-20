import { expect, test, type TestInfo } from "@playwright/test";
import { crearClienteEnBase, ingresarComoDueno } from "./apoyo";

// HU-23 Ficha del cliente. Especificación: docs/08-desarrollo/etapas/C1-catalogo-clientes.md §9.
// Cada proyecto (celular o escritorio) usa sus propios teléfonos y placas.

const sufijo = (info: TestInfo) => (info.project.name === "celular" ? "C" : "E");
const telefono = (info: TestInfo, n: number) => `5917${info.project.name === "celular" ? 5 : 6}0000${n}0`;

test("en la ficha se editan los datos y se abre WhatsApp; un teléfono de otro cliente se avisa", async ({ page }, info) => {
  const s = sufijo(info);
  const otro = `Otro de la ficha ${s}`;
  await crearClienteEnBase({ nombre: otro, telefono: telefono(info, 1) });
  const id = await crearClienteEnBase({ nombre: `Ficha ${s}`, telefono: telefono(info, 2) });
  await ingresarComoDueno(page);
  await page.goto(`/panel/clientes/${id}`);

  await expect(page.getByRole("link", { name: "Escribir por WhatsApp" })).toHaveAttribute("href", `https://wa.me/${telefono(info, 2)}`);
  // Los datos vienen cargados para editar; el teléfono, sin el código de país
  await expect(page.getByLabel("WhatsApp")).toHaveValue(telefono(info, 2).slice(3));

  await page.getByLabel("Correo").fill("no es correo");
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByText("Escribe un correo válido.")).toBeVisible();
  await expect(page.getByLabel("Correo")).toBeFocused();

  await page.getByLabel("Correo").fill("ficha@example.com");
  await page.getByLabel("WhatsApp").fill(telefono(info, 1).slice(3));
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByText(`Ese número ya es de ${otro}.`)).toBeVisible();
  await expect(page.getByRole("link", { name: `Abrir la ficha de ${otro}` })).toBeVisible();

  await page.getByLabel("WhatsApp").fill(telefono(info, 2).slice(3));
  await page.getByLabel("Nombre", { exact: true }).fill(`Ficha editada ${s}`);
  await page.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(page.getByText("Cambios guardados.")).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: `Ficha editada ${s}` })).toBeVisible();
  await expect(page.getByLabel("Correo")).toHaveValue("ficha@example.com");
});

test("los vehículos se agregan, editan, desactivan y reactivan desde la ficha", async ({ page }, info) => {
  const s = sufijo(info);
  const id = await crearClienteEnBase({ nombre: `Con autos ${s}`, telefono: telefono(info, 3) });
  // Otro cliente con una placa: la de la ficha no puede repetirla
  await crearClienteEnBase({ nombre: `Dueño de la placa ${s}`, telefono: telefono(info, 4), placa: `OCU${s}1` });
  await ingresarComoDueno(page);
  await page.goto(`/panel/clientes/${id}`);
  const vehiculos = page.getByRole("list", { name: "Vehículos", exact: true });

  // Agregar
  await page.getByRole("button", { name: "Agregar vehículo" }).click();
  const nuevo = page.getByRole("form", { name: "Agregar vehículo" });
  await nuevo.getByLabel("Placa", { exact: true }).fill(`ocu-${s.toLowerCase()} 1`);
  await nuevo.getByLabel("Tamaño").selectOption({ label: "Compactos" });
  await nuevo.getByRole("button", { name: "Agregar", exact: true }).click();
  await expect(page.getByText(`La placa OCU${s}1 ya está registrada a nombre de Dueño de la placa ${s}.`)).toBeVisible();
  // Tras el error, el tamaño elegido se conserva: React reinicia el formulario y antes volvía a "Elige el tamaño"
  await expect(nuevo.getByLabel("Tamaño")).not.toHaveValue("");
  await nuevo.getByLabel("Placa", { exact: true }).fill(`FIC${s}1`);
  await nuevo.getByRole("button", { name: "Agregar", exact: true }).click();
  await expect(page.getByText(`Vehículo FIC${s}1 agregado.`)).toBeVisible();
  await expect(vehiculos).toContainText(`FIC${s}1`);

  // Editar
  await page.getByRole("button", { name: `Editar FIC${s}1` }).click();
  const edicion = page.getByRole("form", { name: `Editar FIC${s}1` });
  await edicion.getByLabel("Color").fill("Rojo");
  await edicion.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(vehiculos).toContainText("Rojo");

  // Desactivar desde la edición y reactivar
  await page.getByRole("button", { name: `Editar FIC${s}1` }).click();
  await page.getByRole("button", { name: `Desactivar FIC${s}1` }).click();
  await expect(page.getByRole("list", { name: "Vehículos desactivados" })).toContainText(`FIC${s}1`);
  await page.getByRole("button", { name: `Reactivar FIC${s}1` }).click();
  await expect(vehiculos).toContainText(`FIC${s}1`);
});

test("un cliente se desactiva con confirmación, deja de salir en la lista y se reactiva", async ({ page }, info) => {
  const nombre = `Para desactivar ${sufijo(info)}`;
  const id = await crearClienteEnBase({ nombre, telefono: telefono(info, 5) });
  await ingresarComoDueno(page);
  await page.goto(`/panel/clientes/${id}`);

  await page.getByRole("button", { name: "Desactivar cliente" }).click();
  // El foco va a la confirmación, que el lector de pantalla lee
  await expect(page.getByText("deja de salir en la lista")).toBeFocused();
  await page.getByRole("button", { name: "Sí, desactivar" }).click();
  await expect(page.getByText("Cliente desactivado.")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 }).locator("..")).toContainText("Desactivado");

  await page.goto(`/panel/clientes?q=${encodeURIComponent(nombre)}`);
  await expect(page.getByText(`No hay clientes con «${nombre}».`)).toBeVisible();

  await page.goto(`/panel/clientes/${id}`);
  await page.getByRole("button", { name: "Reactivar cliente" }).click();
  await expect(page.getByText("Cliente reactivado.")).toBeVisible();
  await page.goto(`/panel/clientes?q=${encodeURIComponent(nombre)}`);
  await expect(page.getByRole("link", { name: nombre }).locator("visible=true")).toBeVisible();
});
