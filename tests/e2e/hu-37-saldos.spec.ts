import { expect, test, type TestInfo } from "@playwright/test";
import { consultar, crearClienteEnBase, crearUsuario, ingresar, ingresarComoDueno, PERFIL_TALLER } from "./apoyo";

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
     select e.sucursal_id, v.cliente_id, v.id, e.id, (now() at time zone 'America/La_Paz')::date - $2::int, (now() at time zone 'America/La_Paz')::date - $2::int, 'entregado', now(), now(),
       now() - make_interval(days => $2), $3, v.created_by
     from vehiculo v, (select * from espacio_taller where activo order by orden limit 1) e where v.placa = $1 returning id`,
    [placa, dias, descuento],
  );
  await consultar("insert into trabajo_linea (trabajo_id, variante_id, descripcion, precio, orden) select $1, (select id from variante order by id limit 1), 'Lavado completo', 600, 0", [id]);
  if (pagado > 0) await consultar("insert into pago (trabajo_id, monto, metodo, tipo, fecha, created_by) select $1, $2, 'efectivo', 'adelanto', (now() at time zone 'America/La_Paz')::date, created_by from trabajo where id = $1", [id, pagado]);
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
  // En el menú se llama por lo que muestra (en el celular, el menú se abre)
  if (info.project.name === "celular") await page.getByRole("button", { name: "Abrir menú" }).click();
  await page.getByRole("navigation", { name: "Panel" }).getByRole("link", { name: "Saldos pendientes" }).click();
  await expect(page).toHaveURL(/\/panel\/pagos$/);
  // El total, en el resumen de la lista (barra de las listas, 10/11)
  await expect(page.getByText(/ por cobrar en /)).toBeVisible();

  const lista = page.getByRole("list", { name: "Órdenes con saldo" });
  const fila = lista.getByRole("listitem").filter({ hasText: debe });
  await expect(fila).toContainText(`Debe Saldo ${s}`);
  await expect(fila).toContainText("400 Bs");
  // En la tarjeta "Entregada el …"; en la tabla de la computadora, la fecha sola bajo "Entregada"
  await expect(fila).toContainText(/(Entregada el )?\d{2}\/\d{2}(\/\d{4})?, hace 40 días/);
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
  // Sin recargar: la lista se actualiza con la respuesta del pago (saldoCambiado, 12/11)
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByText(debe)).toHaveCount(0);
});

test("sin Pagos no se entra a los saldos, tampoco con el perfil Taller", async ({ page }, info) => {
  const s = sufijo(info);
  await crearUsuario({ usuario: `ordenes-hu37-${s}`, nombre: "Encargado de órdenes", contrasena: "encargado-123", rol: "encargado", permisos: ["ordenes"] });
  await ingresar(page, `ordenes-hu37-${s}`, "encargado-123");
  await expect(page).toHaveURL(/\/panel$/);
  await expect(page.getByRole("link", { name: "Saldos pendientes" })).toHaveCount(0);
  await page.goto("/panel/pagos");
  await expect(page).toHaveURL(/\/panel\/sin-acceso$/);

  await page.context().clearCookies();
  await crearUsuario({ usuario: `taller-hu37-${s}`, nombre: "Chico del taller", contrasena: "taller-123", rol: "encargado", permisos: PERFIL_TALLER });
  await ingresar(page, `taller-hu37-${s}`, "taller-123");
  await expect(page).toHaveURL(/\/panel$/);
  await page.goto("/panel/pagos");
  await expect(page).toHaveURL(/\/panel\/sin-acceso$/);
});

test("pedido 30: se buscan por cliente, teléfono o placa y se ordenan; el total por cobrar sigue siendo el de todas", async ({ page }, info) => {
  const s = sufijo(info);
  const chico = `SL37${s.toUpperCase()}7`;
  const grande = `SL37${s.toUpperCase()}8`;
  await crearClienteEnBase({ nombre: `Zoila Busca ${s}`, telefono: telefono(info, 7), placa: chico });
  await crearClienteEnBase({ nombre: `Alberto Busca ${s}`, telefono: telefono(info, 8), placa: grande });
  // Más antigua y chica (debe 100) y más nueva y grande (debe 600)
  await ordenEntregada(chico, 60, 500);
  await ordenEntregada(grande, 2, 0);
  await crearUsuario({ usuario: `caja2-hu37-${s}`, nombre: "Encargado de caja", contrasena: "encargado-123", rol: "encargado", permisos: ["pagos"] });
  await ingresar(page, `caja2-hu37-${s}`, "encargado-123");
  await expect(page).toHaveURL(/\/panel$/);
  await page.goto("/panel/pagos");
  // El resumen de la lista: "980 Bs por cobrar en 2 órdenes" (y, buscando, cuántas se ven)
  const renglon = page.getByText(/ por cobrar en /);
  const monto = renglon.locator("strong");

  // Por cliente: las dos de esta prueba (y de este proyecto)
  const buscador = page.getByLabel("Buscar por nombre, teléfono o placa");
  await buscador.fill(`busca ${s}`);
  await expect(page).toHaveURL(new RegExp(`q=busca`));
  const lista = page.getByRole("list", { name: "Órdenes con saldo" });
  await expect(lista.getByRole("listitem")).toHaveCount(2);
  // El total por cobrar no cambia al buscar: es el mismo que se ve sin buscar. El total es de toda la base y otras pruebas
  // en paralelo cobran o dejan saldos: se comparan las dos pantallas en el mismo momento, hasta que coincidan
  const sinBuscar = await page.context().newPage();
  await expect
    .poll(async () => {
      await sinBuscar.goto("/panel/pagos");
      const deTodas = await sinBuscar.getByText(/ por cobrar en /).locator("strong").innerText();
      await page.reload();
      return (await monto.innerText()) === deTodas;
    }, { timeout: 30_000 })
    .toBe(true);
  await sinBuscar.close();
  // El contador dice cuántas se ven de todas
  await expect(renglon).toContainText("se ven 2");

  // Más antigua primero (lo de siempre); por mayor monto; por cliente
  // El primer texto destacado de cada fila: el cliente, en la tarjeta y en la tabla de la computadora
  const nombres = () => lista.getByRole("listitem").evaluateAll((filas) => filas.map((f) => f.querySelector(".font-semibold, .font-medium")?.textContent?.trim() ?? ""));
  await expect.poll(nombres).toEqual([`Zoila Busca ${s}`, `Alberto Busca ${s}`]);
  // "Ordenar" en la barra (10/11; antes, pestañas)
  const ordenar = async (texto: string) => {
    await page.getByRole("button", { name: /^Ordenar:/ }).click();
    await page.getByRole("menuitem", { name: texto }).click();
  };
  await ordenar("Mayor monto");
  await expect(page).toHaveURL(/orden=monto/);
  await expect(page).toHaveURL(/q=busca/);
  await expect.poll(nombres).toEqual([`Alberto Busca ${s}`, `Zoila Busca ${s}`]);
  await ordenar("Cliente");
  await expect.poll(nombres).toEqual([`Alberto Busca ${s}`, `Zoila Busca ${s}`]);

  // Por placa y por teléfono
  await buscador.fill(chico.toLowerCase());
  await expect(page).toHaveURL(new RegExp(`q=${chico.toLowerCase()}`));
  await expect.poll(nombres).toEqual([`Zoila Busca ${s}`]);
  await buscador.fill(telefono(info, 8).slice(3));
  await expect.poll(nombres).toEqual([`Alberto Busca ${s}`]);
  await buscador.fill("nadie-debe-esto");
  await expect(page.getByText("Ningún saldo coincide con «nadie-debe-esto».")).toBeVisible();
});

test("con Órdenes, la fila lleva a su orden (pulido final del 10/11: ya no hay un \u00abVer la orden\u00bb aparte)", async ({ page }, info) => {
  const s = sufijo(info);
  const placa = `SL37${s.toUpperCase()}9`;
  await crearClienteEnBase({ nombre: `Fila enlace ${s}`, telefono: telefono(info, 9), placa });
  const id = await ordenEntregada(placa, 4, 100);
  await ingresarComoDueno(page);
  await page.goto(`/panel/pagos?q=${placa}`);
  const fila = page.getByRole("list", { name: "Órdenes con saldo" }).getByRole("listitem").filter({ hasText: placa });
  await expect(fila.getByRole("link", { name: `Ver la orden: Fila enlace ${s}, 500 Bs, entregada hace 4 días` })).toHaveAttribute("href", new RegExp(`^/panel/ordenes/${id}\\?volver=%2Fpanel%2Fpagos`));
  // Los botones siguen en la fila, fuera del enlace
  await expect(fila.getByRole("button", { name: "Registrar pago" })).toBeVisible();
  await expect(fila.getByRole("link", { name: "Escribir por WhatsApp" })).toBeVisible();
});
