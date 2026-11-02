import { expect, test, type TestInfo } from "@playwright/test";
import { abrirWhatsApp, consultar, crearClienteEnBase, crearUsuario, firmarEnRecuadro, ingresar, ingresarComoDueno, PNG, revisarChecklistEnBase } from "./apoyo";

// Flujos críticos 3, 4 y 5 de punta a punta (C4): reserva → recibir → el técnico la trabaja → lista → aviso por
// WhatsApp → cobro del saldo → entrega → recordatorio de mantenimiento → agendarlo. Especificación:
// docs/08-desarrollo/etapas/C4-taller-entrega.md §9. Cada paso tiene su prueba propia (HU-30 a HU-38); aquí se prueba
// que encajan. La reserva de hoy va directo a la base, en un espacio propio y desactivado (ninguna otra prueba lo usa;
// agendarla desde la pantalla, HU-30, ofrecería solo los activos). El mantenimiento se agenda en días propios (360 o 363:
// se agenda hasta un año adelante).
test.describe.configure({ mode: "serial" });

const sufijo = (info: TestInfo) => (info.project.name === "celular" ? "c" : "e");
const hoy = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/La_Paz" }).format(new Date());

test("del día de ingreso al próximo mantenimiento agendado", async ({ page }, info) => {
  const s = sufijo(info);
  const placa = `FL00${s.toUpperCase()}1`;
  const clienteId = await crearClienteEnBase({ nombre: `Rosa Flujo ${s}`, telefono: `5917${info.project.name === "celular" ? 5 : 6}39000`, placa });
  await crearUsuario({ usuario: `tec-flujo-${s}`, nombre: `Técnico Flujo ${s}`, contrasena: "tecnico-123", rol: "tecnico" });
  const [{ espacio }] = await consultar<{ espacio: number }>(
    `insert into espacio_taller (sucursal_id, nombre, orden, activo) select sucursal_id, $1, 91, false from espacio_taller limit 1 returning id as espacio`,
    [`Espacio flujo ${s}`],
  );
  // Reserva de hoy: pulido y nano cerámico (genera mantenimiento) de 800 Bs, con 300 de adelanto
  const [{ id }] = await consultar<{ id: number }>(
    `insert into trabajo (sucursal_id, cliente_id, vehiculo_id, espacio_id, fecha_inicio, fecha_fin, created_by)
     select e.sucursal_id, v.cliente_id, v.id, e.id, $3::date, $3::date, v.created_by from vehiculo v, espacio_taller e
     where v.placa = $1 and e.id = $2 returning id`,
    [placa, espacio, hoy()],
  );
  await consultar(
    `insert into trabajo_linea (trabajo_id, variante_id, descripcion, precio, orden)
     select $1, v.id, 'Pulido y nano cerámico', 800, 0 from variante v join servicio s on s.id = v.servicio_id
     where s.slug = 'pulido-y-nano-ceramico' order by v.id limit 1`,
    [id],
  );
  await consultar("insert into pago (trabajo_id, monto, metodo, tipo, fecha, created_by) select $1, 300, 'qr', 'adelanto', current_date, created_by from trabajo where id = $1", [id]);

  // 1. El dueño recibe el vehículo, con una foto de ingreso, y se lo asigna al técnico
  await ingresarComoDueno(page);
  await page.goto(`/panel/agenda/${id}`);
  await page.getByRole("link", { name: "Recibir vehículo" }).click();
  await expect(page.getByRole("button", { name: "Tomar foto" }).first()).toBeEnabled();
  await page.getByLabel("Cámara para fotos de ingreso").setInputFiles({ name: "frente.png", mimeType: "image/png", buffer: PNG });
  await expect(page.getByText("Foto guardada.")).toBeVisible();
  const recepcion = page.getByRole("form", { name: "Recibir vehículo" });
  await recepcion.getByLabel("Técnico").selectOption({ label: `Técnico Flujo ${s}` });
  await revisarChecklistEnBase(id);
  await recepcion.getByRole("button", { name: "Recibir vehículo" }).click();
  await expect(page).toHaveURL(new RegExp(`/panel/ordenes/${id}\\?recibido=1$`));

  // 2. El técnico la trabaja y la marca lista
  await page.context().clearCookies();
  await ingresar(page, `tec-flujo-${s}`, "tecnico-123");
  await expect(page).toHaveURL(/\/panel$/);
  await page.goto(`/panel/ordenes/${id}`);
  const pasos = page.getByRole("region", { name: "Estado de la orden" });
  await pasos.getByRole("button", { name: "Empezar trabajo" }).click();
  await expect(pasos.locator('[aria-current="step"]')).toHaveText("En proceso");
  await pasos.getByRole("button", { name: "Marcar listo" }).click();
  await expect(pasos.locator('[aria-current="step"]')).toHaveText("Lista");

  // 3. El dueño avisa por WhatsApp, con el saldo
  await page.context().clearCookies();
  await ingresarComoDueno(page);
  await page.goto(`/panel/ordenes/${id}`);
  const enlace = await abrirWhatsApp(page, page.getByRole("button", { name: "Avisar por WhatsApp" }));
  expect(enlace).toContain("ya está listo en");
  expect(enlace).toContain("Saldo pendiente: 500 Bs.");
  await expect(page.getByRole("button", { name: "Volver a avisar" })).toBeVisible();

  // 4. Cobra el saldo y entrega: queda programado el mantenimiento
  await page.getByRole("link", { name: "Entregar vehículo" }).click();
  await expect(page.getByText(/^Se programará: Mantenimiento del nano cerámico, el \d{2}\/\d{2}\/\d{4}\.$/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Registrar pago" })).toBeEnabled();
  await page.getByRole("button", { name: "Registrar pago" }).click();
  const pago = page.getByRole("form", { name: "Registrar pago" });
  await expect(pago.getByLabel("Monto")).toHaveValue("500");
  await pago.getByText("Efectivo", { exact: true }).click();
  await pago.getByRole("button", { name: "Registrar pago" }).click();
  await expect(page.getByText("Pago de 500 Bs registrado. Saldo: 0 Bs.")).toBeVisible();
  // El cliente firma que lo recibe conforme (pedido 13)
  await firmarEnRecuadro(page);
  await page.getByRole("form", { name: "Entregar vehículo" }).getByRole("button", { name: "Entregar vehículo" }).click();
  await expect(page).toHaveURL(new RegExp(`/panel/ordenes/${id}\\?entregado=1$`));
  const [{ recordatorioId }] = await consultar<{ recordatorioId: number }>('select id as "recordatorioId" from recordatorio_mantenimiento where trabajo_origen_id = $1', [id]);

  // 5. Pasan los meses (se adelanta la fecha en la base): le toca el mantenimiento y se agenda
  await consultar("update recordatorio_mantenimiento set fecha_programada = $2::date - 1 where id = $1", [recordatorioId, hoy()]);
  await page.goto("/panel/mantenimientos");
  const fila = page.getByRole("list", { name: "Vencidos" }).getByRole("listitem").filter({ hasText: placa });
  await expect(fila).toContainText("venció ayer");
  await fila.getByRole("link", { name: "Agendar" }).click();
  // Llega con su servicio de mantenimiento ya elegido (pedido 21); es un servicio cobrado del catálogo (RN-09) y el
  // precio lo pone el dueño
  await expect(page.getByLabel("Servicio 1", { exact: true }).locator("option:checked")).toHaveText("Mantenimiento del nano cerámico");
  await page.getByLabel("Precio del servicio 1").fill("350");
  const [{ d }] = await consultar<{ d: string }>("select to_char($1::date + $2::int, 'YYYY-MM-DD') as d", [hoy(), info.project.name === "celular" ? 360 : 363]);
  await page.getByLabel("Ingresa el").fill(d);
  const espacioReserva = page.getByLabel("Espacio", { exact: true });
  await expect(espacioReserva).toBeEnabled();
  await espacioReserva.selectOption({ index: 1 });
  await page.getByRole("checkbox", { name: "Sin adelanto" }).check();
  await page.getByRole("button", { name: "Agendar" }).click();
  await expect(page).toHaveURL(/\/panel\/agenda\/\d+\?agendada=1$/);
  const reservaId = Number(new URL(page.url()).pathname.split("/").at(-1));

  const [r] = await consultar<{ estado: string; trabajo: number; cliente: number }>(
    "select estado, trabajo_agendado_id as trabajo, cliente_id as cliente from recordatorio_mantenimiento where id = $1",
    [recordatorioId],
  );
  expect(r).toEqual({ estado: "agendado", trabajo: reservaId, cliente: clienteId });
  const [t] = await consultar<{ estado: string; saldo: string }>("select estado, saldo_al_entregar as saldo from trabajo where id = $1", [id]);
  expect(t).toEqual({ estado: "entregado", saldo: "0.00" });
});
