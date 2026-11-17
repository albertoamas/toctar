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
  await page.getByRole("navigation", { name: "Fechas" }).getByRole("link", { name: "Mes pasado" }).click();
  await expect(page.getByRole("navigation", { name: "Fechas" }).getByRole("link", { name: "Mes pasado" })).toHaveAttribute("aria-current", "page");

  // Resumen: las tarjetas dicen lo mismo que la base
  const tarjetas = page.getByRole("region", { name: "Resumen del período" });
  const ganancia = Number(entro) - Number(salio);
  await expect(tarjetas).toContainText(`Ingresos${miles(Number(entro))}`);
  await expect(tarjetas).toContainText(`Gastos${miles(Number(salio))}`);
  await expect(tarjetas).toContainText(`Ganancia${miles(ganancia)}`);
  // Lo neto: la torta y sus dos montos
  await expect(page.getByRole("region", { name: "Lo neto" })).toContainText(`De los ${miles(Number(entro))} que entraron`);
  await expect(page.getByRole("region", { name: "Ingresos y gastos, por día" }).locator(".recharts-surface").first()).toBeVisible();

  // Ingresos: el acumulado y la forma de pago (efectivo, del pago de 500)
  await page.getByRole("navigation", { name: "Partes de los reportes" }).getByRole("link", { name: "Ingresos" }).click();
  await expect(page).toHaveURL(/vista=ingresos&periodo=mes-pasado$/);
  await expect(page.getByRole("region", { name: "Por forma de pago" })).toContainText("Efectivo");
  await expect(page.getByRole("region", { name: "Ingresos del período" })).toContainText(`Ingresos${miles(Number(entro))}`);
  await expect(page.getByRole("region", { name: "Cómo van los ingresos" })).toContainText(`Entraron ${miles(Number(entro))}`);
  await expect(page.getByRole("region", { name: "Cómo van los ingresos" }).locator(".recharts-surface").first()).toBeVisible();
  // Con "Hoy" no hay línea: un día no tiene recorrido
  await page.getByRole("navigation", { name: "Fechas" }).getByRole("link", { name: "Hoy" }).click();
  await expect(page.getByRole("navigation", { name: "Fechas" }).getByRole("link", { name: "Hoy" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("region", { name: "Cómo van los ingresos" })).toHaveCount(0);
  await page.getByRole("navigation", { name: "Fechas" }).getByRole("link", { name: "Mes pasado" }).click();
  await expect(page.getByRole("region", { name: "Cómo van los ingresos" })).toBeVisible();

  // Gastos: el reporte (lo que salió, cómo van y por categoría, sin el anulado) y el enlace a la lista de gastos
  await page.getByRole("navigation", { name: "Partes de los reportes" }).getByRole("link", { name: "Gastos" }).click();
  await expect(page.getByRole("region", { name: "Gastos del período" })).toContainText(`Gastos${miles(Number(salio))}`);
  await expect(page.getByRole("region", { name: "Cómo van los gastos" })).toContainText(`Se gastaron ${miles(Number(salio))}`);
  const categorias = page.getByRole("region", { name: "Por categoría" });
  await expect(categorias).toContainText("Otros");
  await categorias.getByRole("link", { name: "Ver la lista de gastos" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Gastos" })).toBeVisible();
  await expect(page).toHaveURL((url) => url.pathname === "/panel/reportes/gastos" && url.searchParams.get("mes") === mes);
  await expect(page.getByText("Anulado: Prueba").filter({ visible: true })).toBeVisible();
  // Y vuelve a la pestaña Gastos de Reportes
  await page.getByRole("main").getByRole("link", { name: "Volver a Reportes" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Reportes" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Por categoría" })).toBeVisible();

  // Taller y clientes: las tarjetas y las tres secciones; la tendencia, por día en un mes y por mes en "6 meses"
  await page.getByRole("navigation", { name: "Partes de los reportes" }).getByRole("link", { name: "Taller y clientes" }).click();
  for (const nombre of ["El taller en el período", "Clientes atendidos, por día", "Servicios más pedidos", "Cotizaciones"]) {
    await expect(page.getByRole("region", { name: nombre })).toBeVisible();
  }
  await page.getByRole("navigation", { name: "Fechas" }).getByRole("link", { name: "6 meses" }).click();
  await expect(page.getByRole("region", { name: "Clientes atendidos, por mes" })).toBeVisible();
  await page.getByRole("navigation", { name: "Partes de los reportes" }).getByRole("link", { name: "Resumen" }).click();
  await expect(page.getByRole("region", { name: "Ingresos y gastos, por mes" })).toBeVisible();
});

test("este mes en el celular y en la computadora: se lee sin salirse de la pantalla", async ({ page }) => {
  await ingresarComoDueno(page);
  await page.goto("/panel/reportes");
  await expect(page.getByRole("heading", { level: 1, name: "Reportes" })).toBeVisible();
  await expect(page.getByText("Los ingresos salen de los pagos registrados; los gastos, de los gastos registrados. Los anulados no cuentan.")).toBeVisible();
  // Cada pestaña entra en la pantalla, también en el celular
  for (const vista of ["", "?periodo=hoy", "?periodo=semana", "?periodo=6-meses", "?periodo=rango&desde=2026-01-01&hasta=2026-03-31", "?vista=ingresos", "?vista=gastos", "?vista=taller"]) {
    await page.goto(`/panel/reportes${vista}`);
    await expect(page.getByRole("heading", { level: 1, name: "Reportes" })).toBeVisible();
    const desborde = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(desborde, vista || "resumen").toBeLessThanOrEqual(0);
  }
});

test("un encargado con todos los permisos no entra a Reportes", async ({ page }, info) => {
  const usuario = `todo-p16r-${info.project.name}`;
  await crearUsuario({ usuario, nombre: "Encargado con todo", contrasena: "todo-p16r-123", rol: "encargado", permisos: [...PERMISOS] });
  await ingresar(page, usuario, "todo-p16r-123");
  await expect(page).toHaveURL(/\/panel$/);
  await page.goto("/panel/reportes");
  await expect(page).toHaveURL(/\/panel\/sin-acceso$/);
});
