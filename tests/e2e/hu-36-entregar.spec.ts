import { expect, test, type TestInfo } from "@playwright/test";
import { consultar, crearClienteEnBase, crearOrdenLista, crearUsuario, entregarSinFirma, firmarEnRecuadro, ingresar, ingresarComoDueno } from "./apoyo";

// HU-36 Entregar vehículo (flujo crítico 4). Especificación: docs/08-desarrollo/etapas/C4-taller-entrega.md §9.
// Las órdenes van directo a la base, listas, en días propios lejos de hoy (1000 o 1100) para no chocar con otras pruebas.
test.describe.configure({ mode: "serial" });

const sufijo = (info: TestInfo) => (info.project.name === "celular" ? "c" : "e");
const telefono = (info: TestInfo, n: number) => `5917${info.project.name === "celular" ? 5 : 6}3600${n}0`;
const dias = (info: TestInfo) => (info.project.name === "celular" ? 1000 : 1100);
const hoy = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/La_Paz" }).format(new Date());

test("pagada: el dueño suma un adicional, se cobra y se entrega; queda programado el mantenimiento", async ({ page }, info) => {
  const s = sufijo(info);
  const placa = `EN36${s.toUpperCase()}1`;
  await crearClienteEnBase({ nombre: `Entrega ${s}`, telefono: telefono(info, 1), placa });
  const id = await crearOrdenLista({ placa, espacio: 0, dias: dias(info), precio: 1000, pagado: 1000 });

  await ingresarComoDueno(page);
  await page.goto(`/panel/ordenes/${id}`);
  // Un adicional: sube el precio final (RF-43)
  await page.getByRole("button", { name: "Agregar servicio" }).click();
  const form = page.getByRole("form", { name: "Agregar servicio" });
  await form.getByLabel("Servicio", { exact: true }).selectOption({ index: 1 });
  // Si el servicio tiene opciones (1 año, 2 años…), aparece su menú (pulido 9.4)
  const opcion = form.getByLabel("Opción del servicio");
  if (await opcion.count()) await opcion.selectOption({ index: 1 });
  await form.getByLabel("Precio").fill("200");
  await form.getByRole("button", { name: "Agregar" }).click();
  await expect(page.getByText("Servicio agregado. Precio final: 1200 Bs.")).toBeVisible();
  await expect(page.getByText("Precio cotizado")).toBeVisible();
  await expect(page.getByText("Adicional", { exact: true })).toBeVisible();

  // El saldo de 200 se cobra en la entrega
  await page.getByRole("link", { name: "Entregar vehículo" }).click();
  await expect(page).toHaveURL(new RegExp(`/panel/ordenes/${id}/entregar$`));
  await expect(page.getByText(/^Se programará: Mantenimiento del nano cerámico, el \d{2}\/\d{2}\/\d{4}\.$/)).toBeVisible();
  await page.getByRole("button", { name: "Registrar pago" }).click();
  const pagoForm = page.getByRole("form", { name: "Registrar pago" });
  await expect(pagoForm.getByLabel("Monto")).toHaveValue("200");
  await pagoForm.getByText("Efectivo", { exact: true }).click();
  await pagoForm.getByRole("button", { name: "Registrar pago" }).click();
  await expect(page.getByText("Pago de 200 Bs registrado. Saldo: 0 Bs.")).toBeVisible();

  const entrega = page.getByRole("form", { name: "Entregar vehículo" });
  // Pagada: ninguna casilla de saldo (solo la de "Entregar sin firma")
  await expect(entrega.getByRole("checkbox")).toHaveCount(1);
  // El cliente firma (pedido 13); el nombre llega el del cliente y se cambia si retira otra persona
  await expect(entrega.getByLabel("Nombre de quien recibe")).toHaveValue(`Entrega ${s}`);
  await firmarEnRecuadro(page);
  await entrega.getByLabel("Nombre de quien recibe").fill(`Hermana de Entrega ${s}`);
  await entrega.getByRole("button", { name: "Entregar vehículo" }).click();
  await expect(page).toHaveURL(new RegExp(`/panel/ordenes/${id}\\?entregado=1$`));
  // Entregada, el encabezado dice cuándo: la entrega "aproximada" ya no se muestra (recorrido de la Entrega 2)
  const datos = page.getByLabel("Datos de la orden");
  await expect(datos).toContainText("Espacio");
  await expect(datos.getByText("Entrega", { exact: true })).toHaveCount(0);
  await expect(datos).not.toContainText("aproximada");
  await expect(page.getByRole("status").filter({ hasText: "Vehículo entregado." })).toBeVisible();
  await expect(page.getByText(/^Entregado el /)).toBeVisible();
  const firma = page.getByRole("region", { name: "Firma de entrega" });
  await expect(firma).toContainText(`Recibido conforme por Hermana de Entrega ${s}.`);
  await expect(firma.getByRole("img", { name: `Firma de Hermana de Entrega ${s}` })).toBeVisible();
  const [f] = await consultar<{ nombre: string; privado: boolean; motivo: string | null }>(
    "select t.firma_nombre as nombre, a.privado, t.sin_firma_motivo as motivo from trabajo t join archivo a on a.id = t.firma_archivo_id where t.id = $1",
    [id],
  );
  expect(f).toEqual({ nombre: `Hermana de Entrega ${s}`, privado: true, motivo: null });

  // El plan (pedido 21): el mantenimiento y la frecuencia que dice el catálogo del pulido
  const [{ meses, mantenimiento }] = await consultar<{ meses: number; mantenimiento: number }>(
    "select mantenimiento_meses as meses, mantenimiento_servicio_id as mantenimiento from servicio where slug = 'pulido-y-nano-ceramico'",
  );
  const [t] = await consultar<{ estado: string; saldo: string; autorizo: number | null; recordatorios: number; fecha: string; esperada: string; plan: number; cada: number }>(
    `select t.estado, t.saldo_al_entregar as saldo, t.entrega_con_saldo_autorizada_por as autorizo,
       (select count(*)::int from recordatorio_mantenimiento r where r.trabajo_origen_id = t.id) as recordatorios,
       (select to_char(r.fecha_programada, 'YYYY-MM-DD') from recordatorio_mantenimiento r where r.trabajo_origen_id = t.id) as fecha,
       (select r.servicio_mantenimiento_id from recordatorio_mantenimiento r where r.trabajo_origen_id = t.id) as plan,
       (select r.intervalo_meses from recordatorio_mantenimiento r where r.trabajo_origen_id = t.id) as cada,
       to_char($2::date + make_interval(months => $3), 'YYYY-MM-DD') as esperada
     from trabajo t where t.id = $1`,
    [id, hoy(), meses],
  );
  expect(t).toMatchObject({ estado: "entregado", saldo: "0.00", autorizo: null, recordatorios: 1, plan: mantenimiento, cada: meses });
  expect(t.fecha).toBe(t.esperada);

  // El técnico de la orden ve la firma (pedido 13): no es un precio ni un teléfono
  await crearUsuario({ usuario: `tec-hu36-${s}`, nombre: `Técnico Entrega ${s}`, contrasena: "tecnico-123", rol: "tecnico" });
  await consultar("update trabajo set tecnico_id = (select id from usuario where nombre_usuario = $2) where id = $1", [id, `tec-hu36-${s}`]);
  await page.context().clearCookies();
  await ingresar(page, `tec-hu36-${s}`, "tecnico-123");
  await expect(page).toHaveURL(/\/panel$/);
  await page.goto(`/panel/ordenes/${id}`);
  const vista = page.getByRole("region", { name: "Firma de entrega" });
  await expect(vista).toContainText(`Recibido conforme por Hermana de Entrega ${s}.`);
  await expect(vista.getByRole("img", { name: `Firma de Hermana de Entrega ${s}` })).toHaveJSProperty("complete", true);
  expect(await vista.getByRole("img").evaluate((i: HTMLImageElement) => i.naturalWidth)).toBeGreaterThan(0);
});

test("con saldo: el encargado sin el permiso no entrega; con el permiso sí, y queda quién lo autorizó (RN-13)", async ({ page }, info) => {
  const s = sufijo(info);
  const placa = `EN36${s.toUpperCase()}2`;
  await crearClienteEnBase({ nombre: `Debe ${s}`, telefono: telefono(info, 2), placa });
  const id = await crearOrdenLista({ placa, espacio: 1, dias: dias(info), precio: 500, pagado: 200 });
  await crearUsuario({ usuario: `sinperm-hu36-${s}`, nombre: "Encargado sin permiso", contrasena: "encargado-123", rol: "encargado", permisos: ["ordenes", "pagos"] });
  await crearUsuario({ usuario: `conperm-hu36-${s}`, nombre: "Encargada con permiso", contrasena: "encargado-123", rol: "encargado", permisos: ["ordenes", "pagos", "entrega_con_saldo"] });

  await ingresar(page, `sinperm-hu36-${s}`, "encargado-123");
  await expect(page).toHaveURL(/\/panel$/);
  await page.goto(`/panel/ordenes/${id}`);
  // El encargado no suma adicionales: pone precio
  await expect(page.getByRole("button", { name: "Agregar servicio" })).toHaveCount(0);
  await page.goto(`/panel/ordenes/${id}/entregar`);
  await expect(page.getByText("Queda saldo pendiente. La entrega con saldo la autoriza el dueño o quien tenga el permiso.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Entregar vehículo" })).toHaveCount(0);

  // Puede autorizar pero no ve pagos: el aviso no dice el monto (RN-12)
  await page.context().clearCookies();
  await crearUsuario({ usuario: `sinpagos-hu36-${s}`, nombre: "Encargado sin pagos", contrasena: "encargado-123", rol: "encargado", permisos: ["ordenes", "entrega_con_saldo"] });
  await ingresar(page, `sinpagos-hu36-${s}`, "encargado-123");
  await expect(page).toHaveURL(/\/panel$/);
  await page.goto(`/panel/ordenes/${id}/entregar`, { waitUntil: "networkidle" });
  await expect(page.getByText("Queda saldo pendiente.", { exact: true })).toBeVisible();
  await entregarSinFirma(page);
  await page.getByRole("form", { name: "Entregar vehículo" }).getByRole("button", { name: "Entregar vehículo" }).click();
  await expect(page.getByText("Queda un saldo: marca «Entregar con saldo pendiente» para confirmar.")).toBeVisible();
  await expect(page.getByText(/300 Bs/)).toHaveCount(0);

  await page.context().clearCookies();
  await ingresar(page, `conperm-hu36-${s}`, "encargado-123");
  await expect(page).toHaveURL(/\/panel$/);
  await page.goto(`/panel/ordenes/${id}/entregar`, { waitUntil: "networkidle" });
  const entrega = page.getByRole("form", { name: "Entregar vehículo" });
  await entregarSinFirma(page, "Se lo lleva el chofer de la empresa.");
  await entrega.getByRole("button", { name: "Entregar vehículo" }).click();
  await expect(entrega.getByText("Queda un saldo de 300 Bs: marca «Entregar con saldo pendiente» para confirmar.")).toBeVisible();
  await entrega.getByText("Entregar con saldo pendiente (300 Bs)").click();
  await entrega.getByRole("button", { name: "Entregar vehículo" }).click();
  await expect(page).toHaveURL(new RegExp(`/panel/ordenes/${id}\\?entregado=1$`));
  await expect(page.getByRole("status").filter({ hasText: "Vehículo entregado con saldo de 300 Bs." })).toBeVisible();
  await expect(page.getByText(/Con saldo de 300 Bs, autorizado por Encargada con permiso\.$/)).toBeVisible();
  await expect(page.getByRole("region", { name: "Firma de entrega" })).toContainText("Entregado sin firma: Se lo lleva el chofer de la empresa.")
  // Entregada con saldo: se sigue cobrando (HU-37)
  await expect(page.getByRole("button", { name: "Registrar pago" })).toBeVisible();

  const [{ autorizo }] = await consultar<{ autorizo: string }>("select u.nombre_usuario as autorizo from trabajo t join usuario u on u.id = t.entrega_con_saldo_autorizada_por where t.id = $1", [id]);
  expect(autorizo).toBe(`conperm-hu36-${s}`);
  const [{ accion }] = await consultar<{ accion: string }>("select accion from auditoria where entidad = 'trabajo' and entidad_id = $1 order by id desc limit 1", [id]);
  expect(accion).toBe("entregar");
});

test("sin firma ni «Entregar sin firma» no se entrega; sin firma pide el motivo (pedido 13)", async ({ page }, info) => {
  const s = sufijo(info);
  const placa = `EN36${s.toUpperCase()}3`;
  await crearClienteEnBase({ nombre: `Sin firma ${s}`, telefono: telefono(info, 3), placa });
  const id = await crearOrdenLista({ placa, espacio: 2, dias: dias(info), precio: 500, pagado: 500 });
  await ingresarComoDueno(page);
  await page.goto(`/panel/ordenes/${id}/entregar`, { waitUntil: "networkidle" });
  const entrega = page.getByRole("form", { name: "Entregar vehículo" });

  await entrega.getByRole("button", { name: "Entregar vehículo" }).click();
  await expect(entrega.getByText("Falta la firma del cliente, o marca «Entregar sin firma».")).toBeVisible();
  // Borrar el nombre también se avisa
  await firmarEnRecuadro(page);
  await entrega.getByLabel("Nombre de quien recibe").fill("");
  await entrega.getByRole("button", { name: "Entregar vehículo" }).click();
  await expect(entrega.getByText("Escribe el nombre de quien recibe.")).toBeVisible();

  // Sin firma: el motivo, obligatorio
  await entrega.getByText("Entregar sin firma", { exact: true }).click();
  await expect(page.getByRole("img", { name: "Recuadro para la firma del cliente" })).toHaveCount(0);
  await entrega.getByRole("button", { name: "Entregar vehículo" }).click();
  await expect(entrega.getByText("Cuenta por qué no firma.")).toBeVisible();
  await entrega.getByLabel("Motivo").fill("El cliente mandó a su hijo.");
  await entrega.getByRole("button", { name: "Entregar vehículo" }).click();
  await expect(page).toHaveURL(new RegExp(`/panel/ordenes/${id}\\?entregado=1$`));
  await expect(page.getByRole("region", { name: "Firma de entrega" })).toContainText("Entregado sin firma: El cliente mandó a su hijo.");
  const [t] = await consultar<{ firma: number | null; nombre: string | null; motivo: string; conFirma: boolean }>(
    `select t.firma_archivo_id as firma, t.firma_nombre as nombre, t.sin_firma_motivo as motivo, (a.datos->>'conFirma')::boolean as "conFirma"
     from trabajo t join auditoria a on a.entidad = 'trabajo' and a.entidad_id = t.id and a.accion = 'entregar' where t.id = $1`,
    [id],
  );
  expect(t).toEqual({ firma: null, nombre: null, motivo: "El cliente mandó a su hijo.", conFirma: false });
});
