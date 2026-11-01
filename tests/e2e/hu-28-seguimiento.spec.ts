import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { consultar, crearClienteEnBase, crearCotizacionEnBase, crearUsuario, ingresar } from "./apoyo";

// Seguimiento de las cotizaciones (HU-28, pedido 23). Especificación: docs/08-desarrollo/etapas/P23-cotizacion-directa.md §9.
// Cada proyecto (celular o escritorio) usa sus propios clientes; las cotizaciones se crean directo en la base.

const sufijo = (info: TestInfo) => (info.project.name === "celular" ? "c" : "e");
const telefono = (info: TestInfo, n: number) => `5917${info.project.name === "celular" ? 9 : 6}2800${n}0`;

/** Un encargado por prueba: con el mismo usuario a la vez, el límite de intentos de ingreso (RNF-04) las frenaba. */
async function ingresarComoEncargado(page: Page, info: TestInfo, n: number) {
  const usuario = `enc-hu28-${n}-${sufijo(info)}`;
  await crearUsuario({ usuario, nombre: "Encargado de seguimiento", contrasena: "encargado-123", rol: "encargado", permisos: ["cotizaciones"] });
  await ingresar(page, usuario, "encargado-123");
  await expect(page).toHaveURL(/\/panel$/);
}

/** Un cliente con su vehículo y una cotización con su último movimiento hace `dias` días. Devuelve su id. */
async function crearCotizacion(datos: { cliente: string; telefono: string; placa: string; numero: string; dias: number; estado?: "cotizado" | "confirmado" | "perdido" }): Promise<number> {
  await crearClienteEnBase({ nombre: datos.cliente, telefono: datos.telefono, placa: datos.placa });
  return crearCotizacionEnBase(datos);
}

/** La fila de un cliente en la lista (la fila de un toque compartida). */
const filas = (page: Page) => page.getByRole("list", { name: "Cotizaciones" }).getByRole("link");
const fila = (page: Page, cliente: string) => filas(page).filter({ hasText: cliente });
const pestanas = (page: Page) => page.getByRole("navigation", { name: "Cotizaciones por estado" });

test("pendientes por antigüedad, con su total y su número; las que esperan respuesta lo dicen en un aviso", async ({ page }, info) => {
  const s = sufijo(info).toUpperCase();
  const n = info.project.name === "celular" ? "1" : "2";
  await crearCotizacion({ cliente: `Sin respuesta ${s}`, telefono: telefono(info, 1), placa: `SF28${s}1`, numero: `2040-${n}001`, dias: 9 });
  await crearCotizacion({ cliente: `Reciente ${s}`, telefono: telefono(info, 2), placa: `ST28${s}1`, numero: `2040-${n}002`, dias: 3 });
  await crearCotizacion({ cliente: `De hoy ${s}`, telefono: telefono(info, 3), placa: `SN28${s}1`, numero: `2040-${n}003`, dias: 0 });
  await crearCotizacion({ cliente: `Ya rechazada ${s}`, telefono: telefono(info, 4), placa: `SP28${s}1`, numero: `2040-${n}004`, dias: 2, estado: "perdido" });
  await ingresarComoEncargado(page, info, 1);
  await page.goto("/panel/cotizaciones");

  await expect(pestanas(page).getByRole("link", { name: /^Pendientes \(\d+\)$/ })).toHaveAttribute("aria-current", "page");
  await expect(fila(page, `Sin respuesta ${s}`)).toContainText("Sin respuesta hace 9 días");
  await expect(fila(page, `Sin respuesta ${s}`)).toContainText("500 Bs");
  await expect(fila(page, `Sin respuesta ${s}`)).toContainText(`2040-${n}001`);
  await expect(fila(page, `Reciente ${s}`)).toContainText("hace 3 días");
  await expect(fila(page, `Reciente ${s}`)).not.toContainText("Sin respuesta");
  await expect(fila(page, `De hoy ${s}`)).toContainText("hoy");
  await expect(fila(page, `Ya rechazada ${s}`)).toHaveCount(0);

  // Las que llevan más tiempo sin respuesta primero (RF-35)
  const textos = await filas(page).allInnerTexts();
  const posicion = (nombre: string) => textos.findIndex((t) => t.includes(nombre));
  expect(posicion(`Sin respuesta ${s}`)).toBeLessThan(posicion(`Reciente ${s}`));
  expect(posicion(`Reciente ${s}`)).toBeLessThan(posicion(`De hoy ${s}`));

  await pestanas(page).getByRole("link", { name: /^Rechazadas/ }).click();
  await expect(page).toHaveURL(/\?vista=rechazadas$/);
  await expect(pestanas(page).getByRole("link", { name: /^Rechazadas/ })).toHaveAttribute("aria-current", "page");
  // Una rechazada no se resalta, y la pestaña ya dice su estado: no se repite
  await expect(fila(page, `Ya rechazada ${s}`)).toContainText("hace 2 días");
  await expect(fila(page, `Ya rechazada ${s}`)).not.toContainText("Sin respuesta");
  await expect(fila(page, `Ya rechazada ${s}`)).not.toContainText("Rechazada");
});

test("se busca por placa o número, y las pestañas cuentan lo encontrado", async ({ page }, info) => {
  const s = sufijo(info).toUpperCase();
  const n = info.project.name === "celular" ? "1" : "2";
  await crearCotizacion({ cliente: `Buscada ${s}`, telefono: telefono(info, 5), placa: `BU28${s}1`, numero: `2041-${n}001`, dias: 1 });
  await crearCotizacion({ cliente: `Aceptada buscada ${s}`, telefono: telefono(info, 6), placa: `BU28${s}2`, numero: `2041-${n}002`, dias: 1, estado: "confirmado" });
  await ingresarComoEncargado(page, info, 2);
  await page.goto("/panel/cotizaciones");

  const buscador = page.getByLabel("Buscar por cliente, teléfono, placa o número");
  await buscador.fill(`bu28${s}`);
  // Se mira cuando la búsqueda ya está en la dirección (?q=)
  await expect(page).toHaveURL(new RegExp(`q=bu28${s}`));
  await expect(filas(page)).toHaveCount(1);
  await expect(fila(page, `Buscada ${s}`)).toBeVisible();
  await expect(pestanas(page).getByRole("link", { name: "Pendientes (1)" })).toBeVisible();
  await expect(pestanas(page).getByRole("link", { name: "Aceptadas (1)" })).toBeVisible();
  // La pestaña conserva la búsqueda
  await pestanas(page).getByRole("link", { name: "Aceptadas (1)" }).click();
  await expect(fila(page, `Aceptada buscada ${s}`)).toBeVisible();
  await expect(buscador).toHaveValue(`bu28${s}`);

  await buscador.fill(`2041-${n}001`);
  await expect(page).toHaveURL(new RegExp(`q=2041-${n}001`));
  await expect(page.getByText(`Ninguna cotización aceptada coincide con «2041-${n}001».`)).toBeVisible();
  await expect(pestanas(page).getByRole("link", { name: "Pendientes (1)" })).toBeVisible();
});

test("rechazar desde «Más», con motivo, y volver a pendiente; «Otro» pide el detalle", async ({ page }, info) => {
  const s = sufijo(info).toUpperCase();
  const n = info.project.name === "celular" ? "1" : "2";
  const id = await crearCotizacion({ cliente: `Por rechazar ${s}`, telefono: telefono(info, 7), placa: `PR28${s}1`, numero: `2042-${n}001`, dias: 4 });
  await ingresarComoEncargado(page, info, 3);
  await page.goto(`/panel/cotizaciones/${id}`, { waitUntil: "networkidle" });

  await page.getByRole("button", { name: "Más" }).click();
  await page.getByRole("menuitem", { name: "Rechazar" }).click();
  const formulario = page.getByRole("form", { name: "Rechazar la cotización" });
  await formulario.getByRole("button", { name: "Sí, rechazar" }).click();
  await expect(page.getByText("Elige el motivo.")).toBeVisible();
  await expect(formulario.getByRole("radio", { name: "Precio" })).toBeFocused();

  await formulario.getByRole("radio", { name: "Otro" }).check();
  await formulario.getByRole("button", { name: "Sí, rechazar" }).click();
  await expect(formulario.getByText("Cuenta qué pasó.")).toBeVisible();
  // El error está enlazado a su campo (aria-describedby), con el id único del Campo
  await expect(formulario.getByLabel("Detalle")).toHaveAccessibleDescription("Cuenta qué pasó.");
  // Tras el error, el motivo sigue elegido y es el que se envía
  await expect(formulario.getByRole("radio", { name: "Otro" })).toBeChecked();
  await formulario.getByLabel("Detalle").fill("Lo hizo en otro taller.");
  await formulario.getByRole("button", { name: "Sí, rechazar" }).click();
  await expect(page.getByText("Cotización rechazada.")).toBeVisible();
  await expect(formulario).toBeHidden();
  // El motivo, en una línea bajo el título; ya no se agenda ni se hace otra versión
  await expect(page.getByText("Rechazada: Otro. Lo hizo en otro taller.")).toBeVisible();
  await expect(page.getByRole("main").getByText("Rechazada", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Agendar" })).toHaveCount(0);

  await page.getByRole("button", { name: "Más" }).click();
  await expect(page.getByRole("menuitem", { name: "Nueva versión" })).toHaveCount(0);
  await page.getByRole("menuitem", { name: "Volver a pendiente" }).click();
  await page.getByRole("button", { name: "Sí, volver a pendiente" }).click();
  await expect(page.getByText("La cotización volvió a pendiente.")).toBeVisible();
  await expect(page.getByRole("main").getByText("Pendiente", { exact: true })).toBeVisible();
  const [c] = await consultar<{ estado: string; motivo: string | null }>("select estado, motivo_perdida as motivo from consulta where id = $1", [id]);
  expect(c).toEqual({ estado: "cotizado", motivo: null });
  // Volver a pendiente cuenta como movimiento: aparece como de hoy
  await page.goto("/panel/cotizaciones");
  await expect(fila(page, `Por rechazar ${s}`)).toContainText("hoy");
});

test("las direcciones de Consultas llevan a Cotizaciones; una consulta vieja sin cotizar no aparece", async ({ page }, info) => {
  const s = sufijo(info).toUpperCase();
  const n = info.project.name === "celular" ? "1" : "2";
  const id = await crearCotizacion({ cliente: `Con enlace viejo ${s}`, telefono: telefono(info, 8), placa: `EV28${s}1`, numero: `2043-${n}001`, dias: 1 });
  // Una consulta de antes del pedido 23, sin cotizar
  await crearClienteEnBase({ nombre: `Solo consultó ${s}`, telefono: telefono(info, 9), placa: `SC28${s}1` });
  const [vieja] = await consultar<{ id: number }>(
    `insert into consulta (cliente_id, vehiculo_id, canal, created_by) select v.cliente_id, v.id, 'whatsapp', v.created_by from vehiculo v where v.placa = $1 returning id`,
    [`SC28${s}1`],
  );
  await ingresarComoEncargado(page, info, 4);

  await page.goto("/panel/consultas");
  await expect(page).toHaveURL(/\/panel\/cotizaciones$/);
  await expect(fila(page, `Solo consultó ${s}`)).toHaveCount(0);
  await page.goto(`/panel/consultas/${id}`);
  await expect(page).toHaveURL(new RegExp(`/panel/cotizaciones/${id}$`));
  await expect(page.getByRole("heading", { level: 1, name: `Cotización 2043-${n}001` })).toBeVisible();
  await page.goto(`/panel/consultas/${id}/cotizar`);
  await expect(page).toHaveURL(new RegExp(`/panel/cotizaciones/${id}$`));
  // La vieja no es una cotización: no se encuentra, dentro del panel
  await page.goto(`/panel/cotizaciones/${vieja.id}`);
  await expect(page.getByRole("heading", { level: 1, name: "No encontramos esto" })).toBeVisible();
});
