import { expect, test } from "@playwright/test";
import pg from "pg";
import { URL_BASE_E2E } from "./apoyo";

// HU-18 Sitio preparado para Google. Criterios: docs/09-pruebas/criterios-entrega-1.md (18.x).
// El servidor de pruebas corre como producción: SITIO_INDEXABLE=true (playwright.config.ts).

test("el sitemap lista las páginas y los servicios visibles, no los ocultos", async ({ request }, info) => {
  const slugOculto = `servicio-oculto-${info.project.name}`;
  const cliente = new pg.Client({ connectionString: URL_BASE_E2E });
  await cliente.connect();
  try {
    await cliente.query(
      `insert into servicio (nombre, slug, resumen, orden, visible_sitio) values ($1, $2, 'Oculto', 99, false) on conflict (slug) do nothing`,
      [`Servicio oculto ${info.project.name}`, slugOculto],
    );
  } finally {
    await cliente.end();
  }

  const respuesta = await request.get("/sitemap.xml");
  expect(respuesta.ok()).toBe(true);
  const xml = await respuesta.text();
  for (const ruta of ["/servicios", "/galeria", "/nosotros", "/preguntas-frecuentes", "/contacto", "/garantia"]) {
    expect(xml).toContain(`<loc>http://localhost:3200${ruta}</loc>`);
  }
  expect(xml).toContain("<loc>http://localhost:3200/servicios/polarizado-de-vidrios</loc>");
  expect(xml).not.toContain(slugOculto);
  expect(xml).not.toContain("/panel");
});

test("robots.txt deja fuera el panel, el ingreso y la API", async ({ request }) => {
  const texto = await (await request.get("/robots.txt")).text();
  for (const ruta of ["/panel", "/ingresar", "/api"]) expect(texto).toContain(`Disallow: ${ruta}`);
  expect(texto).toContain("Sitemap: http://localhost:3200/sitemap.xml");
});

test("la portada lleva los datos de negocio local con el nombre y la dirección", async ({ page }) => {
  await page.goto("/");
  const script = page.locator('script[type="application/ld+json"]');
  await expect(script).toHaveCount(1);
  const datos = JSON.parse((await script.textContent()) ?? "{}");
  expect(datos["@type"]).toBe("AutomotiveBusiness");
  expect(datos.name).toBeTruthy();
  expect(datos.address.streetAddress).toBeTruthy();
  expect(datos.telephone).toBe("+59171234567");
  // El sitio público sí se indexa (el panel no: prueba "base")
  await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
});

test("cada página pública lleva su título y su descripción dentro del head, donde los lee Google", async ({ request }) => {
  const descripciones = new Set<string>();
  for (const ruta of ["/", "/servicios", "/galeria", "/nosotros", "/preguntas-frecuentes", "/contacto", "/garantia"]) {
    const html = await (await request.get(ruta)).text();
    const head = html.slice(0, html.indexOf("</head>"));
    const descripcion = head.match(/<meta name="description" content="([^"]+)"/)?.[1];
    expect(descripcion, ruta).toBeTruthy();
    expect(head, ruta).toMatch(/<title>[^<]+<\/title>/);
    descripciones.add(descripcion!);
  }
  expect(descripciones.size).toBe(7); // ninguna repetida
});

test("la página de un servicio entrega título, descripción y vista previa dentro del head a WhatsApp y a los buscadores", async ({ request }) => {
  // Lee la base: Next manda la metadata en streaming a los navegadores y bloqueando a los bots que solo leen el
  // head (su lista incluye WhatsApp, Facebook, Bing y los rastreadores de Google). Googlebot ejecuta JavaScript y
  // la lee de la página armada. Lighthouse 12 no se identifica como bot: marca la descripción como faltante.
  for (const agente of ["WhatsApp/2.24.1 A", "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)", "facebookexternalhit/1.1"]) {
    const html = await (await request.get("/servicios/pulido-y-nano-ceramico", { headers: { "user-agent": agente } })).text();
    const head = html.slice(0, html.indexOf("</head>"));
    expect(head, agente).toMatch(/<meta name="description" content="[^"]+"/);
    expect(head, agente).toContain('<meta property="og:title" content="Pulido y nano cerámico · TocTar Detailing"');
  }
});
