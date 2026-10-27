import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { consultar, crearClienteEnBase, crearUsuario, ingresar, ingresarComoDueno, PNG } from "./apoyo";

// HU-25 Armar la cotización (flujo crítico 1). Especificación: docs/08-desarrollo/etapas/C2-consultas-cotizaciones.md §9.
// Cada proyecto (celular o escritorio) crea su propio servicio con precios y su consulta, directo en la base.
// En serie: las del dueño entran todas con el mismo usuario y, a la vez, chocaban con el límite de intentos (RNF-04).
test.describe.configure({ mode: "serial" });

const sufijo = (info: TestInfo) => (info.project.name === "celular" ? "C" : "E");
const telefono = (info: TestInfo, n: number) => `5917${info.project.name === "celular" ? 3 : 4}2500${n}0`;

/**
 * Un servicio con dos variantes: "Con precio" (450 Bs para el primer tamaño, el del vehículo de crearClienteEnBase) y
 * "Por evaluar" (según evaluación). Devuelve el nombre del servicio.
 */
async function crearServicioConPrecios(info: TestInfo): Promise<string> {
  const nombre = `Cotizable ${sufijo(info)}`;
  await consultar(
    `with s as (
       insert into servicio (nombre, slug, resumen, orden) values ($1, $2, 'Servicio de prueba para cotizar.', 99)
       on conflict do nothing returning id
     ), v as (
       insert into variante (servicio_id, nombre, orden) select id, x.nombre, x.orden from s, (values ('Con precio', 1), ('Por evaluar', 2)) as x(nombre, orden)
       returning id, nombre
     )
     insert into precio (variante_id, tamano_id, monto, created_by)
     select v.id, (select id from tamano_vehiculo order by orden limit 1), case when v.nombre = 'Con precio' then 450 end, (select id from usuario where nombre_usuario = 'dueno')
     from v`,
    [nombre, `cotizable-${sufijo(info).toLowerCase()}`],
  );
  return nombre;
}

async function crearConsulta(info: TestInfo, n: number, canal: "whatsapp" | "taller" = "whatsapp"): Promise<number> {
  const s = sufijo(info);
  await crearClienteEnBase({ nombre: `Cotizado ${n} ${s}`, telefono: telefono(info, n), placa: `CZ25${s}${n}` });
  const [fila] = await consultar<{ id: number }>(
    `insert into consulta (cliente_id, vehiculo_id, canal, created_by)
     select v.cliente_id, v.id, $2, v.created_by from vehiculo v where v.placa = $1 returning id`,
    [`CZ25${s}${n}`, canal],
  );
  return fila.id;
}

const servicio = (page: Page, i: number) => page.getByLabel(`Servicio ${i}`, { exact: true });
const precio = (page: Page, i: number) => page.getByLabel(`Precio del servicio ${i}`);

test("el dueño cotiza con el precio del tamaño; según evaluación obliga a escribirlo; descuento y total", async ({ page }, info) => {
  const nombre = await crearServicioConPrecios(info);
  const id = await crearConsulta(info, 1);
  await ingresarComoDueno(page);
  await page.goto(`/panel/consultas/${id}`);
  await expect(page.getByText("Todavía no se cotizó.")).toBeVisible();
  await page.getByRole("link", { name: "Cotizar" }).click();
  await expect(page).toHaveURL(new RegExp(`/panel/consultas/${id}/cotizar$`));

  // Llegó por WhatsApp: es un estimado (RN-03), y el adelanto y la validez vienen de Configuración
  await expect(page.getByRole("checkbox", { name: "Estimado según fotos o video" })).toBeChecked();
  await expect(page.getByLabel("Adelanto sugerido")).not.toHaveValue("");
  await expect(page.getByLabel("Válida hasta")).not.toHaveValue("");

  await page.getByRole("button", { name: "Agregar servicio" }).click();
  await servicio(page, 1).selectOption({ label: `${nombre} — Con precio` });
  await expect(precio(page, 1)).toHaveValue("450");
  await expect(page.getByText("Precio sugerido: 450 Bs")).toBeVisible();

  await page.getByRole("button", { name: "Agregar servicio" }).click();
  await servicio(page, 2).selectOption({ label: `${nombre} — Por evaluar` });
  await expect(precio(page, 2)).toHaveValue("");
  await expect(page.getByText("Según evaluación: escribe el precio")).toBeVisible();

  await page.getByLabel("Descuento").fill("50");
  await page.getByLabel("Adelanto sugerido").fill("100");
  await page.getByRole("button", { name: "Guardar y generar PDF" }).click();
  await expect(page.getByText("Escribe el precio.")).toBeVisible();
  await expect(precio(page, 2)).toBeFocused();
  // Lo elegido se conserva tras el error
  await expect(precio(page, 1)).toHaveValue("450");
  await expect(page.getByLabel("Descuento")).toHaveValue("50");

  await precio(page, 2).fill("200,50");
  const totales = page.locator("dl").filter({ hasText: "Subtotal" });
  await expect(totales).toContainText("650,50 Bs");
  await expect(totales).toContainText("600,50 Bs");

  await page.getByRole("button", { name: "Guardar y generar PDF" }).click();
  await expect(page).toHaveURL(new RegExp(`/panel/consultas/${id}\\?cotizada=\\d+$`));
  const [{ numero }] = await consultar<{ numero: string }>("select numero from cotizacion where consulta_id = $1", [id]);
  expect(numero).toMatch(/^\d{4}-\d{4}$/);
  await expect(page.getByText(`Cotización ${numero} lista.`)).toBeVisible();
  await expect(page.getByRole("main").getByText("Cotizado", { exact: true })).toBeVisible();
  const lista = page.getByRole("list", { name: "Cotizaciones" });
  await expect(lista).toContainText(numero);
  await expect(lista).toContainText("600,50 Bs");
  await expect(lista).toContainText("Estimado por fotos");

  // Se guardaron los precios copiados y el sugerido de cada línea (D-4), y la auditoría (RNF-10)
  const lineas = await consultar<{ descripcion: string; precio_sugerido: string | null; precio: string }>(
    "select l.descripcion, l.precio_sugerido, l.precio from cotizacion_linea l join cotizacion c on c.id = l.cotizacion_id where c.consulta_id = $1 order by l.orden",
    [id],
  );
  expect(lineas).toEqual([
    { descripcion: `${nombre} — Con precio`, precio_sugerido: "450.00", precio: "450.00" },
    { descripcion: `${nombre} — Por evaluar`, precio_sugerido: null, precio: "200.50" },
  ]);
  const [registro] = await consultar<{ accion: string }>(
    "select a.accion from auditoria a join cotizacion c on c.id = a.entidad_id where a.entidad = 'cotizacion' and c.consulta_id = $1",
    [id],
  );
  expect(registro.accion).toBe("crear");
});

test("corregir crea la versión 2 con el mismo número; la 1 queda reemplazada y sin cambios", async ({ page }, info) => {
  const nombre = `Cotizable ${sufijo(info)}`;
  const id = await crearConsulta(info, 2, "taller");
  await ingresarComoDueno(page);
  await page.goto(`/panel/consultas/${id}/cotizar`);
  // En el taller no es un estimado
  await expect(page.getByRole("checkbox", { name: "Estimado según fotos o video" })).not.toBeChecked();
  await page.getByRole("button", { name: "Agregar servicio" }).click();
  await servicio(page, 1).selectOption({ label: `${nombre} — Con precio` });
  await page.getByRole("button", { name: "Guardar y generar PDF" }).click();
  await expect(page).toHaveURL(/\?cotizada=\d+$/);

  await page.getByRole("link", { name: "Corregir (nueva versión)" }).click();
  await expect(page).toHaveURL(/\/cotizar\?desde=\d+$/);
  await expect(page.getByText("Se guarda como versión 2.")).toBeVisible();
  // Arranca con lo de la versión 1
  await expect(precio(page, 1)).toHaveValue("450");
  await precio(page, 1).fill("400");
  await page.getByRole("button", { name: "Guardar versión 2 y generar PDF" }).click();
  await expect(page).toHaveURL(/\?cotizada=\d+$/);

  const versiones = await consultar<{ numero: string; version: number; estado: string; total: string }>(
    "select numero, version, estado, total from cotizacion where consulta_id = $1 order by version",
    [id],
  );
  expect(versiones.map((v) => [v.version, v.estado, v.total])).toEqual([
    [1, "reemplazada", "450.00"],
    [2, "enviada", "400.00"],
  ]);
  expect(versiones[0].numero).toBe(versiones[1].numero);
  await expect(page.getByText(`Versión 2 de la cotización ${versiones[0].numero} lista.`)).toBeVisible();
  await expect(page.getByRole("list", { name: "Cotizaciones" }).getByRole("listitem")).toHaveCount(2);

  // Ir a cotizar de nuevo lleva a corregir la vigente; la reemplazada ya no se corrige
  const [{ id: primera }] = await consultar<{ id: number }>("select id from cotizacion where consulta_id = $1 and version = 1", [id]);
  await page.goto(`/panel/consultas/${id}/cotizar?desde=${primera}`);
  await expect(page.getByText("Esa versión ya fue corregida.")).toBeVisible();
  await page.goto(`/panel/consultas/${id}/cotizar`);
  await expect(page.getByText("Se guarda como versión 3.")).toBeVisible();
  // Un `desde` que no es de esta consulta lleva a corregir la vigente
  await page.goto(`/panel/consultas/${id}/cotizar?desde=999999`);
  await expect(page).toHaveURL(/\/cotizar\?desde=\d+$/);
  await expect(page).not.toHaveURL(/desde=999999/);
  await expect(page.getByText("Se guarda como versión 3.")).toBeVisible();

  // Perdida y reabierta, vuelve a "Cotizado": ya tiene cotización
  await page.goto(`/panel/consultas/${id}`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Más" }).click();
  await page.getByRole("menuitem", { name: "Marcar como perdida" }).click();
  await page.getByRole("radio", { name: "Precio" }).check();
  await page.getByRole("form", { name: "Marcar como perdida" }).getByRole("button", { name: "Marcar como perdida" }).click();
  await expect(page.getByText("Marcada como perdida.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Corregir (nueva versión)" })).toHaveCount(0);
  await page.getByRole("button", { name: "Reabrir" }).click();
  await expect(page.getByRole("main").getByText("Cotizado", { exact: true })).toBeVisible();
});

test("el descuento no pasa el subtotal, el adelanto no pasa el total y la validez no es anterior a hoy", async ({ page }, info) => {
  const nombre = `Cotizable ${sufijo(info)}`;
  const id = await crearConsulta(info, 3);
  await ingresarComoDueno(page);
  await page.goto(`/panel/consultas/${id}/cotizar`);
  await page.getByRole("button", { name: "Guardar y generar PDF" }).click();
  await expect(page.getByText("Agrega al menos un servicio.")).toBeVisible();

  await page.getByRole("button", { name: "Agregar servicio" }).click();
  await servicio(page, 1).selectOption({ label: `${nombre} — Con precio` });
  await page.getByLabel("Descuento").fill("500");
  await page.getByRole("button", { name: "Guardar y generar PDF" }).click();
  await expect(page.getByText("El descuento no puede ser mayor que el subtotal.")).toBeVisible();
  await expect(page.getByLabel("Descuento")).toBeFocused();

  await page.getByLabel("Descuento").fill("");
  await page.getByLabel("Adelanto sugerido").fill("451");
  await page.getByRole("button", { name: "Guardar y generar PDF" }).click();
  await expect(page.getByText("El adelanto no puede ser mayor que el total.")).toBeVisible();

  await page.getByLabel("Adelanto sugerido").fill("100");
  await page.getByLabel("Válida hasta").fill("2020-01-01");
  await page.getByRole("button", { name: "Guardar y generar PDF" }).click();
  await expect(page.getByText("La validez no puede ser anterior a hoy.")).toBeVisible();
});

test("RN-01: el encargado ve que está cotizada sin montos y no entra a cotizar; el técnico tampoco", async ({ page }, info) => {
  const s = sufijo(info).toLowerCase();
  const id = await crearConsulta(info, 4);
  await consultar(
    `insert into cotizacion (consulta_id, numero, version, es_estimado, subtotal, descuento, total, adelanto_sugerido, valida_hasta, condiciones, garantia, formas_pago, datos_documento, created_by)
     select $1, '2026-9' || $2, 1, false, 300, 0, 300, 100, current_date + 15, 'c', 'g', 'f', '{}'::jsonb, id from usuario where nombre_usuario = 'dueno'`,
    [id, info.project.name === "celular" ? "01" : "02"],
  );
  await crearUsuario({ usuario: `enc-hu25-${s}`, nombre: "Encargado con todo", contrasena: "encargado-123", rol: "encargado", permisos: ["consultas", "clientes", "reclamos", "sitio"] });
  await ingresar(page, `enc-hu25-${s}`, "encargado-123");
  await expect(page).toHaveURL(/\/panel$/);
  await page.goto(`/panel/consultas/${id}`);
  const lista = page.getByRole("list", { name: "Cotizaciones" });
  await expect(lista).toContainText(`2026-9${info.project.name === "celular" ? "01" : "02"}`);
  await expect(lista).not.toContainText("Bs");
  await expect(page.getByRole("link", { name: /Cotizar|Corregir/ })).toHaveCount(0);
  await page.goto(`/panel/consultas/${id}/cotizar`);
  await expect(page).toHaveURL(/\/panel\/sin-acceso$/);

  await page.context().clearCookies();
  await crearUsuario({ usuario: `tec-hu25-${s}`, nombre: "Técnico", contrasena: "tecnico-123", rol: "tecnico" });
  await ingresar(page, `tec-hu25-${s}`, "tecnico-123");
  await expect(page).toHaveURL(/\/panel$/);
  await page.goto(`/panel/consultas/${id}/cotizar`);
  await expect(page).toHaveURL(/\/panel\/sin-acceso$/);
});

test("las fotos elegidas para la cotización ya no se quitan de la consulta", async ({ page }, info) => {
  const nombre = `Cotizable ${sufijo(info)}`;
  const id = await crearConsulta(info, 5);
  await ingresarComoDueno(page);
  await page.goto(`/panel/consultas/${id}`);
  await expect(page.getByRole("button", { name: "Agregar fotos o videos" })).toBeEnabled();
  await page.getByLabel("Archivos de fotos o videos").setInputFiles({ name: "capo.png", mimeType: "image/png", buffer: PNG });
  await expect(page.getByText("Foto agregada.")).toBeVisible();

  await page.getByRole("link", { name: "Cotizar" }).click();
  await page.getByRole("button", { name: "Agregar servicio" }).click();
  await servicio(page, 1).selectOption({ label: `${nombre} — Con precio` });
  await page.getByRole("checkbox", { name: "Foto 1 en el PDF" }).check();
  await page.getByRole("button", { name: "Guardar y generar PDF" }).click();
  await expect(page).toHaveURL(/\?cotizada=\d+$/);
  const [{ n }] = await consultar<{ n: number }>(
    "select count(*)::int as n from cotizacion_foto f join cotizacion c on c.id = f.cotizacion_id where c.consulta_id = $1",
    [id],
  );
  expect(n).toBe(1);

  await page.getByRole("button", { name: "Ver la foto 1" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Quitar foto" }).click();
  await expect(page.getByText("Esa foto está en una cotización: no se quita.")).toBeVisible();
});

test("una cotización nueva arranca con el servicio que pidió el cliente, y el total va al pie", async ({ page }, info) => {
  const s = sufijo(info);
  const varias = await crearServicioConPrecios(info);
  // Un servicio de una sola variante, con precio para el tamaño del vehículo
  const unica = `De una variante ${s}`;
  await consultar(
    `with s as (
       insert into servicio (nombre, slug, resumen, orden) values ($1, $2, 'Servicio de prueba.', 99) on conflict do nothing returning id
     ), v as (insert into variante (servicio_id, nombre, orden) select id, 'Única', 1 from s returning id)
     insert into precio (variante_id, tamano_id, monto, created_by)
     select v.id, (select id from tamano_vehiculo order by orden limit 1), 300, (select id from usuario where nombre_usuario = 'dueno') from v`,
    [unica, `de-una-variante-${s.toLowerCase()}`],
  );
  const conUnica = await crearConsulta(info, 6);
  const conVarias = await crearConsulta(info, 7);
  await consultar("update consulta set servicio_id = (select id from servicio where nombre = $2) where id = $1", [conUnica, unica]);
  await consultar("update consulta set servicio_id = (select id from servicio where nombre = $2) where id = $1", [conVarias, varias]);
  await ingresarComoDueno(page);

  // Una sola variante: elegida, con su precio, y el total al pie
  await page.goto(`/panel/consultas/${conUnica}/cotizar`);
  await expect(servicio(page, 1)).toHaveValue(/\d+/);
  await expect(servicio(page, 1).locator("option:checked")).toHaveText(unica);
  await expect(precio(page, 1)).toHaveValue("300");
  // El total del pie (el resumen de arriba lo anuncia; este no se repite al lector de pantalla)
  await expect(page.locator("form p[aria-hidden]")).toHaveText(/Total\s*300 Bs/);

  // Varias variantes: una línea para elegir cuál
  await page.goto(`/panel/consultas/${conVarias}/cotizar`);
  await expect(servicio(page, 1)).toHaveValue("");
  await expect(servicio(page, 2)).toHaveCount(0);
});
