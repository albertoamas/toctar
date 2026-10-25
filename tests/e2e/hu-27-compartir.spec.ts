import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { consultar, crearClienteEnBase, ingresarComoDueno } from "./apoyo";

// HU-27 Compartir el PDF (flujo crítico 1). Especificación: docs/08-desarrollo/etapas/C2-consultas-cotizaciones.md §9.
// El menú de compartir del teléfono no se puede abrir en una prueba: se reemplaza navigator.share por uno que anota lo
// que recibe. En serie: las del dueño entran con el mismo usuario y, a la vez, chocaban con el límite de intentos.
test.describe.configure({ mode: "serial" });

const sufijo = (info: TestInfo) => (info.project.name === "celular" ? "C" : "E");
const telefono = (info: TestInfo, n: number) => `5917${info.project.name === "celular" ? 7 : 8}2700${n}0`;

/** Una consulta cotizada por la pantalla (así se genera su PDF). Devuelve el número de la cotización. */
async function consultaCotizada(page: Page, info: TestInfo, n: number): Promise<string> {
  const s = sufijo(info);
  const servicio = `Para compartir ${s}`;
  await consultar(
    `with sv as (
       insert into servicio (nombre, slug, resumen, orden) values ($1, $2, 'Servicio de prueba para compartir.', 99)
       on conflict do nothing returning id
     ), v as (insert into variante (servicio_id, nombre, orden) select id, 'Única', 1 from sv returning id)
     insert into precio (variante_id, tamano_id, monto, created_by)
     select v.id, (select id from tamano_vehiculo order by orden limit 1), 600, (select id from usuario where nombre_usuario = 'dueno') from v`,
    [servicio, `para-compartir-${s.toLowerCase()}`],
  );
  await crearClienteEnBase({ nombre: `Comparte ${n} ${s}`, telefono: telefono(info, n), placa: `CO27${s}${n}` });
  const [{ id }] = await consultar<{ id: number }>(
    `insert into consulta (cliente_id, vehiculo_id, canal, created_by)
     select v.cliente_id, v.id, 'whatsapp', v.created_by from vehiculo v where v.placa = $1 returning id`,
    [`CO27${s}${n}`],
  );
  await page.goto(`/panel/consultas/${id}/cotizar`);
  await page.getByRole("button", { name: "Agregar servicio" }).click();
  await page.getByLabel("Servicio 1", { exact: true }).selectOption({ label: servicio });
  await page.getByRole("button", { name: "Guardar y generar PDF" }).click();
  await expect(page).toHaveURL(/\?cotizada=\d+$/);
  const [{ numero }] = await consultar<{ numero: string }>("select numero from cotizacion where consulta_id = $1", [id]);
  return numero;
}

type Compartido = { nombre: string; tipo: string; tamano: number; inicio: string; titulo: string };

/**
 * Un navigator.share que anota lo recibido. `rechazar`: "primero", como Safari cuando pasó mucho desde el toque;
 * "siempre", como un navegador que no lo permite.
 */
async function simularCompartir(page: Page, rechazar: "nunca" | "primero" | "siempre" = "nunca") {
  await page.addInitScript((rechazar) => {
    let intentos = 0;
    const w = window as unknown as { __compartido?: unknown };
    Object.defineProperty(navigator, "canShare", { configurable: true, value: (d: ShareData) => !!d.files?.length });
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: async (d: ShareData) => {
        intentos++;
        if (rechazar === "siempre" || (rechazar === "primero" && intentos === 1)) throw new DOMException("Requiere un toque", "NotAllowedError");
        const archivo = d.files![0];
        const inicio = new TextDecoder().decode((await archivo.arrayBuffer()).slice(0, 5));
        w.__compartido = { nombre: archivo.name, tipo: archivo.type, tamano: archivo.size, inicio, titulo: d.title };
      },
    });
  }, rechazar);
}

const compartido = (page: Page) => page.evaluate(() => (window as unknown as { __compartido?: Compartido }).__compartido);

test("con el menú del teléfono, comparte el PDF con su nombre", async ({ page }, info) => {
  await simularCompartir(page);
  await ingresarComoDueno(page);
  const numero = await consultaCotizada(page, info, 1);
  await page.getByRole("button", { name: "Compartir" }).click();
  await expect.poll(() => compartido(page)).toMatchObject({
    nombre: `Cotizacion-${numero}.pdf`,
    tipo: "application/pdf",
    inicio: "%PDF-",
    titulo: `Cotización ${numero}`,
  });
  expect((await compartido(page))!.tamano).toBeGreaterThan(20_000);
  await expect(page.getByRole("button", { name: "Compartir" })).toBeEnabled();
});

test("si el teléfono pide otro toque, el segundo lo comparte", async ({ page }, info) => {
  await simularCompartir(page, "primero");
  await ingresarComoDueno(page);
  const numero = await consultaCotizada(page, info, 2);
  await page.getByRole("button", { name: "Compartir" }).click();
  await page.getByRole("button", { name: "Compartir ahora" }).click();
  await expect.poll(() => compartido(page)).toMatchObject({ nombre: `Cotizacion-${numero}.pdf`, inicio: "%PDF-" });
});

test("si el teléfono no lo permite ni al segundo toque, avisa y no queda trabado", async ({ page }, info) => {
  await simularCompartir(page, "siempre");
  await ingresarComoDueno(page);
  await consultaCotizada(page, info, 4);
  await page.getByRole("button", { name: "Compartir" }).click();
  await page.getByRole("button", { name: "Compartir ahora" }).click();
  await expect(page.getByText("No se pudo compartir el PDF. Usa «Descargar» y mándalo desde WhatsApp.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Compartir", exact: true })).toBeEnabled();
});

test("sin menú de compartir archivos, lo descarga", async ({ page }, info) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "canShare", { configurable: true, value: undefined });
    Object.defineProperty(navigator, "share", { configurable: true, value: undefined });
  });
  await ingresarComoDueno(page);
  const numero = await consultaCotizada(page, info, 3);
  const descarga = page.waitForEvent("download");
  await page.getByRole("button", { name: "Compartir" }).click();
  expect((await descarga).suggestedFilename()).toBe(`Cotizacion-${numero}.pdf`);
});
