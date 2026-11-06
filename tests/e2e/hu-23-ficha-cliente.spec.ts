import { expect, test, type TestInfo } from "@playwright/test";
import { crearClienteEnBase, ingresarComoDueno } from "./apoyo";

// HU-23 Ficha del cliente. Especificación: docs/08-desarrollo/etapas/C1-catalogo-clientes.md §9.
// Cada proyecto (celular o escritorio) usa sus propios teléfonos y placas, y cada reintento los suyos: con los mismos, el
// reintento chocaba con la placa del intento anterior y nunca podía pasar.

const sufijo = (info: TestInfo) => (info.project.name === "celular" ? "C" : "E") + (info.retry ? String(info.retry) : "");
const telefono = (info: TestInfo, n: number) => `5917${info.project.name === "celular" ? 5 : 6}000${info.retry}${n}0`;

// El registro completo (red, pantalla y pasos) también del primer fallo, no solo del reintento: el color vacío al
// reabrir un vehículo recién guardado sale de vez en cuando y hace falta ver qué pasó en ese intento
// (criterio 23.7 de docs/09-pruebas/criterios-entrega-2.md).
test.use({ trace: "retain-on-failure" });

test("en la ficha los datos se leen y se editan en un modal; un teléfono de otro cliente se avisa", async ({ page }, info) => {
  const s = sufijo(info);
  const otro = `Otro de la ficha ${s}`;
  await crearClienteEnBase({ nombre: otro, telefono: telefono(info, 1) });
  const id = await crearClienteEnBase({ nombre: `Ficha ${s}`, telefono: telefono(info, 2) });
  await ingresarComoDueno(page);
  await page.goto(`/panel/clientes/${id}`, { waitUntil: "networkidle" });

  await expect(page.getByRole("link", { name: "Escribir por WhatsApp" })).toHaveAttribute("href", `https://wa.me/${telefono(info, 2)}`);
  // En lectura, solo lo que tiene valor: sin correo, no hay fila de correo
  const datos = page.getByRole("region", { name: "Datos" });
  await expect(datos).toContainText("WhatsApp");
  await expect(datos).not.toContainText("Correo");

  const editar = page.getByRole("button", { name: "Editar datos del cliente" });
  await editar.click();
  const modal = page.getByRole("dialog", { name: "Datos del cliente" });
  // Los datos vienen cargados para editar; el teléfono, sin el código de país. El foco, en el primer campo
  await expect(modal.getByLabel("Nombre", { exact: true })).toBeFocused();
  await expect(modal.getByLabel("WhatsApp")).toHaveValue(telefono(info, 2).slice(3));

  await modal.getByLabel("Correo").fill("no es correo");
  await modal.getByRole("button", { name: "Guardar datos" }).click();
  await expect(modal.getByText("Escribe un correo válido.")).toBeVisible();
  await expect(modal.getByLabel("Correo")).toBeFocused();

  await modal.getByLabel("Correo").fill("ficha@example.com");
  await modal.getByLabel("WhatsApp").fill(telefono(info, 1).slice(3));
  await modal.getByRole("button", { name: "Guardar datos" }).click();
  await expect(modal.getByText(`Ese número ya es de ${otro}.`)).toBeVisible();
  await expect(modal.getByRole("link", { name: `Abrir la ficha de ${otro}` })).toBeVisible();

  await modal.getByLabel("WhatsApp").fill(telefono(info, 2).slice(3));
  await modal.getByLabel("Nombre", { exact: true }).fill(`Ficha editada ${s}`);
  await expect(modal.getByLabel("Nombre", { exact: true })).toHaveValue(`Ficha editada ${s}`);
  await modal.getByRole("button", { name: "Guardar datos" }).click();
  await expect(page.getByText("Cambios guardados.")).toBeVisible();
  // El modal se cierra, el foco vuelve a "Editar" y la lectura muestra lo nuevo
  await expect(modal).toBeHidden();
  await expect(editar).toBeFocused();
  await expect(page.getByRole("heading", { level: 1, name: `Ficha editada ${s}` })).toBeVisible();
  await expect(datos).toContainText("ficha@example.com");
});

test("los vehículos se agregan, editan, desactivan y reactivan desde la ficha, en modales", async ({ page }, info) => {
  const s = sufijo(info);
  const id = await crearClienteEnBase({ nombre: `Con autos ${s}`, telefono: telefono(info, 3) });
  // Otro cliente con una placa: la de la ficha no puede repetirla
  await crearClienteEnBase({ nombre: `Dueño de la placa ${s}`, telefono: telefono(info, 4), placa: `OCU${s}1` });
  await ingresarComoDueno(page);
  await page.goto(`/panel/clientes/${id}`, { waitUntil: "networkidle" });
  const vehiculos = page.getByRole("list", { name: "Vehículos", exact: true });

  // Agregar
  await page.getByRole("button", { name: "Agregar vehículo" }).click();
  const nuevo = page.getByRole("dialog", { name: "Agregar vehículo" });
  await expect(nuevo.getByLabel("Placa", { exact: true })).toBeFocused();
  await nuevo.getByLabel("Placa", { exact: true }).fill(`ocu-${s.toLowerCase()} 1`);
  await nuevo.getByLabel("Tamaño").selectOption({ label: "Compactos" });
  await nuevo.getByRole("button", { name: "Agregar vehículo" }).click();
  await expect(nuevo.getByText(`La placa OCU${s}1 ya está registrada a nombre de Dueño de la placa ${s}.`)).toBeVisible();
  // Tras el error, el tamaño elegido se conserva: React reinicia el formulario y antes volvía a "Elige el tamaño"
  await expect(nuevo.getByLabel("Tamaño")).not.toHaveValue("");
  await nuevo.getByLabel("Placa", { exact: true }).fill(`FIC${s}1`);
  await nuevo.getByRole("button", { name: "Agregar vehículo" }).click();
  await expect(page.getByText(`Vehículo FIC${s}1 agregado.`)).toBeVisible();
  await expect(nuevo).toBeHidden();
  await expect(vehiculos).toContainText(`FIC${s}1`);

  // Editar: marca, modelo, año y color están plegados porque el vehículo no los tiene
  await page.getByRole("button", { name: `Editar FIC${s}1` }).click();
  const edicion = page.getByRole("dialog", { name: `Editar FIC${s}1` });
  await edicion.getByText("Agregar marca, modelo, año y color").click();
  await edicion.getByLabel("Color").fill("Rojo");
  await edicion.getByRole("button", { name: "Guardar vehículo" }).click();
  await expect(edicion).toBeHidden();
  await expect(vehiculos).toContainText("Rojo");
  // Al volver a abrirlo trae lo guardado, ya desplegado
  await page.getByRole("button", { name: `Editar FIC${s}1` }).click();
  await expect(edicion.getByLabel("Color")).toHaveValue("Rojo");

  // Desactivar desde la edición y reactivar
  await edicion.getByRole("button", { name: "Más" }).click();
  // Con la máquina muy cargada, un toque justo al abrirse el menú puede no contar: se repite mientras el menú siga abierto
  const desactivar = page.getByRole("menuitem", { name: `Desactivar FIC${s}1` });
  await expect(async () => {
    if (await desactivar.isVisible()) await desactivar.click({ timeout: 1000 });
    await expect(edicion).toBeHidden({ timeout: 2000 });
  }).toPass({ timeout: 15000 });
  await expect(page.getByRole("list", { name: "Vehículos desactivados" })).toContainText(`FIC${s}1`);
  await page.getByRole("button", { name: `Reactivar FIC${s}1` }).click();
  await expect(vehiculos).toContainText(`FIC${s}1`);
});

test("un cliente se desactiva desde «Más» con confirmación, deja de salir en la lista y se reactiva", async ({ page }, info) => {
  const nombre = `Para desactivar ${sufijo(info)}`;
  const id = await crearClienteEnBase({ nombre, telefono: telefono(info, 5) });
  await ingresarComoDueno(page);
  await page.goto(`/panel/clientes/${id}`, { waitUntil: "networkidle" });

  await page.getByRole("button", { name: "Más" }).click();
  await page.getByRole("menuitem", { name: "Desactivar cliente" }).click();
  const confirmar = page.getByRole("dialog", { name: "Desactivar cliente" });
  await expect(confirmar).toContainText("deja de salir en la lista");
  // El foco en "Cancelar": un Enter no desactiva. Al cancelar, vuelve a "Más"
  await expect(confirmar.getByRole("button", { name: "Cancelar" })).toBeFocused();
  await confirmar.getByRole("button", { name: "Cancelar" }).click();
  await expect(confirmar).toBeHidden();
  await expect(page.getByRole("button", { name: "Más" })).toBeFocused();

  await page.getByRole("button", { name: "Más" }).click();
  await page.getByRole("menuitem", { name: "Desactivar cliente" }).click();
  await confirmar.getByRole("button", { name: "Sí, desactivar" }).click();
  await expect(page.getByText("Cliente desactivado.")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 }).locator("..")).toContainText("Desactivado");
  await expect(page.getByRole("button", { name: "Más" })).toHaveCount(0);

  await page.goto(`/panel/clientes?q=${encodeURIComponent(nombre)}`);
  await expect(page.getByText(`No hay clientes con «${nombre}».`)).toBeVisible();

  await page.goto(`/panel/clientes/${id}`);
  await page.getByRole("button", { name: "Reactivar cliente" }).click();
  await expect(page.getByText("Cliente reactivado.")).toBeVisible();
  await page.goto(`/panel/clientes?q=${encodeURIComponent(nombre)}`);
  await expect(page.getByRole("link", { name: nombre })).toBeVisible();
});
