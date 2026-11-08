import { expect, test, type Page } from "@playwright/test";
import { abrirWhatsApp, consultar, crearClienteEnBase, crearOrdenLista, crearUsuario, ingresar, ingresarComoDueno } from "./apoyo";

// HU-40 Plantillas de WhatsApp. Especificación: docs/08-desarrollo/etapas/C5-cierre-entrega-2.md §9.
// El mensaje de "listo" es uno solo para todas las pruebas, que corren en paralelo: la que lo cambia corre solo en
// escritorio y conserva el texto original con una frase más al final, así hu-35 y el flujo del taller (que buscan partes
// del mensaje) siguen valiendo mientras tanto. La orden va en días propios (1200), lejos de las otras pruebas.

const ORIGINAL = "Hola {nombre}, tu {vehiculo} ya está listo en {negocio}. {saldo} Te esperamos en el taller.";
const CAMBIADO = `${ORIGINAL} ¡Gracias por elegirnos!`;

/** El modal de un mensaje (pulido 13.28), ya hidratado: tocar un campo o escribir antes de eso se perdería. */
async function abrirMensaje(page: Page, titulo: string) {
  await page.goto("/panel/configuracion/mensajes", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: `Editar mensaje: ${titulo}` }).click();
  const modal = page.getByRole("dialog", { name: titulo });
  await expect(modal.getByRole("button", { name: "Agregar {nombre} al mensaje" })).toBeEnabled();
  return modal;
}

test("el dueño cambia el mensaje de listo, lo ve como le llega y el aviso de la orden lo usa; después vuelve al original", async ({ page }, info) => {
  test.skip(info.project.name === "celular", "El mensaje es uno solo: lo cambia una sola prueba (escritorio).");
  // Datos propios de cada intento: si el CI la reintenta, no choca con lo que dejó el anterior
  const placa = `PL40E${info.retry}`;
  await crearClienteEnBase({ nombre: "Marta Vaca", telefono: `5917640001${info.retry}`, placa });
  const id = await crearOrdenLista({ placa, espacio: 0, dias: 1200 + info.retry, precio: 500, pagado: 100 });
  // Empieza y termina con el original, aunque falle a mitad: las otras pruebas leen el mismo mensaje
  await consultar("delete from plantilla_mensaje where clave = 'listo'");
  try {
    await cambiarYVolver(page, id, placa);
  } finally {
    await consultar("delete from plantilla_mensaje where clave = 'listo'");
  }
});

async function cambiarYVolver(page: Page, id: number, placa: string) {
  await ingresarComoDueno(page);
  const listo = await abrirMensaje(page, "Vehículo listo");
  const texto = listo.getByLabel("Mensaje", { exact: true });
  await expect(texto).toHaveValue(ORIGINAL);
  await expect(listo.getByRole("button", { name: "Volver al texto original" })).toBeDisabled();

  // Un campo que no es de este mensaje no se guarda
  await texto.fill("Hola {precio}");
  await listo.getByRole("button", { name: "Guardar" }).click();
  await expect(listo.getByText("{precio} no es un campo de este mensaje. Usa: {nombre}, {vehiculo}, {negocio}, {saldo}.")).toBeVisible();
  await expect(texto).toHaveAttribute("aria-invalid", "true");
  expect(await consultar("select 1 from plantilla_mensaje")).toEqual([]);

  // La vista previa lo muestra con datos de ejemplo
  await texto.fill(CAMBIADO);
  await expect(listo.getByText(/Saldo pendiente: 350 Bs\. Te esperamos en el taller\. ¡Gracias por elegirnos!$/)).toBeVisible();
  await listo.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByText("Mensaje guardado.")).toBeVisible();
  // Guardar cierra el modal; la ficha lo muestra como le llega
  await expect(listo).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Vehículo listo" })).toContainText("¡Gracias por elegirnos!");
  expect(await consultar<{ texto: string }>("select texto from plantilla_mensaje where clave = 'listo'")).toEqual([{ texto: CAMBIADO }]);

  // El aviso de la orden lo usa
  await page.goto(`/panel/ordenes/${id}`);
  const enlace = await abrirWhatsApp(page, page.getByRole("button", { name: "Avisar por WhatsApp" }));
  expect(enlace).toContain(`Hola Marta, tu vehículo (placa ${placa}) ya está listo en`);
  expect(enlace).toContain("Saldo pendiente: 400 Bs. Te esperamos en el taller. ¡Gracias por elegirnos!");

  // Volver al texto original borra el cambio
  const otraVez = await abrirMensaje(page, "Vehículo listo");
  await expect(otraVez.getByLabel("Mensaje", { exact: true })).toHaveValue(CAMBIADO);
  await otraVez.getByRole("button", { name: "Volver al texto original" }).click();
  await expect(page.getByText("Volvió el texto original.")).toBeVisible();
  await expect(otraVez.getByLabel("Mensaje", { exact: true })).toHaveValue(ORIGINAL);
  expect(await consultar("select 1 from plantilla_mensaje")).toEqual([]);
}

test("tocar un campo lo agrega donde está el cursor (o al final, si no se tocó el texto), y la vista previa lo muestra", async ({ page }) => {
  await ingresarComoDueno(page);
  const saldo = await abrirMensaje(page, "Saldo pendiente");
  const texto = saldo.getByLabel("Mensaje", { exact: true });
  // Sin guardar: el mensaje guardado no cambia
  await saldo.getByRole("button", { name: "Agregar {nombre} al mensaje" }).click();
  await expect(texto).toHaveValue(/transferencia\. \{nombre\}$/);
  // El cursor se coloca en el cuadro siguiente: escribir antes pierde la selección de fill() y el texto va al final
  await expect(texto).toBeFocused();
  await texto.fill("Debes  hoy.");
  await texto.evaluate((el: HTMLTextAreaElement) => el.setSelectionRange(6, 6));
  await saldo.getByRole("button", { name: "Agregar {monto} al mensaje" }).click();
  await expect(texto).toHaveValue("Debes {monto} hoy.");
  await expect(saldo.getByText("Debes 350 Bs hoy.", { exact: true })).toBeVisible();
  await expect(saldo.getByText("Hay cambios sin guardar.")).toBeVisible();
});

test("a 360 px no se sale nada", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await ingresarComoDueno(page);
  await abrirMensaje(page, "Mantenimiento");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(360);
});

test("un encargado no entra, aunque tenga todos los demás permisos", async ({ page }, info) => {
  const usuario = `encargado-hu40-${info.project.name === "celular" ? "c" : "e"}`;
  await crearUsuario({ usuario, nombre: "Encargado", contrasena: "encargado-123", rol: "encargado", permisos: ["sitio", "reclamos", "clientes", "cotizaciones", "agenda", "ordenes", "pagos", "mantenimientos", "entrega_con_saldo"],
  });
  await ingresar(page, usuario, "encargado-123");
  await expect(page).toHaveURL(/\/panel$/);
  await page.goto("/panel/configuracion/mensajes");
  await expect(page).toHaveURL(/\/panel\/sin-acceso$/);
});
