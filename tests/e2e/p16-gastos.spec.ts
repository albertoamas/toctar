import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { PERMISOS } from "../../src/lib/permisos";
import { consultar, crearUsuario, ingresar, ingresarComoDueno, PNG } from "./apoyo";

// Pedido 16, primera parte: los gastos (P16-reportes-y-gastos.md §9). Cada proyecto usa su propio mes del año pasado,
// así sus totales no se mezclan con los de otro proyecto que corre a la vez.

test.describe.configure({ mode: "serial" });

/** El mes propio de este proyecto ("AAAA-MM", del año pasado) y su día 12. */
async function mesPropio(info: TestInfo) {
  const numero = { escritorio: 3, celular: 4 }[info.project.name] ?? 5;
  const [{ anio }] = await consultar<{ anio: number }>("select extract(year from (now() at time zone 'America/La_Paz'))::int - 1 as anio");
  const mes = `${anio}-${String(numero).padStart(2, "0")}`;
  return { mes, dia: `${mes}-12` };
}

async function limpiarMes(mes: string) {
  await consultar("delete from gasto where to_char(fecha, 'YYYY-MM') = $1", [mes]);
}

/** Abre "Registrar gasto" y lo llena; `fecha` va en "Cambiar fecha". */
async function registrar(page: Page, datos: { categoria: string; monto: string; metodo: string; detalle?: string; fecha: string; foto?: boolean }) {
  await page.getByRole("button", { name: "Registrar gasto" }).click();
  const form = page.getByRole("form", { name: "Registrar gasto" });
  await form.getByRole("radio", { name: datos.categoria, exact: true }).click();
  await form.getByLabel("Monto (Bs)").fill(datos.monto);
  await form.getByRole("radio", { name: datos.metodo, exact: true }).click();
  if (datos.detalle) await form.getByLabel("Detalle").fill(datos.detalle);
  if (datos.foto) {
    await form.locator("#comprobante").setInputFiles({ name: "factura.png", mimeType: "image/png", buffer: PNG });
    await expect(form.getByRole("img", { name: "Foto del comprobante" })).toBeVisible();
  }
  await form.getByText("Cambiar fecha", { exact: true }).click();
  await form.getByLabel("Fecha").fill(datos.fecha);
  await expect(form.getByLabel("Monto (Bs)")).toHaveValue(datos.monto);
  await form.getByRole("button", { name: "Guardar gasto" }).click();
  return form;
}

test("registrar gastos con su comprobante, filtrarlos y anular uno: el total los cuenta y deja de contar el anulado", async ({ page }, info) => {
  const { mes, dia } = await mesPropio(info);
  await limpiarMes(mes);
  const sufijo = info.project.name;
  await ingresarComoDueno(page);

  await page.goto(`/panel/reportes/gastos?mes=${mes}`);
  await expect(page.getByText(/^Todavía no hay gastos en /)).toBeVisible();

  // Sin elegir nada, dice qué falta
  await page.getByRole("button", { name: "Registrar gasto" }).click();
  const vacio = page.getByRole("form", { name: "Registrar gasto" });
  await expect(vacio.getByRole("radio", { name: "Insumos y productos", exact: true })).toBeVisible();
  await vacio.getByRole("button", { name: "Guardar gasto" }).click();
  await expect(vacio.getByText("Elige qué se pagó.")).toBeVisible();
  await expect(vacio.getByText("Escribe el monto del gasto.")).toBeVisible();
  await page.keyboard.press("Escape");

  // Uno con su foto, por QR
  await page.goto(`/panel/reportes/gastos?mes=${mes}`);
  await registrar(page, { categoria: "Insumos y productos", monto: "1180,50", metodo: "QR", detalle: `Cera ${sufijo}`, fecha: dia, foto: true });
  await expect(page.getByText("Gasto registrado: Insumos y productos, 1180,50 Bs.")).toBeVisible();
  // Y otro, en efectivo
  await page.goto(`/panel/reportes/gastos?mes=${mes}`);
  await registrar(page, { categoria: "Otros", monto: "200", metodo: "Efectivo", detalle: `Bolsas ${sufijo}`, fecha: dia });
  await expect(page.getByText("Gasto registrado: Otros, 200 Bs.")).toBeVisible();

  await page.goto(`/panel/reportes/gastos?mes=${mes}`);
  // El total, en la línea de arriba de la lista, como en Saldos
  const total = page.locator("p", { hasText: / Bs en \d+ gastos? de / }).filter({ visible: true });
  await expect(total).toContainText("1380,50 Bs");
  await expect(total).toContainText("en 2 gastos");
  const lista = page.getByRole("list", { name: /^Gastos de / });
  await expect(lista.getByRole("listitem")).toHaveCount(2);
  await expect(lista).toContainText(`Cera ${sufijo}`);

  // El comprobante va al bucket privado y se ve en grande
  const [c] = await consultar<{ privado: boolean }>("select a.privado from gasto g join archivo a on a.id = g.comprobante_archivo_id where g.detalle = $1", [`Cera ${sufijo}`]);
  expect(c.privado).toBe(true);
  await page.getByRole("button", { name: new RegExp(`^Ver el comprobante: Cera ${sufijo}, 1180,50 Bs`) }).click();
  await expect(page.getByRole("dialog").getByRole("img", { name: new RegExp(`^Comprobante: Cera ${sufijo}`) })).toBeVisible();
  await page.keyboard.press("Escape");

  // Por categoría
  const filtros = page.getByRole("navigation", { name: "Filtrar por categoría" });
  await filtros.getByRole("link", { name: /^Otros/ }).click();
  await expect(lista.getByRole("listitem")).toHaveCount(1);
  await expect(lista).toContainText(`Bolsas ${sufijo}`);
  // El total es el de la categoría elegida
  await expect(total).toContainText("de Otros en ");
  await expect(total).toContainText("200 Bs");
  await filtros.getByRole("link", { name: /^Todos/ }).click();
  await expect(lista.getByRole("listitem")).toHaveCount(2);

  // Anular el de Otros: pide motivo, queda tachado y deja de contar
  await page.getByRole("button", { name: new RegExp(`^Opciones del gasto: Bolsas ${sufijo}, 200 Bs`) }).click();
  await page.getByRole("menuitem", { name: "Anular gasto" }).click();
  const anular = page.getByRole("dialog", { name: "Anular gasto" }).getByRole("form", { name: new RegExp(`^Anular Bolsas ${sufijo}`) });
  await anular.getByRole("button", { name: "Anular gasto" }).click();
  await expect(anular.getByText("Escribe el motivo.")).toBeVisible();
  await anular.getByLabel("Motivo").fill("Se cargó dos veces");
  await anular.getByRole("button", { name: "Anular gasto" }).click();
  await expect(page.getByText("Gasto anulado.")).toBeVisible();
  await expect(page.getByText("Motivo: Se cargó dos veces").filter({ visible: true })).toBeVisible();
  await expect(lista.getByText("Anulado", { exact: true })).toBeVisible();
  await expect(total).toContainText("1180,50 Bs");
  await expect(total).toContainText("en 1 gasto");

  const auditoria = await consultar<{ accion: string }>(
    "select accion from auditoria where entidad = 'gasto' and entidad_id in (select id from gasto where to_char(fecha, 'YYYY-MM') = $1) order by id",
    [mes],
  );
  expect(auditoria.map((a) => a.accion)).toEqual(["crear", "crear", "anular"]);
});

test("una categoría nueva en Configuración se elige al registrar; desactivada, ya no", async ({ page }, info) => {
  const nombre = `Repuestos ${info.project.name}`;
  await consultar("delete from categoria_gasto where nombre = $1 and not exists (select 1 from gasto where categoria_id = categoria_gasto.id)", [nombre]);
  await ingresarComoDueno(page);
  await page.goto("/panel/configuracion/parametros");
  const seccion = page.getByRole("region", { name: "Categorías de gasto" });
  await seccion.getByRole("button", { name: /^Agregar categoría/ }).click();
  await page.getByRole("dialog").getByLabel("Nombre").fill(nombre);
  await page.getByRole("dialog").getByRole("button", { name: /^(Agregar|Guardar)/ }).click();
  await expect(page.getByText(`${nombre} agregada.`)).toBeVisible();

  await page.goto("/panel/reportes/gastos");
  await page.getByRole("button", { name: "Registrar gasto" }).click();
  await expect(page.getByRole("form", { name: "Registrar gasto" }).getByRole("radio", { name: nombre, exact: true })).toBeVisible();

  // Desactivada, no se ofrece
  await consultar("update categoria_gasto set activo = false where nombre = $1", [nombre]);
  await page.goto("/panel/reportes/gastos");
  await page.getByRole("button", { name: "Registrar gasto" }).click();
  await expect(page.getByRole("form", { name: "Registrar gasto" }).getByRole("radio", { name: "Otros", exact: true })).toBeVisible();
  await expect(page.getByRole("form", { name: "Registrar gasto" }).getByRole("radio", { name: nombre, exact: true })).toHaveCount(0);
});

test("un encargado, aunque tenga todos los permisos, no ve Reportes ni entra a los gastos", async ({ page }, info) => {
  const usuario = `todo-p16-${info.project.name}`;
  await crearUsuario({ usuario, nombre: "Encargado con todo", contrasena: "todo-p16-123", rol: "encargado", permisos: [...PERMISOS] });
  await ingresar(page, usuario, "todo-p16-123");
  await expect(page).toHaveURL(/\/panel$/);
  // El Inicio ya cargó, y Reportes no está en el menú (en el celular, tampoco al abrirlo)
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  if (info.project.name === "celular") await page.getByRole("button", { name: /menú/i }).first().click();
  await expect(page.getByRole("link", { name: "Reportes" })).toHaveCount(0);
  await page.goto("/panel/reportes/gastos");
  await expect(page).toHaveURL(/\/panel\/sin-acceso$/);
});
