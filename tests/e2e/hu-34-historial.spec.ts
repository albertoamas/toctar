import { expect, test, type TestInfo } from "@playwright/test";
import { consultar, crearClienteEnBase, crearOrdenLista, crearUsuario, ingresar, ingresarComoDueno, PERFIL_TALLER } from "./apoyo";

// Pedido 28: el historial de órdenes (la pestaña "Entregadas", con búsqueda) y las entregadas a la vista en la agenda.
// Especificación: docs/08-desarrollo/etapas/P28-ordenes-historial.md. Las órdenes van directo a la base, en días propios
// lejos de hoy (1300 o 1400 días) para no chocar con otras pruebas; se entregan cambiando su estado en la base.
test.describe.configure({ mode: "serial" });

const sufijo = (info: TestInfo) => (info.project.name === "celular" ? "c" : "e");
const telefono = (info: TestInfo, n: number) => `5917${info.project.name === "celular" ? 5 : 6}3480${n}0`;
const dias = (info: TestInfo) => (info.project.name === "celular" ? 1300 : 1400);

/** Una orden entregada en su día (a las 15:00 de Bolivia). Devuelve id y el día. */
async function entregada(info: TestInfo, n: number): Promise<{ id: number; dia: string; placa: string }> {
  const s = sufijo(info);
  const placa = `HI34${s.toUpperCase()}${n}`;
  await crearClienteEnBase({ nombre: `Historial ${n} ${s}`, telefono: telefono(info, n), placa });
  // Hay tres espacios: la cuarta usa el de la primera, ya entregada (no ocupa)
  const id = await crearOrdenLista({ placa, espacio: (n - 1) % 3, dias: dias(info), precio: 500, pagado: 500 });
  const [{ dia }] = await consultar<{ dia: string }>(
    // En el pasado (como en la vida real): la agenda muestra las entregadas en días ya pasados
    `update trabajo set estado = 'entregado', fecha_inicio = (now() at time zone 'America/La_Paz')::date - (fecha_fin - (now() at time zone 'America/La_Paz')::date), fecha_fin = (now() at time zone 'America/La_Paz')::date - (fecha_fin - (now() at time zone 'America/La_Paz')::date),
       entregado_at = (((now() at time zone 'America/La_Paz')::date - (fecha_fin - (now() at time zone 'America/La_Paz')::date))::timestamp + time '15:00') at time zone 'America/La_Paz',
       sin_firma_motivo = 'Prueba'
     where id = $1 returning to_char(fecha_fin, 'YYYY-MM-DD') as dia`,
    [id],
  );
  return { id, dia, placa };
}

test("en «Entregadas» se buscan por placa, cliente o fecha; la agenda las muestra en verde", async ({ page }, info) => {
  const s = sufijo(info);
  const a = await entregada(info, 1);
  const b = await entregada(info, 2);
  await ingresarComoDueno(page);

  await page.goto("/panel/ordenes");
  await page.getByRole("navigation", { name: "Órdenes" }).getByRole("link", { name: "Entregadas" }).click();
  await expect(page).toHaveURL(/\?vista=entregadas$/);
  const buscador = page.getByLabel("Buscar por placa, cliente o fecha de entrega");

  // Por placa
  await buscador.fill(a.placa.toLowerCase());
  await expect(page).toHaveURL(new RegExp(`q=${a.placa.toLowerCase()}`));
  const lista = page.getByRole("list", { name: "Órdenes entregadas" });
  await expect(lista.getByRole("link")).toHaveCount(1);
  await expect(lista.getByRole("link")).toContainText("Entregada");
  await expect(lista.getByRole("link")).toContainText(`Historial 1 ${s}`);

  // Por cliente: las dos
  await buscador.fill(`historial`);
  await expect(page).toHaveURL(/q=historial/);
  await expect(lista.getByRole("link").filter({ hasText: new RegExp(`Historial [12] ${s},`) })).toHaveCount(2);

  // Por fecha de entrega (día/mes/año)
  const [anio, mes, d] = a.dia.split("-");
  await buscador.fill(`${Number(d)}/${Number(mes)}/${anio}`);
  await expect(page).toHaveURL(/q=\d+%2F\d+%2F\d+/);
  await expect(lista.getByRole("link").filter({ hasText: a.placa })).toBeVisible();
  await expect(lista.getByRole("link").filter({ hasText: b.placa })).toBeVisible();

  // Abre la orden de hace tiempo
  await lista.getByRole("link").filter({ hasText: a.placa }).click();
  await expect(page).toHaveURL(new RegExp(`/panel/ordenes/${a.id}(?:[?&]volver=[^&#]*)?$`));
  // Entregada: lo dicen los pasos (la insignia repetía el paso; 20/11). Cuándo y quién, en el historial (pedido 45)
  await expect(page.getByRole("navigation", { name: "Pasos del trabajo" }).locator('[aria-current="step"]')).toHaveText("Entregada");

  // En la agenda de esa semana, en verde y con "Entregada"
  await page.goto(`/panel/agenda?semana=${a.dia}&dia=${a.dia}`);
  const cinta = page.getByRole("link", { name: new RegExp(`^${a.placa}`) }).locator("visible=true");
  await expect(cinta).toContainText("Entregada");
  await expect(cinta).toHaveAttribute("data-tono", "exito");
});

test("el perfil Taller ve en «Entregadas» todas, sin precios (pedido 32)", async ({ page }, info) => {
  const s = sufijo(info);
  await crearUsuario({ usuario: `taller-hi34-${s}`, nombre: `Chico del taller ${s}`, contrasena: "taller-123", rol: "encargado", permisos: PERFIL_TALLER });
  const una = await entregada(info, 3);
  const otra = await entregada(info, 4);
  await ingresar(page, `taller-hi34-${s}`, "taller-123");
  await expect(page).toHaveURL(/\/panel$/);
  // Las dos, aunque nadie las tenga asignadas: se buscan por placa (son de hace años: no están en la primera página)
  const lista = page.getByRole("list", { name: "Órdenes entregadas" });
  for (const placa of [una.placa, otra.placa]) {
    await page.goto(`/panel/ordenes?vista=entregadas&q=${placa}`);
    await expect(lista.getByRole("link").filter({ hasText: placa })).toBeVisible();
  }
  // Sin Pagos, sin precios (RN-12)
  await expect(page.getByText(/Bs/)).toHaveCount(0);
});

test("entregada hoy, se ve hoy en la agenda en verde (18/11: antes desaparecía hasta el día siguiente)", async ({ page }, info) => {
  const s = sufijo(info);
  const placa = `HI34${s.toUpperCase()}5`;
  await crearClienteEnBase({ nombre: `Historial 5 ${s}`, telefono: telefono(info, 5), placa });
  // En un espacio sin nada hoy: si otra reserva entra hoy en el mismo, hoy es de ella; y de dos entregadas el mismo día,
  // se dibuja una. Celular y escritorio corren a la vez: uno toma el primero libre y el otro el último
  const [libre] = await consultar<{ n: number }>(
    `select n from (select e.id, (row_number() over (order by e.orden) - 1)::int as n from espacio_taller e where e.activo) a
     where not exists (select 1 from trabajo t where t.espacio_id = a.id and t.estado <> 'cancelado'
       and (now() at time zone 'America/La_Paz')::date between t.fecha_inicio and t.fecha_fin)
     order by n ${info.project.name === "celular" ? "asc" : "desc"} limit 1`,
  );
  test.skip(!libre, "Hoy todos los espacios tienen una reserva de otra prueba");
  const id = await crearOrdenLista({ placa, espacio: libre.n, dias: dias(info), precio: 500, pagado: 500 });
  // Recibida y entregada hoy: la entrega la acorta a hoy (como en la prueba con el dueño, del 17 al 21 → el 17)
  await consultar(
    `update trabajo set estado = 'entregado', fecha_inicio = (now() at time zone 'America/La_Paz')::date, fecha_fin = (now() at time zone 'America/La_Paz')::date,
       entregado_at = now(), sin_firma_motivo = 'Prueba' where id = $1`,
    [id],
  );
  await ingresarComoDueno(page);
  await page.goto("/panel/agenda");
  const cinta = page.getByRole("link", { name: new RegExp(`^${placa}`) }).locator("visible=true");
  await expect(cinta).toContainText("Entregada");
  await expect(cinta).toHaveAttribute("data-tono", "exito");
});
