import { expect, test } from "@playwright/test";
import { PERMISOS } from "../../src/lib/permisos";
import { consultar, crearClienteEnBase, crearOrdenLista, crearUsuario, ingresar, ingresarComoDueno } from "./apoyo";

// Pedido 16, segunda parte: la pantalla de Reportes (P16-reportes-y-gastos.md §9). Los números se comparan con la base:
// otras pruebas también cobran, así que no se fija un total, se mira que la pantalla diga lo mismo que las cuentas de la
// spec (pagos y gastos no anulados del mes, por su día).

test.describe.configure({ mode: "serial" });

const miles = (n: number) => `${String(Math.round(Math.abs(n))).replace(/\B(?=(\d{3})+(?!\d))/g, ".")} Bs`;

test("el mes pasado: lo que entró, salió y quedó salen de los pagos y gastos sin anular", async ({ page }, info) => {
  // Solo en la computadora: el celular de otra corrida escribiría en el mismo mes
  test.skip(info.project.name !== "escritorio", "Los montos del mes pasado se prueban una vez");
  const placa = "REP16E1";
  await consultar("delete from pago where trabajo_id in (select t.id from trabajo t join vehiculo v on v.id = t.vehiculo_id where v.placa = $1)", [placa]);
  await consultar("delete from trabajo_linea where trabajo_id in (select t.id from trabajo t join vehiculo v on v.id = t.vehiculo_id where v.placa = $1)", [placa]);
  await consultar("delete from trabajo where vehiculo_id in (select id from vehiculo where placa = $1)", [placa]);
  await consultar("delete from gasto where detalle like 'Reporte p16 %'");
  if ((await consultar("select 1 from vehiculo where placa = $1", [placa])).length === 0) {
    await crearClienteEnBase({ nombre: "Cliente del reporte", telefono: "59176160001", placa });
  }
  const trabajoId = await crearOrdenLista({ placa, espacio: 0, dias: 777, precio: 2000, pagado: 0 });
  const [{ dia, mes }] = await consultar<{ dia: string; mes: string }>(
    "select to_char(d, 'YYYY-MM-DD') as dia, to_char(d, 'YYYY-MM') as mes from (select (date_trunc('month', (now() at time zone 'America/La_Paz')::date) - interval '1 month' + interval '9 days')::date as d) x",
  );
  const [{ id: dueno }] = await consultar<{ id: number }>("select id from usuario where nombre_usuario = 'dueno'");
  // Un pago de 500 y uno anulado de 300; un gasto de 120 y uno anulado de 50
  await consultar("insert into pago (trabajo_id, monto, metodo, tipo, fecha, created_by) values ($1, 500, 'efectivo', 'adelanto', $2, $3)", [trabajoId, dia, dueno]);
  await consultar(
    "insert into pago (trabajo_id, monto, metodo, tipo, fecha, anulado, motivo_anulacion, anulado_at, anulado_por, created_by) values ($1, 300, 'qr', 'adelanto', $2, true, 'Prueba', now(), $3, $3)",
    [trabajoId, dia, dueno],
  );
  await consultar("insert into gasto (sucursal_id, categoria_id, monto, metodo, fecha, detalle, created_by) select (select id from sucursal limit 1), (select id from categoria_gasto where nombre = 'Otros'), 120, 'efectivo', $1, 'Reporte p16 bolsas', $2", [dia, dueno]);
  await consultar(
    "insert into gasto (sucursal_id, categoria_id, monto, metodo, fecha, detalle, anulado, motivo_anulacion, anulado_at, anulado_por, created_by) select (select id from sucursal limit 1), (select id from categoria_gasto where nombre = 'Otros'), 50, 'efectivo', $1, 'Reporte p16 anulado', true, 'Prueba', now(), $2, $2",
    [dia, dueno],
  );

  // Lo que la spec dice que cuenta, calculado en la base
  const [{ entro, salio }] = await consultar<{ entro: string; salio: string }>(
    `select (select coalesce(sum(monto), 0) from pago where not anulado and to_char(fecha, 'YYYY-MM') = $1) as entro,
            (select coalesce(sum(monto), 0) from gasto where not anulado and to_char(fecha, 'YYYY-MM') = $1) as salio`,
    [mes],
  );
  expect(Number(entro)).toBeGreaterThanOrEqual(500);

  await ingresarComoDueno(page);
  await page.goto("/panel/reportes");
  await expect(page.getByRole("heading", { level: 1, name: "Reportes" })).toBeVisible();
  await page.getByRole("navigation", { name: "Mes" }).getByRole("link", { name: "Mes pasado" }).click();
  await expect(page.getByRole("navigation", { name: "Mes" }).getByRole("link", { name: "Mes pasado" })).toHaveAttribute("aria-current", "page");

  const cuenta = page.getByRole("region", { name: /^(Ganaste|Perdiste) / });
  await expect(cuenta).toContainText(`Entró${miles(Number(entro))}`);
  await expect(cuenta).toContainText(`Salió${miles(Number(salio))}`);
  const ganancia = Number(entro) - Number(salio);
  await expect(page.getByRole("heading", { level: 2, name: new RegExp(`^${ganancia >= 0 ? "Ganaste" : "Perdiste"} ${miles(ganancia)}`) })).toBeVisible();

  // En qué se gastó: Otros, con lo no anulado
  const gastos = page.getByRole("region", { name: "En qué se gastó" });
  await expect(gastos).toContainText("Otros");
  await gastos.getByRole("link", { name: "Ver todos los gastos" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Gastos" })).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`/panel/reportes/gastos\\?mes=${mes}$`));
  await expect(page.getByText("Reporte p16 bolsas")).toBeVisible();
  // Y vuelve a Reportes
  await page.getByRole("main").getByRole("link", { name: "Volver a Reportes" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Reportes" })).toBeVisible();
});

test("este mes en el celular y en la computadora: se lee sin salirse de la pantalla", async ({ page }) => {
  await ingresarComoDueno(page);
  await page.goto("/panel/reportes");
  await expect(page.getByRole("heading", { level: 1, name: "Reportes" })).toBeVisible();
  await expect(page.getByText("Cuánto entró, cuánto salió y cuánto quedó")).toBeVisible();
  await expect(page.getByText("Lo que entró sale de los pagos registrados; lo que salió, de los gastos.")).toBeVisible();
  const desborde = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(desborde).toBeLessThanOrEqual(0);
});

test("un encargado con todos los permisos no entra a Reportes", async ({ page }, info) => {
  const usuario = `todo-p16r-${info.project.name}`;
  await crearUsuario({ usuario, nombre: "Encargado con todo", contrasena: "todo-p16r-123", rol: "encargado", permisos: [...PERMISOS] });
  await ingresar(page, usuario, "todo-p16r-123");
  await expect(page).toHaveURL(/\/panel$/);
  await page.goto("/panel/reportes");
  await expect(page).toHaveURL(/\/panel\/sin-acceso$/);
});
