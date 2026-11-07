import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { crearUsuario, ingresar, ingresarComoDueno, PERFIL_TALLER, PNG } from "./apoyo";

// HU-17 Atender reclamos. Criterios: docs/09-pruebas/criterios-entrega-1.md (17.x).
// Cada proyecto deja su propio reclamo por el sitio, con una IP inventada para no tocar el límite por hora de HU-16.

const foto = (nombre: string) => ({ name: nombre, mimeType: "image/png", buffer: PNG });
const sufijo = (info: TestInfo) => (info.project.name === "celular" ? "C" : "E");

async function dejarReclamo(page: Page, nombre: string, ip: string) {
  await page.setExtraHTTPHeaders({ "x-real-ip": ip });
  await page.goto("/garantia");
  await page.getByLabel("Nombre").fill(nombre);
  await page.getByLabel("WhatsApp", { exact: true }).fill("76543210");
  await page.getByLabel("Placa del vehículo").fill("3311ABC");
  await page.getByLabel("¿Qué pasó?").fill("Quedó una mancha en el tablero después del lavado interior.");
  await page.getByLabel("Archivos de las fotos").setInputFiles([foto("uno.png"), foto("dos.png")]);
  await page.waitForTimeout(3000); // tiempo mínimo para llenar el formulario (HU-16)
  await page.getByRole("button", { name: "Enviar reclamo" }).click();
  await expect(page.getByRole("heading", { name: "Recibimos tu reclamo" })).toBeVisible();
  await page.setExtraHTTPHeaders({});
}

/** El nombre del reclamo en la lista: tarjeta en el celular, tabla en la computadora. */
const enLaLista = (page: Page, nombre: string) => page.getByRole("link", { name: nombre }).locator("visible=true");

test("el dueño ve el reclamo pendiente, le escribe por WhatsApp y lo marca atendido", async ({ page }, info) => {
  test.setTimeout(60_000);
  const nombre = `Cliente reclamo ${sufijo(info)}`;
  await dejarReclamo(page, nombre, `10.17.0.${sufijo(info) === "C" ? 1 : 2}`);

  await ingresarComoDueno(page);
  // En el inicio (HU-39, pedido 26), en "Para atender": los más antiguos con su acción y, si hay más, la fila a la lista
  await expect(page.getByRole("region", { name: "Para atender" }).getByRole("link", { name: /^(Reclamo de .*Responder|\d+ reclamos pendientes más)/ }).first()).toBeVisible();
  await page.goto("/panel/reclamos?ver=pendientes");
  // La pestaña dice cuántos hay por atender (pulido 5.1)
  await expect(page.getByRole("navigation", { name: "Filtrar reclamos" }).getByRole("link", { name: /^Pendientes \(\d+\)$/ })).toBeVisible();
  if (info.project.name === "escritorio") {
    // En la tabla toda la fila abre el reclamo: se toca con el mouse donde está la placa, no el nombre (pulido 5.1;
    // pedido 26, TablaLista: la fila entera es el enlace)
    const placa = (await page.getByRole("list", { name: "Reclamos" }).getByRole("link").filter({ hasText: nombre }).locator(".tt-placa").boundingBox())!;
    await page.mouse.click(placa.x + placa.width / 2, placa.y + placa.height / 2);
  } else {
    await enLaLista(page, nombre).click();
  }

  await expect(page.getByRole("heading", { level: 1, name: nombre })).toBeVisible();
  await expect(page.getByText("Pendiente", { exact: true }).locator("visible=true")).toBeVisible();
  await expect(page.getByText("3311ABC").locator("visible=true")).toBeVisible();
  const fotos = page.getByRole("list", { name: "Fotos del reclamo" }).getByRole("button");
  await expect(fotos).toHaveCount(2);
  await fotos.first().click();
  const grande = page.getByRole("dialog").getByRole("img", { name: "Foto 1 del reclamo" });
  // Las fotos de reclamos son privadas: se ven con un enlace firmado que vence; sin la firma, no se pueden abrir.
  await expect(grande).toHaveAttribute("src", /toctar-privado\/reclamos\/[\w-]+\.webp\?.*X-Amz-Signature=/);
  const firmada = (await grande.getAttribute("src"))!;
  expect((await page.request.get(firmada)).status()).toBe(200);
  expect((await page.request.get(firmada.split("?")[0])).status()).toBe(403);
  // Se pasa a la de al lado sin cerrar: con el botón, el teclado o el dedo (pulido 13.16)
  const visor = page.getByRole("dialog", { name: "Reclamo: foto 1 de 2" });
  await expect(visor).toBeVisible();
  await expect(visor.getByRole("button", { name: "Foto anterior" })).toBeDisabled();
  await visor.getByRole("button", { name: "Foto siguiente" }).click();
  await expect(page.getByRole("dialog", { name: "Reclamo: foto 2 de 2" }).getByRole("img", { name: "Foto 2 del reclamo" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Foto siguiente" })).toBeDisabled();
  await page.keyboard.press("ArrowLeft");
  await expect(page.getByRole("dialog", { name: "Reclamo: foto 1 de 2" })).toBeVisible();
  // Deslizar hacia la izquierda, como con el dedo
  const caja = (await page.getByRole("dialog").getByRole("img", { name: "Foto 1 del reclamo" }).boundingBox())!;
  const gesto = (tipo: string, x: number) =>
    page.getByRole("dialog").getByRole("img", { name: "Foto 1 del reclamo" }).dispatchEvent(tipo, { pointerType: "touch", isPrimary: true, clientX: x, clientY: caja.y + caja.height / 2, bubbles: true });
  await gesto("pointerdown", caja.x + caja.width * 0.8);
  await gesto("pointerup", caja.x + caja.width * 0.2);
  await expect(page.getByRole("dialog", { name: "Reclamo: foto 2 de 2" })).toBeVisible();
  await page.keyboard.press("Escape");

  const whatsapp = page.getByRole("link", { name: "Escribir por WhatsApp" });
  await expect(whatsapp).toHaveAttribute("href", new RegExp(`^https://wa\\.me/59176543210\\?text=Hola%20${encodeURIComponent(nombre)}`));
  // Se ve como botón con borde, no como texto suelto
  await expect(whatsapp).not.toHaveCSS("border-top-color", "rgba(0, 0, 0, 0)");

  // La nota es obligatoria
  await page.getByRole("button", { name: "Marcar como atendido" }).click();
  await expect(page.getByText("Escribe qué se hizo, para el registro.")).toBeVisible();
  await expect(page.getByLabel("Qué se hizo")).toBeFocused(); // pulido 5.2
  await page.getByLabel("Qué se hizo").fill("Se limpió el tablero sin costo.");
  await page.getByRole("button", { name: "Marcar como atendido" }).click();
  await expect(page.getByText("Reclamo marcado como atendido.")).toBeVisible();
  await expect(page.getByText("Atendido", { exact: true }).locator("visible=true")).toBeVisible();
  await expect(page.getByText("Se limpió el tablero sin costo.").locator("visible=true")).toBeVisible();

  // Ya no está entre los pendientes, sí entre todos
  await page.goto("/panel/reclamos?ver=pendientes");
  await expect(enLaLista(page, nombre)).toHaveCount(0);
  await page.goto("/panel/reclamos");
  await expect(enLaLista(page, nombre)).toBeVisible();
});

test("el encargado entra a reclamos solo con el permiso; sin él o con el perfil Taller, no", async ({ page }, info) => {
  const s = sufijo(info).toLowerCase();
  await crearUsuario({ usuario: `enc-reclamos-${s}`, nombre: "Encargado con reclamos", contrasena: "encargado-123", rol: "encargado", permisos: ["reclamos"] });
  await crearUsuario({ usuario: `enc-sin-reclamos-${s}`, nombre: "Encargado sin reclamos", contrasena: "encargado-123", rol: "encargado" });
  await crearUsuario({ usuario: `taller-reclamos-${s}`, nombre: "Chico del taller", contrasena: "taller-123", rol: "encargado", permisos: PERFIL_TALLER });

  await ingresar(page, `enc-reclamos-${s}`, "encargado-123");
  await expect(page).toHaveURL(/\/panel$/);
  await expect(page.getByRole("heading", { name: "Para atender" })).toBeVisible();
  await page.goto("/panel/reclamos");
  await expect(page.getByRole("heading", { level: 1, name: "Reclamos" })).toBeVisible();

  for (const [usuario, contrasena] of [[`enc-sin-reclamos-${s}`, "encargado-123"], [`taller-reclamos-${s}`, "taller-123"]]) {
    await page.context().clearCookies();
    await ingresar(page, usuario, contrasena);
    await expect(page).toHaveURL(/\/panel$/);
    await expect(page.getByRole("link", { name: /reclamos/i })).toHaveCount(0);
    await page.goto("/panel/reclamos");
    await expect(page).toHaveURL(/\/panel\/sin-acceso$/);
  }
});
