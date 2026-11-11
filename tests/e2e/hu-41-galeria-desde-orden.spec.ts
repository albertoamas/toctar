import { expect, test, type TestInfo } from "@playwright/test";
import { consultar, crearClienteEnBase, crearOrdenLista, crearUsuario, ingresar, ingresarComoDueno, PNG } from "./apoyo";

// HU-41 Fotos de órdenes a la galería (RF-44, RN-01, RNF-05). Especificación: docs/08-desarrollo/etapas/C5-cierre-entrega-2.md §9.
// Las órdenes van directo a la base, en días propios lejos de hoy (1400 o 1500, más el intento) para no chocar con otras
// pruebas. Las fotos se suben por la orden: la acción las copia del almacenamiento privado, tienen que existir.

const sufijo = (info: TestInfo) => `${info.project.name === "celular" ? "C" : "E"}${info.retry}`;
const dias = (info: TestInfo, n: number) => (info.project.name === "celular" ? 1400 : 1500) + info.retry * 10 + n;
const foto = (nombre: string) => ({ name: nombre, mimeType: "image/png", buffer: PNG });

test("el dueño publica antes y después de una orden entregada: copias públicas, las de la orden siguen privadas y quitarlo de la galería no las borra", async ({ page }, info) => {
  const s = sufijo(info);
  const placa = `GA41${s}1`;
  const descripcion = `Pulido publicado desde la orden ${s}`;
  await crearClienteEnBase({ nombre: `Galería ${s}`, telefono: `5917${info.project.name === "celular" ? 5 : 6}41${info.retry}010`, placa });
  const id = await crearOrdenLista({ placa, espacio: 0, dias: dias(info, 0), precio: 500, pagado: 500 });
  await ingresarComoDueno(page);

  // Las fotos se suben mientras la orden está abierta
  await page.goto(`/panel/ordenes/${id}`, { waitUntil: "networkidle" });
  await expect(page.getByRole("button", { name: "Tomar foto" }).first()).toBeEnabled();
  await page.getByLabel("Cámara para fotos del inicio").setInputFiles(foto("antes.png"));
  await expect(page.getByRole("button", { name: "Ver la foto 1 del inicio" })).toBeVisible();
  await page.getByLabel("Cámara para fotos del final").setInputFiles(foto("despues.png"));
  await expect(page.getByRole("button", { name: "Ver la foto 1 del final" })).toBeVisible();
  // Todavía no se entregó: no se publica
  await expect(page.getByRole("link", { name: "Publicar en la galería" })).toHaveCount(0);

  await consultar("update trabajo set estado = 'entregado', entregado_at = now() where id = $1", [id]);
  await page.goto(`/panel/ordenes/${id}`);
  await page.getByRole("link", { name: "Publicar en la galería" }).click();
  await expect(page).toHaveURL(new RegExp(`/panel/ordenes/${id}/publicar(?:[?&]volver=[^&#]*)?$`));
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("radio", { name: "Foto de después, 1 de 1" })).toBeChecked();
  await expect(page.getByRole("radio", { name: "Sin foto de antes" })).toBeChecked();
  // Se toca la foto (la etiqueta que envuelve al radio), como en el celular
  const antes = page.getByRole("radio", { name: "Foto de antes, 1 de 1" });
  await antes.locator("..").click();
  await expect(antes).toBeChecked();
  await expect(antes.locator("..")).toContainText("Elegida");
  await page.getByLabel("Descripción (opcional)").fill(descripcion);

  // Sin la casilla no se publica
  await page.getByRole("button", { name: "Publicar" }).click();
  await expect(page.getByText("Marca que en las fotos no se lee la placa ni se ve a nadie.")).toBeVisible();
  await page.getByRole("checkbox", { name: "En las fotos no se lee la placa ni se ve a nadie" }).click();
  await page.getByRole("button", { name: "Publicar" }).click();
  await expect(page).toHaveURL(new RegExp(`/panel/ordenes/${id}\\?publicado=1(?:[?&]volver=[^&#]*)?$`));
  await expect(page.getByText("Publicado en la galería. Lo ordenas u ocultas en Sitio web > Galería.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Publicada en la galería (2 fotos)" })).toBeVisible();
  // Una vez por orden: ya no ofrece publicar y la dirección vuelve a la orden
  await expect(page.getByRole("link", { name: "Publicar en la galería" })).toHaveCount(0);
  await page.goto(`/panel/ordenes/${id}/publicar`);
  await expect(page).toHaveURL(new RegExp(`/panel/ordenes/${id}(?:[?&]volver=[^&#]*)?$`));

  // Las copias son públicas y distintas de las fotos de la orden, que siguen privadas (RNF-05)
  const [item] = await consultar<{ id: number; despues: number; antes: number; publicas: boolean }>(
    `select g.id, g.foto_despues_id as despues, g.foto_antes_id as antes, not (d.privado or a.privado) as publicas
     from galeria_item g join archivo d on d.id = g.foto_despues_id join archivo a on a.id = g.foto_antes_id where g.trabajo_id = $1`,
    [id],
  );
  expect(item.publicas).toBe(true);
  const originales = await consultar<{ id: number; privado: boolean }>("select a.id, a.privado from trabajo_foto f join archivo a on a.id = f.archivo_id where f.trabajo_id = $1", [id]);
  expect(originales).toHaveLength(2);
  expect(originales.every((o) => o.privado && o.id !== item.despues && o.id !== item.antes)).toBe(true);

  // En la galería pública, con su foto servida desde el bucket público
  await page.goto("/galeria");
  const despues = page.getByRole("img", { name: `Después: ${descripcion}` });
  await expect(despues).toBeVisible();
  expect((await page.request.get((await despues.getAttribute("src"))!)).ok()).toBe(true);

  // Quitarla de la galería borra las copias, no las fotos de la orden
  await page.goto("/panel/sitio/galeria");
  await page.getByRole("button", { name: `Más: ${descripcion}` }).click();
  await page.getByRole("menuitem", { name: "Eliminar foto" }).click();
  await page.getByRole("dialog", { name: "¿Eliminar esta foto?" }).getByRole("button", { name: "Eliminar foto" }).click();
  await expect(page.getByText("Foto eliminada.")).toBeVisible();
  expect(await consultar("select id from archivo where id = any($1::int[])", [[item.despues, item.antes]])).toEqual([]);
  expect(await consultar("select 1 from trabajo_foto where trabajo_id = $1", [id])).toHaveLength(2);
  // Quitada de la galería, se puede volver a publicar
  await page.goto(`/panel/ordenes/${id}`);
  await expect(page.getByRole("link", { name: "Publicar en la galería" })).toBeVisible();
});

test("un encargado con Órdenes no publica: no ve el botón ni entra por la dirección", async ({ page }, info) => {
  const s = sufijo(info);
  const placa = `GA41${s}2`;
  await crearClienteEnBase({ nombre: `Galería encargado ${s}`, telefono: `5917${info.project.name === "celular" ? 5 : 6}41${info.retry}020`, placa });
  const id = await crearOrdenLista({ placa, espacio: 0, dias: dias(info, 1), precio: 500, pagado: 500 });
  // Entregada y con una foto de después (la fila basta: el encargado no llega a copiarla)
  await consultar(
    `with a as (insert into archivo (clave, tipo_mime, bytes, privado) values ($2, 'image/webp', 1, true) returning id)
     insert into trabajo_foto (trabajo_id, archivo_id, etapa, subido_por) select $1, a.id, 'despues', t.created_by from a, trabajo t where t.id = $1`,
    [id, `ordenes/hu41-${s}.webp`],
  );
  await consultar("update trabajo set estado = 'entregado', entregado_at = now() where id = $1", [id]);

  const usuario = `enc-hu41-${s.toLowerCase()}`;
  await crearUsuario({ usuario, nombre: "Encargado de órdenes", contrasena: "encargado-123", rol: "encargado", permisos: ["ordenes", "pagos", "sitio"] });
  await ingresar(page, usuario, "encargado-123");
  await expect(page).toHaveURL(/\/panel$/);
  await page.goto(`/panel/ordenes/${id}`);
  await expect(page.getByRole("heading", { level: 1, name: placa })).toBeVisible();
  await expect(page.getByRole("link", { name: "Publicar en la galería" })).toHaveCount(0);
  await page.goto(`/panel/ordenes/${id}/publicar`);
  await expect(page).toHaveURL(/\/panel\/sin-acceso$/);
});

test("a 360 px la pantalla de publicar no se sale", async ({ page }, info) => {
  const s = sufijo(info);
  const placa = `GA41${s}3`;
  await crearClienteEnBase({ nombre: `Galería 360 ${s}`, telefono: `5917${info.project.name === "celular" ? 5 : 6}41${info.retry}030`, placa });
  const id = await crearOrdenLista({ placa, espacio: 0, dias: dias(info, 2), precio: 500, pagado: 500 });
  await page.setViewportSize({ width: 360, height: 740 });
  await ingresarComoDueno(page);
  await page.goto(`/panel/ordenes/${id}`, { waitUntil: "networkidle" });
  await expect(page.getByRole("button", { name: "Tomar foto" }).first()).toBeEnabled();
  await page.getByLabel("Cámara para fotos del final").setInputFiles(foto("despues.png"));
  await expect(page.getByRole("button", { name: "Ver la foto 1 del final" })).toBeVisible();
  await consultar("update trabajo set estado = 'entregado', entregado_at = now() where id = $1", [id]);
  await page.goto(`/panel/ordenes/${id}/publicar`);
  await expect(page.getByRole("heading", { level: 1, name: `Publicar ${placa}` })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(360);
});
