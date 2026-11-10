import { createHash } from "node:crypto";
import { expect, test, type APIRequestContext, type TestInfo } from "@playwright/test";
import { consultar, cotizarEnPantalla, crearClienteEnBase, crearUsuario, ingresar, ingresarComoDueno, PERFIL_TALLER } from "./apoyo";

// HU-26 PDF de la cotización (flujo crítico 1). Especificación: docs/08-desarrollo/etapas/P23-cotizacion-directa.md §9.
// En serie: las del dueño entran todas con el mismo usuario y, a la vez, chocaban con el límite de intentos (RNF-04).
test.describe.configure({ mode: "serial" });

const sufijo = (info: TestInfo) => (info.project.name === "celular" ? "C" : "E");
const telefono = (info: TestInfo, n: number) => `5917${info.project.name === "celular" ? 5 : 6}2600${n}0`;

/** Un servicio con precio para el primer tamaño y un cliente con su vehículo. */
async function prepararCliente(info: TestInfo, n: number): Promise<{ clienteId: number; servicio: string }> {
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
  const clienteId = await crearClienteEnBase({ nombre: `Cliente PDF ${n} ${s}`, telefono: telefono(info, n), placa: `PD26${s}${n}` });
  return { clienteId, servicio };
}

/** El PDF de una versión por su ruta (con la sesión de la página): sigue hasta el enlace firmado. */
async function bajarPdf(request: APIRequestContext, consultaId: number, id: number, descargar = false) {
  const r = await request.get(`/panel/cotizaciones/${consultaId}/pdf/${id}${descargar ? "?descargar=1" : ""}`);
  return { r, cuerpo: await r.body() };
}

const huella = (b: Buffer) => createHash("sha256").update(b).digest("hex");

test("al guardar se genera el PDF; se ve, se descarga con su nombre y una versión nueva no cambia el anterior", async ({ page }, info) => {
  const { clienteId, servicio } = await prepararCliente(info, 1);
  await ingresarComoDueno(page);
  const consultaId = await cotizarEnPantalla(page, clienteId, servicio);

  const [v1] = await consultar<{ id: number; numero: string; pdf_archivo_id: number | null }>(
    "select id, numero, pdf_archivo_id from cotizacion where consulta_id = $1",
    [consultaId],
  );
  expect(v1.pdf_archivo_id).not.toBeNull();
  await expect(page.getByRole("link", { name: "Ver PDF" })).toHaveAttribute("href", `/panel/cotizaciones/${consultaId}/pdf/${v1.id}`);

  const ver = await bajarPdf(page.request, consultaId, v1.id);
  expect(ver.r.ok()).toBe(true);
  expect(ver.r.headers()["content-type"]).toBe("application/pdf");
  expect(ver.cuerpo.subarray(0, 5).toString()).toBe("%PDF-");
  // Se abre en el navegador; "Descargar" lo baja con el número en el nombre
  expect(ver.r.headers()["content-disposition"]).toBe(`inline; filename="Cotizacion-${v1.numero}.pdf"`);
  const descarga = await bajarPdf(page.request, consultaId, v1.id, true);
  expect(descarga.r.headers()["content-disposition"]).toBe(`attachment; filename="Cotizacion-${v1.numero}.pdf"`);
  // Queda en el bucket privado (enlace firmado). Su contenido lo revisa tests/unit/pdf-cotizacion.test.ts: el texto va
  // comprimido; acá basta con que tenga las fuentes y el logo
  expect(ver.r.url()).toContain("X-Amz-Signature=");
  expect(ver.cuerpo.length).toBeGreaterThan(20_000);
  const antes = huella(ver.cuerpo);

  // Versión 2: un PDF nuevo; el de la 1 sigue igual, byte por byte (RN-02)
  await page.getByRole("button", { name: "Más" }).click();
  await page.getByRole("menuitem", { name: "Nueva versión" }).click();
  await page.getByLabel("Precio del servicio 1").filter({ visible: true }).fill("1700");
  await page.getByRole("button", { name: "Guardar versión 2" }).click();
  await expect(page).toHaveURL(/\?version=\d+$/);
  const [v2] = await consultar<{ id: number }>("select id from cotizacion where consulta_id = $1 and version = 2", [consultaId]);
  const nuevo = await bajarPdf(page.request, consultaId, v2.id);
  expect(nuevo.r.headers()["content-disposition"]).toBe(`inline; filename="Cotizacion-${v1.numero}-v2.pdf"`);
  expect(huella(nuevo.cuerpo)).not.toBe(antes);
  expect(huella((await bajarPdf(page.request, consultaId, v1.id)).cuerpo)).toBe(antes);
  // Las dos versiones muestran su PDF en la ficha
  await expect(page.getByRole("link", { name: "Ver PDF" })).toHaveCount(2);
  // Un enlace de antes del pedido 23 (/cotizaciones/<versión>/pdf) lleva al de ahora
  expect((await page.request.get(`/panel/cotizaciones/${v1.id}/pdf?descargar=1`)).headers()["content-disposition"]).toBe(`attachment; filename="Cotizacion-${v1.numero}.pdf"`);
  // Una versión pedida con otra cotización en la dirección no se encuentra (pedido 23)
  expect((await page.request.get(`/panel/cotizaciones/${consultaId + 100000}/pdf/${v1.id}`)).status()).toBe(404);
});

test("si una cotización quedó sin PDF, su ficha lo genera", async ({ page }, info) => {
  const { clienteId, servicio } = await prepararCliente(info, 2);
  await ingresarComoDueno(page);
  const consultaId = await cotizarEnPantalla(page, clienteId, servicio);
  // Como si hubiera fallado al guardar; y después le cambian el nombre al cliente
  await consultar("update cotizacion set pdf_archivo_id = null where consulta_id = $1", [consultaId]);
  await consultar("update cliente set nombre = nombre || ' (editado)' from consulta q where q.cliente_id = cliente.id and q.id = $1", [consultaId]);
  await page.goto(`/panel/cotizaciones/${consultaId}`);
  await expect(page.getByRole("link", { name: "Ver PDF" })).toHaveCount(0);
  await page.getByRole("button", { name: "Generar PDF" }).click();
  await expect(page.getByText("PDF listo.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Ver PDF" })).toBeVisible();
  // El PDF sale de lo copiado al cotizar (D-4): el nombre editado después no entra
  const [{ nombre }] = await consultar<{ nombre: string }>("select datos_documento->'cliente'->>'nombre' as nombre from cotizacion where consulta_id = $1", [consultaId]);
  expect(nombre).toBe(`Cliente PDF 2 ${sufijo(info)}`);
});

test("RN-01: el encargado sin Cotizaciones, también con el perfil Taller, no abre el PDF", async ({ page }, info) => {
  const s = sufijo(info).toLowerCase();
  // La ruta pide el permiso antes de buscar la cotización: no importa cuál sea
  const c = { id: 1, version: 1 };
  await crearUsuario({ usuario: `enc-hu26-${s}`, nombre: "Encargado", contrasena: "encargado-123", rol: "encargado", permisos: ["clientes", "agenda", "pagos"] });
  await ingresar(page, `enc-hu26-${s}`, "encargado-123");
  await expect(page).toHaveURL(/\/panel$/);
  const r = await page.request.get(`/panel/cotizaciones/${c.id}/pdf/${c.version}`);
  expect(r.url()).toMatch(/\/panel\/sin-acceso$/);
  expect((await r.body()).subarray(0, 5).toString()).not.toBe("%PDF-");

  await page.context().clearCookies();
  await crearUsuario({ usuario: `taller-hu26-${s}`, nombre: "Chico del taller", contrasena: "taller-123", rol: "encargado", permisos: PERFIL_TALLER });
  await ingresar(page, `taller-hu26-${s}`, "taller-123");
  await expect(page).toHaveURL(/\/panel$/);
  expect((await page.request.get(`/panel/cotizaciones/${c.id}/pdf/${c.version}`)).url()).toMatch(/\/panel\/sin-acceso$/);
});
