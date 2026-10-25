import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { consultar, crearClienteEnBase, crearUsuario, ingresar } from "./apoyo";

// HU-28 Seguimiento de consultas. Especificación: docs/08-desarrollo/etapas/C2-consultas-cotizaciones.md §9.
// Cada proyecto (celular o escritorio) usa sus propios clientes; las consultas se crean directo en la base.

const sufijo = (info: TestInfo) => (info.project.name === "celular" ? "c" : "e");
const telefono = (info: TestInfo, n: number) => `5917${info.project.name === "celular" ? 9 : 6}2800${n}0`;

/** Un encargado por prueba: con el mismo usuario a la vez, el límite de intentos de ingreso (RNF-04) las frenaba. */
async function ingresarComoEncargado(page: Page, info: TestInfo, n: number) {
  const usuario = `enc-hu28-${n}-${sufijo(info)}`;
  await crearUsuario({ usuario, nombre: "Encargado de seguimiento", contrasena: "encargado-123", rol: "encargado", permisos: ["consultas"] });
  await ingresar(page, usuario, "encargado-123");
  await expect(page).toHaveURL(/\/panel$/);
}

/** Crea una consulta con su último movimiento hace `dias` días. Devuelve su id. */
async function crearConsulta(datos: { cliente: string; telefono: string; placa: string; dias: number; estado?: string }): Promise<number> {
  await crearClienteEnBase({ nombre: datos.cliente, telefono: datos.telefono, placa: datos.placa });
  const [{ id }] = await consultar<{ id: number }>(
    `insert into consulta (cliente_id, vehiculo_id, canal, estado, motivo_perdida, ultimo_movimiento_at, created_by)
     select v.cliente_id, v.id, 'whatsapp', $2, case when $2 = 'perdido' then 'precio' end, now() - make_interval(days => $3::int), v.created_by
     from vehiculo v where v.placa = $1 returning id`,
    [datos.placa, datos.estado ?? "consulto", datos.dias],
  );
  return id;
}

/** La fila (computadora) o la tarjeta (celular) de un cliente: la que se ve. */
const fila = (page: Page, cliente: string) => page.locator("tr, li").filter({ hasText: cliente }).locator("visible=true");

test("abiertas por antigüedad, con los días sin movimiento; las que se enfrían se resaltan", async ({ page }, info) => {
  const s = sufijo(info).toUpperCase();
  await crearConsulta({ cliente: `Fría ${s}`, telefono: telefono(info, 1), placa: `SF28${s}1`, dias: 9 });
  await crearConsulta({ cliente: `Tibia ${s}`, telefono: telefono(info, 2), placa: `ST28${s}1`, dias: 3 });
  await crearConsulta({ cliente: `Nueva ${s}`, telefono: telefono(info, 3), placa: `SN28${s}1`, dias: 0 });
  await crearConsulta({ cliente: `Ya perdida ${s}`, telefono: telefono(info, 4), placa: `SP28${s}1`, dias: 2, estado: "perdido" });
  await ingresarComoEncargado(page, info, 1);
  await page.goto("/panel/consultas");

  const pestanas = page.getByRole("navigation", { name: "Consultas por estado" });
  await expect(pestanas.getByRole("link", { name: /^Abiertas \(\d+\)$/ })).toHaveAttribute("aria-current", "page");
  await expect(fila(page, `Fría ${s}`)).toContainText("Se está enfriando: hace 9 días");
  await expect(fila(page, `Tibia ${s}`)).toContainText("hace 3 días");
  await expect(fila(page, `Tibia ${s}`)).not.toContainText("enfriando");
  await expect(fila(page, `Nueva ${s}`)).toContainText("hoy");
  await expect(fila(page, `Ya perdida ${s}`)).toHaveCount(0);

  // Las más antiguas primero
  const textos = await page.locator("tr, li").locator("visible=true").allInnerTexts();
  const posicion = (nombre: string) => textos.findIndex((t) => t.includes(nombre));
  expect(posicion(`Fría ${s}`)).toBeLessThan(posicion(`Tibia ${s}`));
  expect(posicion(`Tibia ${s}`)).toBeLessThan(posicion(`Nueva ${s}`));

  await pestanas.getByRole("link", { name: /^Perdidas/ }).click();
  await expect(page).toHaveURL(/\?vista=perdidas$/);
  await expect(pestanas.getByRole("link", { name: /^Perdidas/ })).toHaveAttribute("aria-current", "page");
  await expect(fila(page, `Ya perdida ${s}`)).toContainText("hace 2 días");
  // Una perdida no se resalta, aunque lleve días
  await expect(fila(page, `Ya perdida ${s}`)).not.toContainText("enfriando");
});

test("marcar como perdida con motivo y reabrir; «Otro» pide el detalle", async ({ page }, info) => {
  const s = sufijo(info).toUpperCase();
  const id = await crearConsulta({ cliente: `Por perder ${s}`, telefono: telefono(info, 5), placa: `PP28${s}1`, dias: 4 });
  await ingresarComoEncargado(page, info, 2);
  await page.goto(`/panel/consultas/${id}`);

  await page.getByRole("button", { name: "Marcar como perdida" }).click();
  const formulario = page.getByRole("form", { name: "Marcar como perdida" });
  await formulario.getByRole("button", { name: "Marcar como perdida" }).click();
  await expect(page.getByText("Elige el motivo.")).toBeVisible();
  await expect(formulario.getByRole("radio", { name: "Precio" })).toBeFocused();

  await formulario.getByRole("radio", { name: "Otro" }).check();
  await formulario.getByRole("button", { name: "Marcar como perdida" }).click();
  await expect(formulario.locator("#detalle-error")).toHaveText("Cuenta qué pasó.");
  // Tras el error, el motivo sigue elegido y es el que se envía
  await expect(formulario.getByRole("radio", { name: "Otro" })).toBeChecked();
  await formulario.getByLabel("Detalle").fill("Lo hizo en otro taller.");
  await formulario.getByRole("button", { name: "Marcar como perdida" }).click();
  await expect(page.getByText("Marcada como perdida.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Perdida" })).toBeVisible();
  await expect(page.getByText("Lo hizo en otro taller.")).toBeVisible();
  await expect(page.getByRole("main").getByText("Perdido", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Reabrir" }).click();
  await expect(page.getByText("Consulta reabierta.")).toBeVisible();
  await expect(page.getByRole("main").getByText("Consultó", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Marcar como perdida" })).toBeVisible();
  // Reabrir cuenta como movimiento: vuelve a las abiertas como de hoy
  await page.goto("/panel/consultas");
  await expect(fila(page, `Por perder ${s}`)).toContainText("hoy");
});
