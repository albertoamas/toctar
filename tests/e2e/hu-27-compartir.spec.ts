import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { consultar, cotizarEnPantalla, crearClienteEnBase, ingresarComoDueno } from "./apoyo";

// HU-27 Compartir el PDF (flujo crítico 1). Especificación: docs/08-desarrollo/etapas/P23-cotizacion-directa.md §9; desde
// el pedido 47, en el "⋯" del PDF (P47-enviar-cotizacion.md).
// El menú de compartir del teléfono no se puede abrir en una prueba: se reemplaza navigator.share por uno que anota lo
// que recibe. En serie: las del dueño entran con el mismo usuario y, a la vez, chocaban con el límite de intentos.
test.describe.configure({ mode: "serial" });

const sufijo = (info: TestInfo) => (info.project.name === "celular" ? "C" : "E");
const telefono = (info: TestInfo, n: number) => `5917${info.project.name === "celular" ? 7 : 8}2700${n}0`;

/** Una cotización hecha por la pantalla (así se genera su PDF). Devuelve su número. */
async function cotizada(page: Page, info: TestInfo, n: number): Promise<string> {
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
  const clienteId = await crearClienteEnBase({ nombre: `Comparte ${n} ${s}`, telefono: telefono(info, n), placa: `CO27${s}${n}` });
  const id = await cotizarEnPantalla(page, clienteId, servicio);
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

/** Pedido 47: compartir el archivo va en el "⋯" del PDF (lo de todos los días es "Enviar por WhatsApp"). */
async function compartirDesdeElMenu(page: Page) {
  await page.getByRole("button", { name: "Opciones del PDF" }).click();
  await page.getByRole("menuitem", { name: "Compartir el PDF" }).click();
}

test("con el menú del teléfono, comparte el PDF con su nombre", async ({ page }, info) => {
  await simularCompartir(page);
  await ingresarComoDueno(page);
  const numero = await cotizada(page, info, 1);
  await compartirDesdeElMenu(page);
  await expect.poll(() => compartido(page)).toMatchObject({
    nombre: `Cotizacion-${numero}.pdf`,
    tipo: "application/pdf",
    inicio: "%PDF-",
    titulo: `Cotización ${numero}`,
  });
  expect((await compartido(page))!.tamano).toBeGreaterThan(20_000);
  await expect(page.getByRole("button", { name: "Opciones del PDF" })).toBeEnabled();
});

test("si el teléfono pide otro toque, elegirlo de nuevo lo comparte", async ({ page }, info) => {
  await simularCompartir(page, "primero");
  await ingresarComoDueno(page);
  const numero = await cotizada(page, info, 2);
  await compartirDesdeElMenu(page);
  await expect(page.getByText("El PDF está listo: vuelve a elegir «Compartir el PDF».")).toBeVisible();
  await compartirDesdeElMenu(page);
  await expect.poll(() => compartido(page)).toMatchObject({ nombre: `Cotizacion-${numero}.pdf`, inicio: "%PDF-" });
});

test("si el teléfono no lo permite ni al segundo toque, avisa y no queda trabado", async ({ page }, info) => {
  await simularCompartir(page, "siempre");
  await ingresarComoDueno(page);
  await cotizada(page, info, 4);
  await compartirDesdeElMenu(page);
  await expect(page.getByText("El PDF está listo: vuelve a elegir «Compartir el PDF».")).toBeVisible();
  await compartirDesdeElMenu(page);
  await expect(page.getByText("No se pudo compartir el PDF. Usa «Descargar PDF» y mándalo desde WhatsApp.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Opciones del PDF" })).toBeEnabled();
});

test("sin menú de compartir archivos, lo descarga", async ({ page }, info) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "canShare", { configurable: true, value: undefined });
    Object.defineProperty(navigator, "share", { configurable: true, value: undefined });
  });
  await ingresarComoDueno(page);
  const numero = await cotizada(page, info, 3);
  const descarga = page.waitForEvent("download");
  await compartirDesdeElMenu(page);
  expect((await descarga).suggestedFilename()).toBe(`Cotizacion-${numero}.pdf`);
});
