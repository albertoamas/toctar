import { expect, test, type TestInfo } from "@playwright/test";
import { abrirWhatsApp, consultar, crearClienteEnBase, crearOrdenLista, crearUsuario, ingresar } from "./apoyo";

// HU-35 Avisar vehículo listo (flujo crítico 4, primera parte). Especificación: docs/08-desarrollo/etapas/C4-taller-entrega.md §9.
// Las órdenes van directo a la base, en días propios lejos de hoy (800 o 900) para no chocar con otras pruebas. WhatsApp
// no se abre de verdad: la prueba responde por wa.me.
test.describe.configure({ mode: "serial" });

const sufijo = (info: TestInfo) => (info.project.name === "celular" ? "c" : "e");
const telefono = (info: TestInfo, n: number) => `5917${info.project.name === "celular" ? 5 : 6}3500${n}0`;
const dias = (info: TestInfo) => (info.project.name === "celular" ? 800 : 900);

test("avisar abre WhatsApp con nombre, vehículo y saldo, y queda quién avisó y cuándo", async ({ page }, info) => {
  const s = sufijo(info);
  const placa = `AV35${s.toUpperCase()}1`;
  await crearClienteEnBase({ nombre: `Lucía Rojas ${s}`, telefono: telefono(info, 1), placa });
  const id = await crearOrdenLista({ placa, espacio: 0, dias: dias(info), precio: 500, pagado: 150 });
  await crearUsuario({ usuario: `aviso-hu35-${s}`, nombre: "Ana del taller", contrasena: "encargado-123", rol: "encargado", permisos: ["ordenes", "pagos"] });
  await ingresar(page, `aviso-hu35-${s}`, "encargado-123");
  await expect(page).toHaveURL(/\/panel$/);

  // En la lista, en "Listas" y "Sin avisar"
  await page.goto("/panel/ordenes");
  await expect(page.getByRole("region", { name: /^Listas/ }).getByRole("link", { name: new RegExp(`^${placa}.*Sin avisar`) })).toBeVisible();

  await page.goto(`/panel/ordenes/${id}`);
  const enlace = await abrirWhatsApp(page, page.getByRole("button", { name: "Avisar por WhatsApp" }));
  expect(enlace).toMatch(/^https:\/\/wa\.me\/591\d{8}\?text=/);
  expect(enlace).toContain(`Hola Lucía, tu vehículo (placa ${placa}) ya está listo en`);
  expect(enlace).toContain("Saldo pendiente: 350 Bs.");
  await expect(page.getByText(/^Avisado el \d{2}\/\d{2} a las \d{2}:\d{2} por Ana del taller$/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Volver a avisar" })).toBeVisible();
  const [t] = await consultar<{ avisada: boolean; auditoria: string }>(
    `select avisado_listo_at is not null as avisada,
       (select accion from auditoria where entidad = 'trabajo' and entidad_id = t.id order by id desc limit 1) as auditoria
     from trabajo t where id = $1`,
    [id],
  );
  expect(t).toEqual({ avisada: true, auditoria: "avisar_listo" });
});

test("sin Pagos el mensaje no lleva el saldo; el técnico no avisa", async ({ page }, info) => {
  const s = sufijo(info);
  const placa = `AV35${s.toUpperCase()}2`;
  await crearClienteEnBase({ nombre: `Marco ${s}`, telefono: telefono(info, 2), placa });
  const id = await crearOrdenLista({ placa, espacio: 1, dias: dias(info), precio: 500, pagado: 150 });
  await crearUsuario({ usuario: `tec-hu35-${s}`, nombre: "Técnico Aviso", contrasena: "tecnico-123", rol: "tecnico" });
  const [{ tecnico }] = await consultar<{ tecnico: number }>("select id as tecnico from usuario where nombre_usuario = $1", [`tec-hu35-${s}`]);
  await consultar("update trabajo set tecnico_id = $2 where id = $1", [id, tecnico]);
  await crearUsuario({ usuario: `aviso2-hu35-${s}`, nombre: "Encargado sin pagos", contrasena: "encargado-123", rol: "encargado", permisos: ["ordenes"] });

  await ingresar(page, `aviso2-hu35-${s}`, "encargado-123");
  await expect(page).toHaveURL(/\/panel$/);
  await page.goto(`/panel/ordenes/${id}`);
  const enlace = await abrirWhatsApp(page, page.getByRole("button", { name: "Avisar por WhatsApp" }));
  expect(enlace).toContain("ya está listo en");
  expect(enlace).not.toContain("Saldo");

  await page.context().clearCookies();
  await ingresar(page, `tec-hu35-${s}`, "tecnico-123");
  await expect(page).toHaveURL(/\/panel$/);
  await page.goto(`/panel/ordenes/${id}`);
  await expect(page.getByRole("heading", { level: 1, name: placa })).toBeVisible();
  await expect(page.getByRole("button", { name: /avisar/i })).toHaveCount(0);
});
