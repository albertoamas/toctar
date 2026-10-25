import { expect, test, type TestInfo } from "@playwright/test";
import { consultar, crearClienteEnBase, crearUsuario, ingresar } from "./apoyo";

// HU-37 Saldos pendientes (flujo crítico 4, el cobro después de la entrega). Especificación:
// docs/08-desarrollo/etapas/C4-taller-entrega.md §9. Las órdenes van directo a la base, ya entregadas (no ocupan
// espacio en la agenda). Otras pruebas también dejan saldos: cada una mira solo su fila, por la placa.
test.describe.configure({ mode: "serial" });

const sufijo = (info: TestInfo) => (info.project.name === "celular" ? "c" : "e");
const telefono = (info: TestInfo, n: number) => `5917${info.project.name === "celular" ? 5 : 6}3700${n}0`;

/** Una orden entregada hace `dias` días, con un servicio de 600 Bs, el descuento y lo pagado. Devuelve su id. */
async function ordenEntregada(placa: string, dias: number, pagado: number, descuento = 0): Promise<number> {
  const [{ id }] = await consultar<{ id: number }>(
    `insert into trabajo (sucursal_id, cliente_id, vehiculo_id, espacio_id, fecha_inicio, fecha_fin, estado, recibido_at, listo_at,
       entregado_at, descuento, created_by)
     select e.sucursal_id, v.cliente_id, v.id, e.id, current_date - $2::int, current_date - $2::int, 'entregado', now(), now(),
       now() - make_interval(days => $2), $3, v.created_by
     from vehiculo v, (select * from espacio_taller where activo order by orden limit 1) e where v.placa = $1 returning id`,
    [placa, dias, descuento],
  );
  await consultar("insert into trabajo_linea (trabajo_id, variante_id, descripcion, precio, orden) select $1, (select id from variante order by id limit 1), 'Lavado completo', 600, 0", [id]);
  if (pagado > 0) await consultar("insert into pago (trabajo_id, monto, metodo, tipo, fecha, created_by) select $1, $2, 'efectivo', 'adelanto', current_date, created_by from trabajo where id = $1", [id, pagado]);
  return id;
}

test("la entregada con saldo aparece, con su WhatsApp, y se cobra desde la lista aunque no se vean órdenes", async ({ page }, info) => {
  const s = sufijo(info);
  const debe = `SL37${s.toUpperCase()}1`;
  const pago = `SL37${s.toUpperCase()}2`;
  const rebaja = `SL37${s.toUpperCase()}3`;
  await crearClienteEnBase({ nombre: `Debe Saldo ${s}`, telefono: telefono(info, 1), placa: debe });
  await crearClienteEnBase({ nombre: `Pagó Todo ${s}`, telefono: telefono(info, 2), placa: pago });
  await crearClienteEnBase({ nombre: `Descuento ${s}`, telefono: telefono(info, 3), placa: rebaja });
  await ordenEntregada(debe, 40, 200);
  await ordenEntregada(pago, 3, 600);
  // Un descuento mayor que el servicio deja el total en cero (calcularSaldo): no debe nada
  await ordenEntregada(rebaja, 5, 0, 700);
  // Solo "Pagos": cobra sin pasar por la orden
  await crearUsuario({ usuario: `caja-hu37-${s}`, nombre: "Encargado de caja", contrasena: "encargado-123", rol: "encargado", permisos: ["pagos"] });

  await ingresar(page, `caja-hu37-${s}`, "encargado-123");
  await expect(page).toHaveURL(/\/panel$/);
  // En el menú se llama por lo que muestra
  await page.getByRole("link", { name: "Saldos pendientes" }).first().click();
  await expect(page).toHaveURL(/\/panel\/pagos$/);
  await expect(page.getByText(/^Total por cobrar/)).toBeVisible();

  const lista = page.getByRole("list", { name: "Órdenes con saldo" });
  const fila = lista.getByRole("listitem").filter({ hasText: debe });
  await expect(fila).toContainText(`Debe Saldo ${s}`);
  await expect(fila).toContainText("400 Bs");
  await expect(fila).toContainText(/Entregada el \d{2}\/\d{2}(\/\d{4})?, hace 40 días/);
  // La que pagó todo y la del descuento mayor que el servicio no están
  await expect(lista.getByRole("listitem").filter({ hasText: pago })).toHaveCount(0);
  await expect(lista.getByRole("listitem").filter({ hasText: rebaja })).toHaveCount(0);
  // Sin "Órdenes", no se ofrece abrir la orden
  await expect(fila.getByRole("link", { name: "Ver la orden" })).toHaveCount(0);

  const enlace = decodeURIComponent((await fila.getByRole("link", { name: "Escribir por WhatsApp" }).getAttribute("href")) ?? "");
  expect(enlace).toMatch(/^https:\/\/wa\.me\/591\d{8}\?text=/);
  expect(enlace).toContain(`por el saldo de 400 Bs del servicio de tu vehículo (placa ${debe})`);

  // Se cobra ahí mismo y deja de figurar
  await fila.getByRole("button", { name: "Registrar pago" }).click();
  const form = page.getByRole("form", { name: "Registrar pago" });
  await expect(form.getByLabel("Monto")).toHaveValue("400");
  await form.getByText("QR", { exact: true }).click();
  await form.getByRole("button", { name: "Registrar pago" }).click();
  await expect(page.getByText("Pago de 400 Bs registrado. Saldo: 0 Bs.")).toBeVisible();
  await page.goto("/panel/pagos");
  await expect(page.getByRole("heading", { level: 1, name: "Saldos pendientes" })).toBeVisible();
  await expect(page.getByText(debe)).toHaveCount(0);
});

test("sin Pagos no se entra a los saldos; el técnico tampoco", async ({ page }, info) => {
  const s = sufijo(info);
  await crearUsuario({ usuario: `ordenes-hu37-${s}`, nombre: "Encargado de órdenes", contrasena: "encargado-123", rol: "encargado", permisos: ["ordenes"] });
  await ingresar(page, `ordenes-hu37-${s}`, "encargado-123");
  await expect(page).toHaveURL(/\/panel$/);
  await expect(page.getByRole("link", { name: "Saldos pendientes" })).toHaveCount(0);
  await page.goto("/panel/pagos");
  await expect(page).toHaveURL(/\/panel\/sin-acceso$/);

  await page.context().clearCookies();
  await crearUsuario({ usuario: `tec-hu37-${s}`, nombre: "Técnico", contrasena: "tecnico-123", rol: "tecnico" });
  await ingresar(page, `tec-hu37-${s}`, "tecnico-123");
  await expect(page).toHaveURL(/\/panel$/);
  await page.goto("/panel/pagos");
  await expect(page).toHaveURL(/\/panel\/sin-acceso$/);
});
