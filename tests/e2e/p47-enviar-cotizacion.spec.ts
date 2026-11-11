import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { consultar, cotizarEnPantalla, crearClienteEnBase, ingresarComoDueno } from "./apoyo";

// Pedido 47: "Enviar por WhatsApp" abre el chat del cliente con el mensaje y un enlace al PDF, que se abre sin cuenta
// mientras la cotización vale. Especificación: docs/08-desarrollo/etapas/P47-enviar-cotizacion.md §9. En serie: las dos
// entran con el dueño y, a la vez, chocaban con el límite de intentos.
test.describe.configure({ mode: "serial" });

const sufijo = (info: TestInfo) => (info.project.name === "celular" ? "C" : "E");
const telefono = (info: TestInfo, n: number) => `5917${info.project.name === "celular" ? 7 : 8}4700${n}0`;

/** Una cotización hecha por la pantalla (así se genera su PDF). Devuelve su consulta y su teléfono. */
async function cotizada(page: Page, info: TestInfo, n: number) {
  const s = sufijo(info);
  const servicio = `Para enviar ${s}`;
  await consultar(
    `with sv as (
       insert into servicio (nombre, slug, resumen, orden) values ($1, $2, 'Servicio de prueba para enviar.', 99)
       on conflict do nothing returning id
     ), v as (insert into variante (servicio_id, nombre, orden) select id, 'Única', 1 from sv returning id)
     insert into precio (variante_id, tamano_id, monto, created_by)
     select v.id, (select id from tamano_vehiculo order by orden limit 1), 700, (select id from usuario where nombre_usuario = 'dueno') from v`,
    [servicio, `para-enviar-${s.toLowerCase()}`],
  );
  const tel = telefono(info, n);
  const clienteId = await crearClienteEnBase({ nombre: `Recibe ${n} ${s}`, telefono: tel, placa: `EN47${s}${n}` });
  const consultaId = await cotizarEnPantalla(page, clienteId, servicio);
  const [c] = await consultar<{ id: number; numero: string; enlace: string }>("select id, numero, enlace from cotizacion where consulta_id = $1", [consultaId]);
  return { consultaId, tel, ...c };
}

test("enviar abre el chat del cliente con el enlace, y el cliente ve el PDF sin cuenta", async ({ page, browser }, info) => {
  await ingresarComoDueno(page);
  const c = await cotizada(page, info, 1);
  expect(c.enlace).toMatch(/^[0-9a-f]{32}$/);

  // El chat del cliente, con su número y el mensaje con el número de la cotización y el enlace
  const enviar = page.getByRole("link", { name: "Enviar por WhatsApp" });
  const href = new URL((await enviar.getAttribute("href"))!);
  expect(`${href.origin}${href.pathname}`).toBe(`https://wa.me/${c.tel}`);
  const mensaje = href.searchParams.get("text")!;
  expect(mensaje).toContain(`te mandamos la cotización ${c.numero}`);
  expect(mensaje).toMatch(new RegExp(`/c/${c.enlace}$`));
  // Un solo WhatsApp a la vista: escribir sin el mensaje queda en "Más"
  await expect(page.getByRole("main").getByRole("link", { name: "Escribir por WhatsApp" })).toHaveCount(0);
  await page.getByRole("button", { name: "Más" }).click();
  await expect(page.getByRole("menuitem", { name: "Escribir por WhatsApp" })).toHaveAttribute("href", `https://wa.me/${c.tel}`);
  await page.keyboard.press("Escape");

  // El enlace, sin sesión: el PDF, sin cachés ni buscadores
  const anonimo = await browser.newContext();
  const r = await anonimo.request.get(`/c/${c.enlace}`, { maxRedirects: 0 });
  expect(r.status()).toBe(200);
  expect(r.headers()["content-type"]).toBe("application/pdf");
  expect(r.headers()["cache-control"]).toBe("private, no-store");
  expect(r.headers()["x-robots-tag"]).toBe("noindex, nofollow");
  expect((await r.body()).subarray(0, 5).toString()).toBe("%PDF-");
  // Un código inventado o mal formado no se encuentra
  expect((await anonimo.request.get("/c/0123456789abcdef0123456789abcdef", { maxRedirects: 0 })).status()).toBe(404);
  expect((await anonimo.request.get("/c/..%2Fpanel", { maxRedirects: 0 })).status()).toBe(404);
  await anonimo.close();
});

test("una versión que ya no vale lleva a una página que lo dice, sin montos; y en la ficha no se envía", async ({ page, browser }, info) => {
  await ingresarComoDueno(page);
  const c = await cotizada(page, info, 2);
  const anonimo = await browser.newContext();
  const cliente = await anonimo.newPage();

  // Vencida: venció ayer
  await consultar("update cotizacion set valida_hasta = (now() at time zone 'America/La_Paz')::date - 1 where id = $1", [c.id]);
  const r = await anonimo.request.get(`/c/${c.enlace}`, { maxRedirects: 0 });
  expect(r.status()).toBe(307);
  expect(r.headers()["location"]).toMatch(new RegExp(`/c/${c.enlace}/no-vigente$`));
  await cliente.goto(`/c/${c.enlace}`);
  await expect(cliente.getByRole("heading", { level: 1 })).toHaveText(/^Esta cotización venció el \d{2}\/\d{2}\/\d{4}$/);
  await expect(cliente.getByRole("main")).not.toContainText("Bs");
  await page.reload();
  await expect(page.getByRole("link", { name: "Enviar por WhatsApp" })).toHaveCount(0);
  await expect(page.getByRole("main").getByRole("link", { name: "Escribir por WhatsApp" })).toBeVisible();

  // Reemplazada: tiene una versión nueva
  await consultar("update cotizacion set estado = 'reemplazada', valida_hasta = (now() at time zone 'America/La_Paz')::date + 10 where id = $1", [c.id]);
  await cliente.goto(`/c/${c.enlace}`);
  await expect(cliente.getByRole("heading", { level: 1 })).toHaveText("Esta cotización tiene una versión nueva");
  await expect(cliente.getByRole("main")).not.toContainText("Bs");

  // Rechazada: la versión sigue vigente, pero la cotización se perdió
  await consultar("update cotizacion set estado = 'enviada' where id = $1", [c.id]);
  await consultar("update consulta set estado = 'perdido', motivo_perdida = 'precio' where id = $1", [c.consultaId]);
  await cliente.goto(`/c/${c.enlace}`);
  await expect(cliente.getByRole("heading", { level: 1 })).toHaveText("Esta cotización ya no está vigente");
  await page.reload();
  await expect(page.getByRole("link", { name: "Enviar por WhatsApp" })).toHaveCount(0);
  await anonimo.close();
});
