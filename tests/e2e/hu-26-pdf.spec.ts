import { createHash } from "node:crypto";
import { expect, test, type APIRequestContext, type TestInfo } from "@playwright/test";
import pg from "pg";
import { crearClienteEnBase, crearUsuario, ingresar, ingresarComoDueno, URL_BASE_E2E } from "./apoyo";

// HU-26 PDF de la cotización (flujo crítico 1). Especificación: docs/08-desarrollo/etapas/C2-consultas-cotizaciones.md §9.
// En serie: las del dueño entran todas con el mismo usuario y, a la vez, chocaban con el límite de intentos (RNF-04).
test.describe.configure({ mode: "serial" });

const sufijo = (info: TestInfo) => (info.project.name === "celular" ? "C" : "E");
const telefono = (info: TestInfo, n: number) => `5917${info.project.name === "celular" ? 5 : 6}2600${n}0`;

async function consultar<T extends pg.QueryResultRow>(sql: string, valores: unknown[] = []): Promise<T[]> {
  const base = new pg.Client({ connectionString: URL_BASE_E2E });
  await base.connect();
  try {
    return (await base.query<T>(sql, valores)).rows;
  } finally {
    await base.end();
  }
}

/** Un servicio con precio para el primer tamaño y una consulta de un cliente nuevo. Devuelve la consulta. */
async function prepararConsulta(info: TestInfo, n: number): Promise<{ consultaId: number; servicio: string }> {
  const s = sufijo(info);
  const servicio = `Para PDF ${s}`;
  await consultar(
    `with sv as (
       insert into servicio (nombre, slug, resumen, orden) values ($1, $2, 'Servicio de prueba para el PDF.', 99)
       on conflict do nothing returning id
     ), v as (insert into variante (servicio_id, nombre, orden) select id, 'Única', 1 from sv returning id)
     insert into precio (variante_id, tamano_id, monto, created_by)
     select v.id, (select id from tamano_vehiculo order by orden limit 1), 1850, (select id from usuario where nombre_usuario = 'dueno') from v`,
    [servicio, `para-pdf-${s.toLowerCase()}`],
  );
  await crearClienteEnBase({ nombre: `Cliente PDF ${n} ${s}`, telefono: telefono(info, n), placa: `PD26${s}${n}` });
  const [fila] = await consultar<{ id: number }>(
    `insert into consulta (cliente_id, vehiculo_id, canal, created_by)
     select v.cliente_id, v.id, 'whatsapp', v.created_by from vehiculo v where v.placa = $1 returning id`,
    [`PD26${s}${n}`],
  );
  return { consultaId: fila.id, servicio };
}

/** El PDF de una cotización por su ruta (con la sesión de la página): sigue hasta el enlace firmado. */
async function bajarPdf(request: APIRequestContext, id: number, descargar = false) {
  const r = await request.get(`/panel/cotizaciones/${id}/pdf${descargar ? "?descargar=1" : ""}`);
  return { r, cuerpo: await r.body() };
}

const huella = (b: Buffer) => createHash("sha256").update(b).digest("hex");

test("al guardar se genera el PDF; se ve, se descarga con su nombre y una versión nueva no cambia el anterior", async ({ page }, info) => {
  const { consultaId, servicio } = await prepararConsulta(info, 1);
  await ingresarComoDueno(page);
  await page.goto(`/panel/consultas/${consultaId}/cotizar`);
  await page.getByRole("button", { name: "Agregar servicio" }).click();
  await page.getByLabel("Servicio 1", { exact: true }).selectOption({ label: servicio });
  await page.getByRole("button", { name: "Guardar y generar PDF" }).click();
  await expect(page).toHaveURL(/\?cotizada=\d+$/);

  const [v1] = await consultar<{ id: number; numero: string; pdf_archivo_id: number | null }>(
    "select id, numero, pdf_archivo_id from cotizacion where consulta_id = $1",
    [consultaId],
  );
  expect(v1.pdf_archivo_id).not.toBeNull();
  await expect(page.getByRole("link", { name: "Ver PDF" })).toHaveAttribute("href", `/panel/cotizaciones/${v1.id}/pdf`);

  const ver = await bajarPdf(page.request, v1.id);
  expect(ver.r.ok()).toBe(true);
  expect(ver.r.headers()["content-type"]).toBe("application/pdf");
  expect(ver.cuerpo.subarray(0, 5).toString()).toBe("%PDF-");
  // Se abre en el navegador; "Descargar" lo baja con el número en el nombre
  expect(ver.r.headers()["content-disposition"]).toBe(`inline; filename="Cotizacion-${v1.numero}.pdf"`);
  const descarga = await bajarPdf(page.request, v1.id, true);
  expect(descarga.r.headers()["content-disposition"]).toBe(`attachment; filename="Cotizacion-${v1.numero}.pdf"`);
  // Queda en el bucket privado (enlace firmado). Su contenido lo revisa tests/unit/pdf-cotizacion.test.ts: el texto va
  // comprimido; acá basta con que tenga las fuentes y el logo
  expect(ver.r.url()).toContain("X-Amz-Signature=");
  expect(ver.cuerpo.length).toBeGreaterThan(20_000);
  const antes = huella(ver.cuerpo);

  // Versión 2: un PDF nuevo; el de la 1 sigue igual, byte por byte (RN-02)
  await page.getByRole("link", { name: "Corregir (nueva versión)" }).click();
  await page.getByLabel("Precio del servicio 1").fill("1700");
  await page.getByRole("button", { name: "Guardar versión 2 y generar PDF" }).click();
  await expect(page).toHaveURL(/\?cotizada=\d+$/);
  const [v2] = await consultar<{ id: number }>("select id from cotizacion where consulta_id = $1 and version = 2", [consultaId]);
  const nuevo = await bajarPdf(page.request, v2.id);
  expect(nuevo.r.headers()["content-disposition"]).toBe(`inline; filename="Cotizacion-${v1.numero}-v2.pdf"`);
  expect(huella(nuevo.cuerpo)).not.toBe(antes);
  expect(huella((await bajarPdf(page.request, v1.id)).cuerpo)).toBe(antes);
  // Las dos versiones muestran su PDF en la consulta
  await expect(page.getByRole("link", { name: "Ver PDF" })).toHaveCount(2);
});

test("si una cotización quedó sin PDF, la consulta lo genera", async ({ page }, info) => {
  const { consultaId, servicio } = await prepararConsulta(info, 2);
  await ingresarComoDueno(page);
  await page.goto(`/panel/consultas/${consultaId}/cotizar`);
  await page.getByRole("button", { name: "Agregar servicio" }).click();
  await page.getByLabel("Servicio 1", { exact: true }).selectOption({ label: servicio });
  await page.getByRole("button", { name: "Guardar y generar PDF" }).click();
  await expect(page).toHaveURL(/\?cotizada=\d+$/);
  // Como si hubiera fallado al guardar
  await consultar("update cotizacion set pdf_archivo_id = null where consulta_id = $1", [consultaId]);
  await page.goto(`/panel/consultas/${consultaId}`);
  await expect(page.getByRole("link", { name: "Ver PDF" })).toHaveCount(0);
  await page.getByRole("button", { name: "Generar PDF" }).click();
  await expect(page.getByText("PDF listo.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Ver PDF" })).toBeVisible();
});

test("RN-01: el encargado y el técnico no abren el PDF", async ({ page }, info) => {
  const s = sufijo(info).toLowerCase();
  const [c] = await consultar<{ id: number }>("select id from cotizacion where pdf_archivo_id is not null order by id desc limit 1");
  await crearUsuario({ usuario: `enc-hu26-${s}`, nombre: "Encargado", contrasena: "encargado-123", rol: "encargado", permisos: ["consultas", "clientes"] });
  await ingresar(page, `enc-hu26-${s}`, "encargado-123");
  await expect(page).toHaveURL(/\/panel$/);
  const r = await page.request.get(`/panel/cotizaciones/${c.id}/pdf`);
  expect(r.url()).toMatch(/\/panel\/sin-acceso$/);
  expect((await r.body()).subarray(0, 5).toString()).not.toBe("%PDF-");

  await page.context().clearCookies();
  await crearUsuario({ usuario: `tec-hu26-${s}`, nombre: "Técnico", contrasena: "tecnico-123", rol: "tecnico" });
  await ingresar(page, `tec-hu26-${s}`, "tecnico-123");
  await expect(page).toHaveURL(/\/panel$/);
  expect((await page.request.get(`/panel/cotizaciones/${c.id}/pdf`)).url()).toMatch(/\/panel\/sin-acceso$/);
});
