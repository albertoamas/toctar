import { expect, test, type TestInfo } from "@playwright/test";
import { consultar, crearClienteEnBase, crearUsuario, ingresar, PNG } from "./apoyo";

// HU-32 Registrar pagos y saldo. Especificación: docs/08-desarrollo/etapas/C3-agenda-pagos.md §9.
// Encargados por prueba (no el dueño: el límite de intentos de ingreso es por usuario). Días propios, a 320 (celular)
// o 340 (escritorio) días de hoy, lejos de las demás pruebas de la agenda.

const sufijo = (info: TestInfo) => (info.project.name === "celular" ? "c" : "e");

/** Una reserva agendada en la base, con un servicio de 500 Bs y, si se pide, un adelanto de 150 en efectivo. */
async function reserva(info: TestInfo, placa: string, conAdelanto: boolean): Promise<number> {
  const [{ id }] = await consultar<{ id: number }>(
    `insert into trabajo (sucursal_id, cliente_id, vehiculo_id, espacio_id, fecha_inicio, fecha_fin, created_by)
     select e.sucursal_id, v.cliente_id, v.id, e.id, current_date + $2::int, current_date + $2::int, v.created_by
     from vehiculo v, (select * from espacio_taller where activo order by orden limit 1) e where v.placa = $1 returning id`,
    [placa, (info.project.name === "celular" ? 320 : 340) + (conAdelanto ? 0 : 5)],
  );
  await consultar(
    `insert into trabajo_linea (trabajo_id, variante_id, descripcion, precio, orden)
     select $1, (select id from variante order by id limit 1), 'Lavado completo', 500, 0`,
    [id],
  );
  if (conAdelanto) await consultar("insert into pago (trabajo_id, monto, metodo, tipo, fecha, created_by) select $1, 150, 'efectivo', 'adelanto', current_date, created_by from trabajo where id = $1", [id]);
  return id;
}

const saldo = (page: import("@playwright/test").Page) => page.getByText("Saldo", { exact: true }).locator("xpath=following-sibling::dd[1]");

test("registrar un pago con comprobante, no pasar el saldo y anular con motivo", async ({ page }, info) => {
  const s = sufijo(info);
  const placa = `PG32${s.toUpperCase()}1`;
  const clienteId = await crearClienteEnBase({ nombre: `Paga ${s}`, telefono: `5917${s === "c" ? 7 : 8}3200010`, placa });
  const id = await reserva(info, placa, true);
  await crearUsuario({ usuario: `caja-hu32-${s}`, nombre: "Encargado de caja", contrasena: "encargado-123", rol: "encargado", permisos: ["agenda", "pagos", "clientes"] });
  await ingresar(page, `caja-hu32-${s}`, "encargado-123");
  await expect(page).toHaveURL(/\/panel$/);

  await page.goto(`/panel/agenda/${id}`);
  await expect(saldo(page)).toHaveText("350 Bs");
  await page.getByRole("button", { name: "Registrar pago" }).click();
  const form = page.getByRole("form", { name: "Registrar pago" });
  // El monto viene con el saldo y el tipo, "Saldo" (ya dejó adelanto)
  await expect(form.getByLabel("Monto")).toHaveValue("350");
  await expect(form.getByRole("radio", { name: "Saldo" })).toBeChecked();

  // No pasa el saldo
  await form.getByLabel("Monto").fill("400");
  await form.getByText("QR", { exact: true }).click();
  await form.getByRole("button", { name: "Registrar pago" }).click();
  await expect(form.getByText("El pago no puede ser mayor que el saldo (350 Bs).")).toBeVisible();
  await expect(form.getByLabel("Monto")).toBeFocused();

  // 200 por QR, con la foto del comprobante
  await form.getByLabel("Monto").fill("200");
  await form.locator("#comprobante").setInputFiles({ name: "comprobante.png", mimeType: "image/png", buffer: PNG });
  await expect(form.getByRole("img", { name: "Foto del comprobante elegida" })).toBeVisible();
  await form.getByRole("button", { name: "Registrar pago" }).click();
  await expect(page.getByText("Pago de 200 Bs registrado. Saldo: 150 Bs.")).toBeVisible();
  await expect(saldo(page)).toHaveText("150 Bs");
  const [c] = await consultar<{ privado: boolean; clave: string }>(
    "select a.privado, a.clave from pago p join archivo a on a.id = p.comprobante_archivo_id where p.trabajo_id = $1",
    [id],
  );
  expect(c.privado).toBe(true);
  expect(c.clave).toMatch(/^comprobantes\//);
  // El comprobante se ve en grande
  await page.getByRole("button", { name: /^Ver el comprobante: Saldo por QR de 200 Bs/ }).click();
  await expect(page.getByRole("dialog").getByRole("img", { name: /^Comprobante: Saldo por QR/ })).toBeVisible();
  await page.keyboard.press("Escape");

  // Anular el adelanto: pide motivo, queda tachado y deja de contar
  await page.getByRole("button", { name: /^Anular Adelanto en efectivo de 150 Bs/ }).click();
  const anular = page.getByRole("form", { name: /^Anular Adelanto en efectivo/ });
  await anular.getByRole("button", { name: "Anular pago" }).click();
  await expect(anular.getByText("Escribe el motivo.")).toBeVisible();
  await anular.getByLabel("Motivo").fill("Se cargó por error");
  await anular.getByRole("button", { name: "Anular pago" }).click();
  await expect(page.getByText("Pago anulado.")).toBeVisible();
  await expect(page.getByText("Anulado: Se cargó por error")).toBeVisible();
  await expect(saldo(page)).toHaveText("300 Bs");

  const auditoria = await consultar<{ accion: string }>(
    "select accion from auditoria where entidad = 'pago' and entidad_id in (select id from pago where trabajo_id = $1) order by id",
    [id],
  );
  expect(auditoria.map((a) => a.accion)).toEqual(["crear", "anular"]);

  // En la ficha del cliente, la reserva con su saldo
  await page.goto(`/panel/clientes/${clienteId}`);
  await expect(page.getByRole("list", { name: "Reservas" }).getByRole("link")).toContainText("Saldo: 300 Bs");
});

test("pagada por completo no ofrece más pagos; sin Pagos no se ven montos", async ({ page }, info) => {
  const s = sufijo(info);
  const placa = `PG32${s.toUpperCase()}2`;
  const clienteId = await crearClienteEnBase({ nombre: `Sin deuda ${s}`, telefono: `5917${s === "c" ? 7 : 8}3200020`, placa });
  const id = await reserva(info, placa, false);
  await consultar("insert into pago (trabajo_id, monto, metodo, tipo, fecha, created_by) select $1, 500, 'qr', 'saldo', current_date, created_by from trabajo where id = $1", [id]);
  await crearUsuario({ usuario: `caja2-hu32-${s}`, nombre: "Encargado de caja", contrasena: "encargado-123", rol: "encargado", permisos: ["agenda", "pagos"] });
  await ingresar(page, `caja2-hu32-${s}`, "encargado-123");
  await expect(page).toHaveURL(/\/panel$/);
  await page.goto(`/panel/agenda/${id}`);
  await expect(page.getByText("Pagado por completo.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Registrar pago" })).toHaveCount(0);

  // El encargado con Agenda y Clientes, sin Pagos: ni montos ni pagos, tampoco en la ficha
  await page.context().clearCookies();
  await crearUsuario({ usuario: `agenda-hu32-${s}`, nombre: "Encargado de agenda", contrasena: "encargado-123", rol: "encargado", permisos: ["agenda", "clientes"] });
  await ingresar(page, `agenda-hu32-${s}`, "encargado-123");
  await expect(page).toHaveURL(/\/panel$/);
  await page.goto(`/panel/agenda/${id}`);
  await expect(page.getByRole("heading", { name: placa })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Pagos" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Registrar pago" })).toHaveCount(0);
  await page.goto(`/panel/clientes/${clienteId}`);
  await expect(page.getByRole("list", { name: "Reservas" })).toBeVisible();
  await expect(page.getByText(/Saldo|Pagado/)).toHaveCount(0);
  // La reserva directa lleva precios: sin Pagos no se ofrece
  await expect(page.getByRole("link", { name: "Nueva reserva" })).toHaveCount(0);
});
