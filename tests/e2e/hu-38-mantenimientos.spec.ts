import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { abrirWhatsApp, consultar, crearClienteEnBase, crearUsuario, ingresar, ingresarComoDueno } from "./apoyo";

// HU-38 Recordatorios de mantenimiento (flujo crítico 5). Especificación: docs/08-desarrollo/etapas/C4-taller-entrega.md §9.
// Los recordatorios van directo a la base, colgados de una orden entregada en el pasado (no ocupa espacio). Las reservas
// que se agendan, en días propios (352 o 356: se agenda hasta un año adelante y los anteriores los usan otras pruebas). Otras pruebas también dejan recordatorios: cada una mira
// solo sus filas, por la placa. WhatsApp no se abre de verdad: la prueba responde por wa.me.
test.describe.configure({ mode: "serial" });

const sufijo = (info: TestInfo) => (info.project.name === "celular" ? "c" : "e");
const telefono = (info: TestInfo, n: number) => `5917${info.project.name === "celular" ? 5 : 6}3800${n}0`;
/** Hoy en Bolivia (la base corre en UTC: de noche ya sería mañana). */
const hoy = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/La_Paz" }).format(new Date());

const dia = async (desplazamiento: number) => (await consultar<{ d: string }>("select to_char($1::date + $2::int, 'YYYY-MM-DD') as d", [hoy(), desplazamiento]))[0].d;
const diaPropio = (info: TestInfo) => dia(info.project.name === "celular" ? 352 : 356);

/** Un recordatorio de "Pulido y nano cerámico" que vence dentro de `dias` (negativo: ya venció). Devuelve su id. */
async function recordatorio(placa: string, dias: number): Promise<number> {
  const [{ id }] = await consultar<{ id: number }>(
    `with t as (
       insert into trabajo (sucursal_id, cliente_id, vehiculo_id, espacio_id, fecha_inicio, fecha_fin, estado, recibido_at, listo_at, entregado_at, created_by)
       select e.sucursal_id, v.cliente_id, v.id, e.id, current_date - 100, current_date - 100, 'entregado', now(), now(), now() - interval '100 days', v.created_by
       from vehiculo v, (select * from espacio_taller where activo order by orden limit 1) e where v.placa = $1 returning id, cliente_id, vehiculo_id
     )
     insert into recordatorio_mantenimiento (trabajo_origen_id, cliente_id, vehiculo_id, servicio_id, fecha_programada)
     select t.id, t.cliente_id, t.vehiculo_id, (select id from servicio where slug = 'pulido-y-nano-ceramico'), $2::date + $3::int from t returning id`,
    [placa, hoy(), dias],
  );
  return id;
}

const estadoDe = async (id: number) =>
  (await consultar<{ estado: string; nota: string | null; avisado: boolean; trabajo: number | null }>(
    "select estado, nota, avisado_por is not null as avisado, trabajo_agendado_id as trabajo from recordatorio_mantenimiento where id = $1",
    [id],
  ))[0];

const vencidos = (page: Page) => page.getByRole("list", { name: "Vencidos" });
const proximos = (page: Page) => page.getByRole("list", { name: "Próximos 15 días" });

test("vencidos y próximos; avisar, no le interesa y agendar (y al cancelar la reserva, vuelve)", async ({ page }, info) => {
  const s = sufijo(info);
  const [placaV, placaP, placaN, placaL] = [1, 2, 3, 4].map((n) => `MT38${s.toUpperCase()}${n}`);
  const clienteV = await crearClienteEnBase({ nombre: `Lucía Vencida ${s}`, telefono: telefono(info, 1), placa: placaV });
  await crearClienteEnBase({ nombre: `Próximo ${s}`, telefono: telefono(info, 2), placa: placaP });
  await crearClienteEnBase({ nombre: `No Quiere ${s}`, telefono: telefono(info, 3), placa: placaN });
  await crearClienteEnBase({ nombre: `Lejano ${s}`, telefono: telefono(info, 4), placa: placaL });
  const vencido = await recordatorio(placaV, -10);
  await recordatorio(placaP, 5);
  const noQuiere = await recordatorio(placaN, 7);
  await recordatorio(placaL, 16);

  await ingresarComoDueno(page);
  await page.getByRole("link", { name: "Mantenimientos" }).first().click();
  await expect(page).toHaveURL(/\/panel\/mantenimientos$/);

  const filaV = vencidos(page).getByRole("listitem").filter({ hasText: placaV });
  await expect(filaV).toContainText(`Lucía Vencida ${s}`);
  await expect(filaV).toContainText("Mantenimiento de Pulido y nano cerámico");
  await expect(filaV).toContainText("venció hace 10 días");
  await expect(filaV).toContainText("Sin avisar");
  await expect(proximos(page).getByRole("listitem").filter({ hasText: placaP })).toContainText("vence en 5 días");
  // A 16 días todavía no se muestra
  await expect(page.getByText(placaL)).toHaveCount(0);

  // Avisar: abre WhatsApp con el mensaje y queda registrado
  const enlace = await abrirWhatsApp(page, filaV.getByRole("button", { name: "Avisar por WhatsApp" }));
  expect(enlace).toMatch(/^https:\/\/wa\.me\/591\d{8}\?text=/);
  expect(enlace).toContain(`Hola Lucía, te escribimos de`);
  expect(enlace).toContain(`a tu vehículo (placa ${placaV}) le toca el mantenimiento de Pulido y nano cerámico. ¿Te agendamos un día?`);
  await expect(filaV).toContainText(/Avisado el \d{2}\/\d{2} a las \d{2}:\d{2} por Dueño de prueba/);
  await expect(filaV.getByRole("button", { name: "Volver a avisar" })).toBeVisible();
  expect(await estadoDe(vencido)).toMatchObject({ estado: "avisado", avisado: true });

  // No le interesa, con nota: se cierra y deja la lista
  const filaN = proximos(page).getByRole("listitem").filter({ hasText: placaN });
  await filaN.getByRole("button", { name: "No le interesa" }).click();
  // En un modal, con el foco en "Volver": un Enter no lo cierra sin querer (pulido 12.2)
  const cerrar = page.getByRole("dialog", { name: "No le interesa" });
  await expect(cerrar.getByRole("button", { name: "Volver" })).toBeFocused();
  await cerrar.getByLabel("Nota (opcional)").fill("Vendió el vehículo");
  await cerrar.getByRole("button", { name: "Sí, no le interesa" }).click();
  await expect(page.getByText("Listo: no se le volverá a avisar.")).toBeVisible();
  await expect(page.getByText(placaN)).toHaveCount(0);
  expect(await estadoDe(noQuiere)).toMatchObject({ estado: "no_interesado", nota: "Vendió el vehículo" });
  // Cerrado, ya no se agenda desde un enlace viejo
  const [{ clienteN, vehiculoN }] = await consultar<{ clienteN: number; vehiculoN: number }>("select cliente_id as \"clienteN\", vehiculo_id as \"vehiculoN\" from recordatorio_mantenimiento where id = $1", [noQuiere]);
  await page.goto(`/panel/agenda/nueva?cliente=${clienteN}&vehiculo=${vehiculoN}&recordatorio=${noQuiere}`);
  await expect(page.getByText("Ese mantenimiento ya se agendó o se cerró.")).toBeVisible();

  // Agendar: una reserva directa del cliente y su vehículo, con el aviso del mantenimiento
  await page.goto("/panel/mantenimientos");
  await filaV.getByRole("link", { name: "Agendar" }).click();
  await expect(page).toHaveURL(new RegExp(`/panel/agenda/nueva\\?cliente=${clienteV}&vehiculo=\\d+&recordatorio=${vencido}$`));
  // El mantenimiento que se agenda, con su vencimiento en una insignia (pulido 10.2)
  // Solo lo visible: Next deja la página de Mantenimientos oculta en el documento, con el mismo texto
  await expect(page.getByText("Mantenimiento de Pulido y nano cerámico", { exact: true }).filter({ visible: true })).toBeVisible();
  await expect(page.getByText(/^Venció el \d{2}\/\d{2}(\/\d{4})?$/)).toBeVisible();
  // Desde un mantenimiento no se cambia el cliente: el recordatorio es suyo
  await expect(page.getByRole("link", { name: "Cambiar" })).toHaveCount(0);
  await page.getByRole("button", { name: "Agregar servicio" }).click();
  // El mantenimiento es un servicio cobrado del catálogo (RN-09); el precio, el que ponga el dueño
  await page.getByLabel("Servicio 1", { exact: true }).selectOption({ label: "Mantenimiento del nano cerámico" });
  await page.getByLabel("Precio del servicio 1").fill("350");
  await page.getByLabel("Ingresa el").fill(await diaPropio(info));
  const espacio = page.getByLabel("Espacio", { exact: true });
  await expect(espacio).toBeEnabled();
  await espacio.selectOption({ index: 1 });
  await page.getByRole("checkbox", { name: "Sin adelanto" }).check();
  await page.getByRole("button", { name: "Agendar" }).click();
  await expect(page).toHaveURL(/\/panel\/agenda\/\d+\?agendada=1$/);
  const reservaId = Number(new URL(page.url()).pathname.split("/").at(-1));
  expect(await estadoDe(vencido)).toMatchObject({ estado: "agendado", trabajo: reservaId });

  // Ya no está por avisar; en la ficha del cliente, agendado y con su reserva
  await page.goto("/panel/mantenimientos");
  await expect(page.getByRole("heading", { level: 1, name: "Mantenimientos" })).toBeVisible();
  await expect(page.getByText(placaV)).toHaveCount(0);
  await page.goto(`/panel/clientes/${clienteV}`);
  const delCliente = page.getByRole("list", { name: "Mantenimientos" }).getByRole("listitem");
  await expect(delCliente).toContainText("Pulido y nano cerámico");
  await expect(delCliente).toContainText("Agendado");
  await expect(delCliente.getByRole("link", { name: "Ver la reserva" })).toHaveAttribute("href", `/panel/agenda/${reservaId}`);

  // Si la reserva se cancela, el mantenimiento vuelve a la lista como estaba: avisado
  await page.goto(`/panel/agenda/${reservaId}`);
  // Desde "Más" (pulido 10.3)
  await page.getByRole("button", { name: "Más" }).click();
  await page.getByRole("menuitem", { name: "Cancelar reserva" }).click();
  const form = page.getByRole("form", { name: "Cancelar reserva" });
  await form.getByLabel("Motivo").fill("No pudo venir");
  await form.getByRole("button", { name: "Cancelar reserva" }).click();
  await expect(page.getByText("Reserva cancelada.")).toBeVisible();
  expect(await estadoDe(vencido)).toMatchObject({ estado: "avisado", trabajo: null });
  await page.goto("/panel/mantenimientos");
  await expect(vencidos(page).getByRole("listitem").filter({ hasText: placaV })).toContainText(/Avisado el/);
});

test("solo con Mantenimientos se entra; sin Agenda y Pagos no se agenda; el técnico no entra", async ({ page }, info) => {
  const s = sufijo(info);
  const placa = `MT38${s.toUpperCase()}5`;
  const clienteId = await crearClienteEnBase({ nombre: `Permisos ${s}`, telefono: telefono(info, 5), placa });
  const id = await recordatorio(placa, -2);
  await crearUsuario({ usuario: `mant-hu38-${s}`, nombre: "Encargada de mantenimientos", contrasena: "encargado-123", rol: "encargado", permisos: ["mantenimientos"] });
  await ingresar(page, `mant-hu38-${s}`, "encargado-123");
  await expect(page).toHaveURL(/\/panel$/);
  await page.getByRole("link", { name: "Mantenimientos" }).first().click();
  const fila = vencidos(page).getByRole("listitem").filter({ hasText: placa });
  await expect(fila.getByRole("button", { name: "Avisar por WhatsApp" })).toBeVisible();
  await expect(fila.getByRole("button", { name: "No le interesa" })).toBeVisible();
  // La reserva directa lleva precios: la arma quien ve agenda y pagos
  await expect(fila.getByRole("link", { name: "Agendar" })).toHaveCount(0);

  await page.context().clearCookies();
  await crearUsuario({ usuario: `caja-hu38-${s}`, nombre: "Encargado de caja", contrasena: "encargado-123", rol: "encargado", permisos: ["pagos", "agenda"] });
  await ingresar(page, `caja-hu38-${s}`, "encargado-123");
  await expect(page).toHaveURL(/\/panel$/);
  await expect(page.getByRole("link", { name: "Mantenimientos" })).toHaveCount(0);
  await page.goto("/panel/mantenimientos");
  await expect(page).toHaveURL(/\/panel\/sin-acceso$/);
  // Con un enlace de "Agendar" (de otra persona), se dice por qué no
  const [{ vehiculoId }] = await consultar<{ vehiculoId: number }>('select vehiculo_id as "vehiculoId" from recordatorio_mantenimiento where id = $1', [id]);
  await page.goto(`/panel/agenda/nueva?cliente=${clienteId}&vehiculo=${vehiculoId}&recordatorio=${id}`);
  await expect(page.getByText("Los mantenimientos los agenda el dueño o quien tiene «Mantenimientos».")).toBeVisible();

  await page.context().clearCookies();
  await crearUsuario({ usuario: `tec-hu38-${s}`, nombre: "Técnico", contrasena: "tecnico-123", rol: "tecnico" });
  await ingresar(page, `tec-hu38-${s}`, "tecnico-123");
  await expect(page).toHaveURL(/\/panel$/);
  await page.goto("/panel/mantenimientos");
  await expect(page).toHaveURL(/\/panel\/sin-acceso$/);
});
