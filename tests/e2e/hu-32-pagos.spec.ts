import { expect, test, type TestInfo } from "@playwright/test";
import { archivosArrastrados, consultar, crearClienteEnBase, crearOrdenLista, crearUsuario, ingresar, PNG } from "./apoyo";

// HU-32 Registrar pagos y saldo. Especificación: docs/08-desarrollo/etapas/C3-agenda-pagos.md §9.
// Encargados por prueba (no el dueño: el límite de intentos de ingreso es por usuario). Días propios, a 320 (celular)
// o 340 (escritorio) días de hoy, lejos de las demás pruebas de la agenda.

const sufijo = (info: TestInfo) => (info.project.name === "celular" ? "c" : "e");

/** Una reserva agendada en la base, con un servicio de 500 Bs y, si se pide, un adelanto de 150 en efectivo. `dia`: cada prueba, el suyo. */
async function reserva(info: TestInfo, placa: string, conAdelanto: boolean, dia = conAdelanto ? 0 : 5): Promise<number> {
  const [{ id }] = await consultar<{ id: number }>(
    `insert into trabajo (sucursal_id, cliente_id, vehiculo_id, espacio_id, fecha_inicio, fecha_fin, created_by)
     select e.sucursal_id, v.cliente_id, v.id, e.id, (now() at time zone 'America/La_Paz')::date + $2::int, (now() at time zone 'America/La_Paz')::date + $2::int, v.created_by
     from vehiculo v, (select * from espacio_taller where activo order by orden limit 1) e where v.placa = $1 returning id`,
    [placa, (info.project.name === "celular" ? 320 : 340) + dia],
  );
  await consultar(
    `insert into trabajo_linea (trabajo_id, variante_id, descripcion, precio, orden)
     select $1, (select id from variante order by id limit 1), 'Lavado completo', 500, 0`,
    [id],
  );
  if (conAdelanto) await consultar("insert into pago (trabajo_id, monto, metodo, tipo, fecha, created_by) select $1, 150, 'efectivo', 'adelanto', (now() at time zone 'America/La_Paz')::date, created_by from trabajo where id = $1", [id]);
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
  // El monto viene con el saldo
  await expect(form.getByLabel("Monto")).toHaveValue("350");
  // La fecha, plegada (pulido final de los pagos, 09/11), pero dice cuál se va a guardar; el tipo no se elige (pedido 46)
  await expect(form.getByLabel("Fecha")).toBeHidden();
  await expect(form.getByText("Ahora: hoy", { exact: true })).toBeVisible();
  await form.getByText("Cambiar fecha", { exact: true }).click();
  await expect(form.getByLabel("Fecha")).toBeVisible();
  await expect(form.getByRole("radio", { name: /^(Adelanto|Saldo)$/ })).toHaveCount(0);
  // El comprobante, solo con QR o transferencia; en efectivo no se ofrece
  await expect(form.locator("#comprobante")).toHaveCount(0);
  await form.getByText("Efectivo", { exact: true }).click();
  await expect(form.locator("#comprobante")).toHaveCount(0);
  await form.getByText("QR", { exact: true }).click();
  // Una foto elegida con QR no queda escondida al pasar a efectivo: al volver a QR, el campo está vacío
  await form.locator("#comprobante").setInputFiles({ name: "comprobante.png", mimeType: "image/png", buffer: PNG });
  await expect(form.getByRole("img", { name: "Foto del comprobante elegida" })).toBeVisible();
  await form.getByText("Efectivo", { exact: true }).click();
  await form.getByText("QR", { exact: true }).click();
  await expect(form.getByRole("img", { name: "Foto del comprobante elegida" })).toHaveCount(0);

  // La foto elegida no es un campo del formulario, pero perderla también se pregunta (C6, sistema-del-panel.md §4)
  await form.locator("#comprobante").setInputFiles({ name: "comprobante.png", mimeType: "image/png", buffer: PNG });
  await expect(form.getByRole("img", { name: "Foto del comprobante elegida" })).toBeVisible();
  // Un cierre que puede ser sin querer (Escape) pregunta en el pie del mismo modal (pulido 13.48)
  await page.keyboard.press("Escape");
  const pregunta = page.locator("[data-pregunta-salir]");
  await pregunta.getByRole("button", { name: "Seguir editando" }).click();
  await expect(pregunta).toHaveCount(0);
  await form.getByRole("button", { name: "Quitar foto" }).click();

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
  // Se puede cambiar y quitar; la zona vuelve, y también se le puede soltar (pulido 13.13)
  await form.getByRole("button", { name: "Quitar foto" }).click();
  const zona = form.locator("[data-zona-foto]");
  const soltado = await archivosArrastrados(page, [{ name: "comprobante.png", mimeType: "image/png", buffer: PNG }]);
  await zona.dispatchEvent("dragenter", { dataTransfer: soltado });
  await expect(zona).toContainText("Suelta la foto aquí");
  await zona.dispatchEvent("drop", { dataTransfer: soltado });
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
  // Pagado antes de que llegue el vehículo: es adelanto, aunque sea más que el sugerido (pedido 46)
  await page.getByRole("button", { name: /^Ver el comprobante: Adelanto por QR de 200 Bs/ }).click();
  await expect(page.getByRole("dialog").getByRole("img", { name: /^Comprobante: Adelanto por QR/ })).toBeVisible();
  await page.keyboard.press("Escape");

  // Anular el adelanto, desde el "⋯" del pago (pulido 13.49): pide motivo, queda tachado y deja de contar
  await page.getByRole("button", { name: /^Opciones del pago: Adelanto en efectivo de 150 Bs/ }).click();
  await page.getByRole("menuitem", { name: "Anular pago" }).click();
  const anular = page.getByRole("dialog", { name: "Anular pago" }).getByRole("form", { name: /^Anular Adelanto en efectivo/ });
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
  // Lo que debe, en el encabezado (pulido 8.3), como en Saldos pendientes: una reserva por venir todavía no se debe;
  // entregada con saldo, sí
  const encabezado = page.getByRole("heading", { level: 1 }).locator("..");
  await expect(encabezado).not.toContainText("Debe");
  await consultar("update trabajo set estado = 'entregado', recibido_at = now(), listo_at = now(), entregado_at = now() where id = $1", [id]);
  await page.reload();
  await expect(encabezado).toContainText("Debe 300 Bs");
});

test("pagada por completo no ofrece más pagos; sin Pagos no se ven montos", async ({ page }, info) => {
  const s = sufijo(info);
  const placa = `PG32${s.toUpperCase()}2`;
  const clienteId = await crearClienteEnBase({ nombre: `Sin deuda ${s}`, telefono: `5917${s === "c" ? 7 : 8}3200020`, placa });
  const id = await reserva(info, placa, false);
  await consultar("insert into pago (trabajo_id, monto, metodo, tipo, fecha, created_by) select $1, 500, 'qr', 'saldo', (now() at time zone 'America/La_Paz')::date, created_by from trabajo where id = $1", [id]);
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

// Pedido 46: el tipo lo dice cuándo se pagó, y se cobra lo que traiga el cliente (del adelanto al total; el tope es el saldo)
test("se cobra el total de una vez: antes de llegar es adelanto; al retirar, saldo", async ({ page }, info) => {
  const s = sufijo(info);
  const placaReserva = `PG32${s.toUpperCase()}3`;
  const placaOrden = `PG32${s.toUpperCase()}4`;
  await crearClienteEnBase({ nombre: `Paga todo ${s}`, telefono: `5917${s === "c" ? 7 : 8}3200030`, placa: placaReserva });
  await crearClienteEnBase({ nombre: `Paga al retirar ${s}`, telefono: `5917${s === "c" ? 7 : 8}3200040`, placa: placaOrden });
  const reservaId = await reserva(info, placaReserva, false, 8);
  const ordenId = await crearOrdenLista({ placa: placaOrden, espacio: 1, dias: info.project.name === "celular" ? 330 : 350, precio: 1000, pagado: 0 });
  await crearUsuario({ usuario: `caja3-hu32-${s}`, nombre: "Encargado de caja", contrasena: "encargado-123", rol: "encargado", permisos: ["agenda", "ordenes", "pagos"] });
  await ingresar(page, `caja3-hu32-${s}`, "encargado-123");
  await expect(page).toHaveURL(/\/panel$/);

  // La reserva sin adelanto: el cliente paga todo antes de traer el vehículo
  await page.goto(`/panel/agenda/${reservaId}`);
  await page.getByRole("button", { name: "Registrar pago" }).click();
  let form = page.getByRole("form", { name: "Registrar pago" });
  await expect(form.getByLabel("Monto")).toHaveValue("500");
  await form.getByText("Efectivo", { exact: true }).click();
  await form.getByRole("button", { name: "Registrar pago" }).click();
  await expect(page.getByText("Pago de 500 Bs registrado. Saldo: 0 Bs.")).toBeVisible();
  await expect(page.getByText("Pagado por completo.")).toBeVisible();
  await expect(page.getByRole("list", { name: "Pagos" })).toContainText("Adelanto en efectivo");

  // La orden lista, sin pagos: deja una parte y paga el resto al retirar; los dos son saldo
  await page.goto(`/panel/ordenes/${ordenId}`);
  await page.getByRole("button", { name: "Registrar pago" }).click();
  form = page.getByRole("form", { name: "Registrar pago" });
  await expect(form.getByLabel("Monto")).toHaveValue("1000");
  await form.getByLabel("Monto").fill("300");
  await expect(form.getByLabel("Monto")).toHaveValue("300");
  await form.getByText("Efectivo", { exact: true }).click();
  await form.getByRole("button", { name: "Registrar pago" }).click();
  await expect(page.getByText("Pago de 300 Bs registrado. Saldo: 700 Bs.")).toBeVisible();
  // El modal del primer pago ya se cerró
  await expect(page.getByRole("dialog")).toHaveCount(0);
  // Y la orden ya dice el saldo nuevo, sin recargar: lo renueva saldoCambiado (12/11)
  await expect(saldo(page)).toHaveText(/700/);
  await page.getByRole("main").getByRole("button", { name: "Registrar pago" }).click();
  form = page.getByRole("form", { name: "Registrar pago" });
  await expect(form.getByLabel("Monto")).toHaveValue("700");
  await form.getByText("Efectivo", { exact: true }).click();
  await form.getByRole("button", { name: "Registrar pago" }).click();
  await expect(page.getByText("Pago de 700 Bs registrado. Saldo: 0 Bs.")).toBeVisible();
  await expect(page.getByText("Pagado por completo.")).toBeVisible();

  const tipos = await consultar<{ trabajo: number; tipo: string; monto: string }>(
    "select trabajo_id as trabajo, tipo, monto from pago where trabajo_id in ($1, $2) order by id",
    [reservaId, ordenId],
  );
  expect(tipos).toEqual([
    { trabajo: reservaId, tipo: "adelanto", monto: "500.00" },
    { trabajo: ordenId, tipo: "saldo", monto: "300.00" },
    { trabajo: ordenId, tipo: "saldo", monto: "700.00" },
  ]);
});
