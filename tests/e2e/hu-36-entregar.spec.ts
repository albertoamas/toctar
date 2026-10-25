import { expect, test, type TestInfo } from "@playwright/test";
import { consultar, crearClienteEnBase, crearOrdenLista, crearUsuario, ingresar, ingresarComoDueno } from "./apoyo";

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
  await form.getByLabel("Servicio").selectOption({ index: 1 });
  await form.getByLabel("Precio").fill("200");
  await form.getByRole("button", { name: "Agregar" }).click();
  await expect(page.getByText("Servicio agregado. Precio final: 1200 Bs.")).toBeVisible();
  await expect(page.getByText("Precio cotizado")).toBeVisible();
  await expect(page.getByText("Adicional", { exact: true })).toBeVisible();

  // El saldo de 200 se cobra en la entrega
  await page.getByRole("link", { name: "Entregar vehículo" }).click();
  await expect(page).toHaveURL(new RegExp(`/panel/ordenes/${id}/entregar$`));
  await expect(page.getByText(/^Se programará el mantenimiento de Pulido y nano cerámico para el \d{2}\/\d{2}\/\d{4}\.$/)).toBeVisible();
  await page.getByRole("button", { name: "Registrar pago" }).click();
  const pagoForm = page.getByRole("form", { name: "Registrar pago" });
  await expect(pagoForm.getByLabel("Monto")).toHaveValue("200");
  await pagoForm.getByText("Efectivo", { exact: true }).click();
  await pagoForm.getByRole("button", { name: "Registrar pago" }).click();
  await expect(page.getByText("Pago de 200 Bs registrado. Saldo: 0 Bs.")).toBeVisible();

  const entrega = page.getByRole("form", { name: "Entregar vehículo" });
  await expect(entrega.getByRole("checkbox")).toHaveCount(0);
  await entrega.getByRole("button", { name: "Entregar vehículo" }).click();
  await expect(page).toHaveURL(new RegExp(`/panel/ordenes/${id}\\?entregado=1$`));
  await expect(page.getByRole("status").filter({ hasText: "Vehículo entregado." })).toBeVisible();
  await expect(page.getByText(/^Entregado el /)).toBeVisible();

  const [{ meses }] = await consultar<{ meses: number }>("select (valor #>> '{}')::int as meses from parametro where clave = 'intervalo_mantenimiento_meses'");
  const [t] = await consultar<{ estado: string; saldo: string; autorizo: number | null; recordatorios: number; fecha: string; esperada: string }>(
    `select t.estado, t.saldo_al_entregar as saldo, t.entrega_con_saldo_autorizada_por as autorizo,
       (select count(*)::int from recordatorio_mantenimiento r where r.trabajo_origen_id = t.id) as recordatorios,
       (select to_char(r.fecha_programada, 'YYYY-MM-DD') from recordatorio_mantenimiento r where r.trabajo_origen_id = t.id) as fecha,
       to_char($2::date + make_interval(months => $3), 'YYYY-MM-DD') as esperada
     from trabajo t where t.id = $1`,
    [id, hoy(), meses],
  );
  expect(t).toMatchObject({ estado: "entregado", saldo: "0.00", autorizo: null, recordatorios: 1 });
  expect(t.fecha).toBe(t.esperada);
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
  await page.goto(`/panel/ordenes/${id}/entregar`);
  await expect(page.getByText("Queda saldo pendiente.", { exact: true })).toBeVisible();
  await page.getByRole("form", { name: "Entregar vehículo" }).getByRole("button", { name: "Entregar vehículo" }).click();
  await expect(page.getByText("Queda un saldo: marca «Entregar con saldo pendiente» para confirmar.")).toBeVisible();
  await expect(page.getByText(/300 Bs/)).toHaveCount(0);

  await page.context().clearCookies();
  await ingresar(page, `conperm-hu36-${s}`, "encargado-123");
  await expect(page).toHaveURL(/\/panel$/);
  await page.goto(`/panel/ordenes/${id}/entregar`);
  const entrega = page.getByRole("form", { name: "Entregar vehículo" });
  await entrega.getByRole("button", { name: "Entregar vehículo" }).click();
  await expect(entrega.getByText("Queda un saldo de 300 Bs: marca «Entregar con saldo pendiente» para confirmar.")).toBeVisible();
  await entrega.getByText("Entregar con saldo pendiente (300 Bs)").click();
  await entrega.getByRole("button", { name: "Entregar vehículo" }).click();
  await expect(page).toHaveURL(new RegExp(`/panel/ordenes/${id}\\?entregado=1$`));
  await expect(page.getByRole("status").filter({ hasText: "Vehículo entregado con saldo de 300 Bs." })).toBeVisible();
  await expect(page.getByText(/Con saldo de 300 Bs, autorizado por Encargada con permiso\.$/)).toBeVisible();
  // Entregada con saldo: se sigue cobrando (HU-37)
  await expect(page.getByRole("button", { name: "Registrar pago" })).toBeVisible();

  const [{ autorizo }] = await consultar<{ autorizo: string }>("select u.nombre_usuario as autorizo from trabajo t join usuario u on u.id = t.entrega_con_saldo_autorizada_por where t.id = $1", [id]);
  expect(autorizo).toBe(`conperm-hu36-${s}`);
  const [{ accion }] = await consultar<{ accion: string }>("select accion from auditoria where entidad = 'trabajo' and entidad_id = $1 order by id desc limit 1", [id]);
  expect(accion).toBe("entregar");
});
