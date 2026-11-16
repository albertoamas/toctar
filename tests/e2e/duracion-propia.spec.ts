import { expect, test } from "@playwright/test";
import { abrirNuevoServicio, consultar, ingresarComoDueno } from "./apoyo";

// Hallazgo 2 de la prueba en celulares (15/11, 08-desarrollo/hallazgos-prueba-celulares.md): al crear un servicio, el
// dueño escribía su duración en el modal de precios ("Duración propia", la de la variante "Única") y la ficha seguía con
// 1 día, la del servicio, que nadie había elegido. Ahora la duración se pide al crear, y con una sola variante es la
// única: los precios se nombran por el servicio y no ofrecen otra.

test("al crear un servicio se pide su duración, y con una sola variante no hay otra", async ({ page }, info) => {
  const nombre = `Duración al crear ${info.project.name} ${info.retry}`;
  await ingresarComoDueno(page);
  const nuevo = await abrirNuevoServicio(page);
  await nuevo.getByLabel("Nombre del servicio").fill(nombre);
  // Sin la duración no se crea: no hay un día escondido
  await nuevo.getByLabel("Duración estimada").fill("");
  await nuevo.getByRole("button", { name: "Crear servicio" }).click();
  await expect(nuevo.getByText("Escribe los días, de 1 a 60.")).toBeVisible();
  await nuevo.getByLabel("Duración estimada").fill("5");
  await nuevo.getByRole("button", { name: "Crear servicio" }).click();

  // Los precios, con el nombre del servicio y sin "Duración propia"
  const precios = page.getByRole("dialog", { name: `Precios de ${nombre}` });
  await expect(precios.getByLabel("Compactos")).toBeFocused();
  await expect(precios.getByLabel("Duración propia")).toHaveCount(0);
  await precios.getByLabel("Compactos").fill("250");
  await precios.getByRole("button", { name: "Guardar precios" }).click();
  await expect(precios).toHaveCount(0);

  await expect(page.getByText("5 días", { exact: true }).first()).toBeVisible();
  expect(await consultar<{ s: number; v: number | null }>("select s.duracion_dias as s, v.duracion_dias as v from servicio s join variante v on v.servicio_id = s.id where s.nombre = $1", [nombre])).toEqual([
    { s: 5, v: null },
  ]);
});

test("al desactivar una variante y quedar una sola, su duración propia pasa al servicio", async ({ page }, info) => {
  const nombre = `Queda sola ${info.project.name} ${info.retry}`;
  await ingresarComoDueno(page);
  const nuevo = await abrirNuevoServicio(page);
  await nuevo.getByLabel("Nombre del servicio").fill(nombre);
  await nuevo.getByRole("button", { name: "Crear servicio" }).click();
  await page.getByRole("dialog", { name: `Precios de ${nombre}` }).getByRole("button", { name: "Cancelar" }).click();
  // Dos variantes: la "Única" tarda 5 días (su duración propia) y otra, la del servicio (2)
  await consultar(
    `with s as (select id from servicio where nombre = $1)
     update variante set duracion_dias = 5 where servicio_id = (select id from s)`,
    [nombre],
  );
  await consultar("insert into variante (servicio_id, nombre, orden) select id, 'Otra', 2 from servicio where nombre = $1", [nombre]);
  // Sin ?creado=1: sin precios, el modal de precios se volvería a abrir solo
  await page.goto(page.url().split("?")[0], { waitUntil: "networkidle" });
  await expect(page.getByText("Algunas opciones tardan distinto: ver Precios.")).toBeVisible();

  await page.getByRole("button", { name: "Editar variantes" }).click();
  const variantes = page.getByRole("dialog", { name: "Variantes" });
  await variantes.getByRole("button", { name: "Editar Otra" }).click();
  await page.getByRole("dialog", { name: "Editar variante" }).getByRole("button", { name: "Desactivar Otra" }).click();
  await expect(page.getByText("Otra desactivada.")).toBeVisible();
  await expect
    .poll(() => consultar<{ s: number; v: number | null }>("select s.duracion_dias as s, v.duracion_dias as v from servicio s join variante v on v.servicio_id = s.id and v.activo where s.nombre = $1", [nombre]))
    .toEqual([{ s: 5, v: null }]);
});
