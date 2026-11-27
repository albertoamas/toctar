import { expect, test, type TestInfo } from "@playwright/test";
import { abrirNuevoServicio, consultar, ingresarComoDueno } from "./apoyo";

// Pulido 13.57: los precios de un servicio del catálogo. En la computadora, una tabla (tamaños por variante); en el
// celular, píldoras para elegir la variante y sus precios debajo. Antes, una tarjeta por variante, una debajo de la otra.

const sufijo = (info: TestInfo) => (info.project.name === "celular" ? "c" : "e");

/** Un servicio con tres variantes: las dos primeras con precios en todos los tamaños, la tercera sin ninguno. */
async function servicioConVariantes(page: import("@playwright/test").Page, info: TestInfo): Promise<number> {
  const nuevo = await abrirNuevoServicio(page);
  await nuevo.getByLabel("Nombre del servicio").fill(`Tabla de precios ${sufijo(info)}`);
  await nuevo.getByRole("button", { name: "Crear servicio" }).click();
  await expect(page).toHaveURL(/\/panel\/catalogo\/\d+\?creado=1/);
  const id = Number(page.url().match(/catalogo\/(\d+)/)![1]);
  await consultar("update variante set nombre = '1 año' where servicio_id = $1", [id]);
  await consultar("insert into variante (servicio_id, nombre, orden) values ($1, '3 años', 2), ($1, '5 años', 3)", [id]);
  await consultar(
    `insert into precio (variante_id, tamano_id, monto, created_by)
     select v.id, t.id, case when v.nombre = '1 año' then 100 else 300 end + t.orden * 10, (select id from usuario where nombre_usuario = 'dueno')
     from variante v, tamano_vehiculo t where v.servicio_id = $1 and v.nombre in ('1 año', '3 años') and t.activo`,
    [id],
  );
  return id;
}

test("los precios se comparan en una tabla en la computadora y por variante en el celular", async ({ page, isMobile }, info) => {
  test.setTimeout(60_000);
  await ingresarComoDueno(page);
  const id = await servicioConVariantes(page, info);
  await page.goto(`/panel/catalogo/${id}`, { waitUntil: "networkidle" });

  // El encabezado: el nombre, la insignia solo porque pide atención (recién creado, está oculto en el sitio) y "Más"
  await expect(page.getByRole("heading", { level: 1, name: `Tabla de precios ${sufijo(info)}` })).toBeVisible();
  await expect(page.getByText("Oculto en el sitio", { exact: true })).toBeVisible();
  await page.getByRole("main").getByRole("button", { name: "Más" }).click();
  await expect(page.getByRole("menuitem", { name: "Su página en el sitio" })).toHaveAttribute("href", new RegExp(`/panel/sitio/servicios/${id}`));
  await page.keyboard.press("Escape");

  if (isMobile) {
    // Una variante a la vez: la primera, y las píldoras para cambiar
    const variantes = page.getByRole("group", { name: "Variante" });
    await expect(variantes.getByRole("button", { name: "1 año" })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("region", { name: "1 año" })).toContainText("110 Bs");
    await expect(page.getByRole("region", { name: "3 años" })).toHaveCount(0);
    await variantes.getByRole("button", { name: "3 años" }).click();
    await expect(page.getByRole("region", { name: "3 años" })).toContainText("310 Bs");
    await variantes.getByRole("button", { name: "5 años" }).click();
    await expect(page.getByRole("region", { name: "5 años" })).toContainText("Sin precios cargados.");
    // Su "Editar" abre el modal de esa variante
    await page.getByRole("region", { name: "5 años" }).getByRole("button", { name: "Cargar precios de 5 años" }).click();
    await expect(page.getByRole("dialog", { name: "Precios de 5 años" })).toBeVisible();
    await page.getByRole("dialog").getByRole("button", { name: "Cancelar" }).click();
    // Mucho más corta: antes, una tarjeta por variante (con 3, unas 1,5 pantallas)
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThan(page.viewportSize()!.height * 1.3);
  } else {
    // Todas juntas, como las tablas del panel: los tamaños en filas, las variantes en columnas, sin botones adentro
    const tabla = page.getByRole("table");
    await expect(tabla.getByRole("columnheader")).toHaveText(["Tamaño", "1 año", "3 años", "5 años"]);
    await expect(tabla.getByRole("button")).toHaveCount(0);
    await expect(tabla.getByRole("row").nth(1)).toContainText("110 Bs");
    await expect(tabla.getByRole("row").nth(1)).toContainText("310 Bs");
    // La variante sin ningún precio lo dice una vez, no en cada tamaño
    await expect(tabla.getByText("Sin precios cargados")).toHaveCount(1);
    await expect(tabla.getByText("Sin cargar")).toHaveCount(0);
    // Un solo "Editar precios", en el título; en el modal, las píldoras pasan de una variante a otra
    await page.getByRole("region", { name: "Precios" }).getByRole("button", { name: "Editar precios", exact: true }).click();
    const modal = page.getByRole("dialog", { name: "Precios de 1 año" });
    await expect(modal).toBeVisible();
    await modal.getByRole("group", { name: "Variante" }).getByRole("button", { name: "3 años" }).click();
    const tres = page.getByRole("dialog", { name: "Precios de 3 años" });
    await expect(tres.getByLabel("Compactos")).toHaveValue("310");
    // Con algo escrito, no cambia de variante: lo dice, y no se pierde lo escrito
    await tres.getByLabel("Compactos").fill("315");
    await tres.getByRole("group", { name: "Variante" }).getByRole("button", { name: "1 año" }).click();
    await expect(tres.getByText("Guarda o cancela los cambios de 3 años para pasar a otra variante.")).toBeVisible();
    await expect(tres.getByLabel("Compactos")).toHaveValue("315");
    // Deshecho lo escrito, vuelve a pasar; y pasar de una a otra sin tocar nada no es un cambio al cerrar
    await tres.getByLabel("Compactos").fill("310");
    await tres.getByRole("group", { name: "Variante" }).getByRole("button", { name: "1 año" }).click();
    const uno = page.getByRole("dialog", { name: "Precios de 1 año" });
    await expect(uno.getByLabel("Compactos")).toHaveValue("110");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
  }
  // Nada se sale de la pantalla
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
});
