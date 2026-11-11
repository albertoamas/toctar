import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { consultar, crearClienteEnBase, crearOrdenLista, crearUsuario, ingresar, ingresarComoDueno } from "./apoyo";

// Pedido 43: "Volver" lleva a la pantalla de la que se vino. Especificación: docs/08-desarrollo/etapas/P43-volver-al-origen.md §9.

const sufijo = (info: TestInfo) => `${info.project.name === "celular" ? "C" : "E"}${info.retry}`;
const telefono = (info: TestInfo, n: number) => `5917${info.project.name === "celular" ? 7 : 8}430${info.retry}${n}`;
/** Días lejos de hoy y propios de cada proyecto y reintento: los espacios del taller no chocan con otras pruebas. */
const dias = (info: TestInfo, n: number) => 1800 + (info.project.name === "celular" ? 0 : 20) + info.retry * 5 + n;
const volverA = (page: Page, texto: string) => page.getByRole("link", { name: `Volver a ${texto}` });

test("una orden vuelve a la pantalla de la que se abrió, y sin origen (o con uno de otro sitio) a Órdenes", async ({ page }, info) => {
  const s = sufijo(info);
  const placa = `VO43${s}1`;
  const clienteId = await crearClienteEnBase({ nombre: `Volver orden ${s}`, telefono: telefono(info, 1), placa });
  const id = await crearOrdenLista({ placa, espacio: 0, dias: dias(info, 1), precio: 500, pagado: 0 });
  await ingresarComoDueno(page);

  // Desde la ficha del cliente: su fila abre la orden y "Volver" lleva al cliente
  await page.goto(`/panel/clientes/${clienteId}`);
  await page.getByRole("list", { name: "Reservas" }).getByRole("link").first().click();
  await expect(page).toHaveURL(new RegExp(`/panel/ordenes/${id}\\?volver=`));
  await expect(volverA(page, "Cliente")).toHaveAttribute("href", `/panel/clientes/${clienteId}`);
  await volverA(page, "Cliente").click();
  await expect(page).toHaveURL(new RegExp(`/panel/clientes/${clienteId}(?:[?&]volver=[^&#]*)?$`));

  // Desde Inicio
  await page.goto(`/panel/ordenes/${id}?volver=%2Fpanel`);
  await expect(volverA(page, "Inicio")).toHaveAttribute("href", "/panel");

  // Sin origen, o con uno que no es del panel: a Órdenes
  for (const ruta of [`/panel/ordenes/${id}`, `/panel/ordenes/${id}?volver=https%3A%2F%2Fotro.com`, `/panel/ordenes/${id}?volver=%2F%2Fotro.com`]) {
    await page.goto(ruta);
    await expect(volverA(page, "Órdenes")).toHaveAttribute("href", "/panel/ordenes");
  }
});

test("una lista vuelve con su filtro y su búsqueda", async ({ page }, info) => {
  const s = sufijo(info);
  const placa = `VL43${s}1`;
  await crearClienteEnBase({ nombre: `Volver lista ${s}`, telefono: telefono(info, 2), placa });
  const id = await crearOrdenLista({ placa, espacio: 0, dias: dias(info, 2), precio: 300, pagado: 0 });
  await ingresarComoDueno(page);
  await page.goto(`/panel/ordenes?estado=listo&q=${placa}`);
  await page.getByRole("list", { name: "Órdenes en el taller" }).getByRole("link", { name: new RegExp(placa) }).click();
  await expect(page).toHaveURL(new RegExp(`/panel/ordenes/${id}\\?volver=`));
  // Ya cargada: el esqueleto de carga tiene su propio "Volver", sin el origen
  await expect(volverA(page, "Órdenes")).toHaveAttribute("href", `/panel/ordenes?estado=listo&q=${placa}`);
  await volverA(page, "Órdenes").click();
  await expect(page).toHaveURL(new RegExp(`/panel/ordenes\\?estado=listo&q=${placa}(?:[?&]volver=[^&#]*)?$`));
  await expect(page.getByRole("searchbox")).toHaveValue(placa);
});

test("sin el permiso del módulo de origen, vuelve a la de siempre", async ({ page }, info) => {
  const s = sufijo(info);
  const placa = `VP43${s}1`;
  await crearClienteEnBase({ nombre: `Volver permiso ${s}`, telefono: telefono(info, 3), placa });
  const id = await crearOrdenLista({ placa, espacio: 0, dias: dias(info, 3), precio: 300, pagado: 0 });
  const usuario = `volver-ordenes-${s.toLowerCase()}`;
  await crearUsuario({ usuario, nombre: "Solo órdenes", contrasena: "encargado-123", rol: "encargado", permisos: ["ordenes"] });
  await ingresar(page, usuario, "encargado-123");
  await expect(page).toHaveURL(/\/panel$/);
  // Saldos es de Pagos: un botón ahí llevaría a "Sin acceso"
  await page.goto(`/panel/ordenes/${id}?volver=%2Fpanel%2Fpagos`);
  await expect(volverA(page, "Órdenes")).toHaveAttribute("href", "/panel/ordenes");
});

test("Nueva reserva desde la ficha del cliente vuelve a ella y lleva el origen en el formulario", async ({ page }, info) => {
  const s = sufijo(info);
  const placa = `VR43${s}1`;
  const clienteId = await crearClienteEnBase({ nombre: `Volver reserva ${s}`, telefono: telefono(info, 4), placa });
  await ingresarComoDueno(page);
  await page.goto(`/panel/clientes/${clienteId}`);
  await page.getByRole("link", { name: "Nueva reserva" }).click();
  await expect(volverA(page, "Cliente")).toHaveAttribute("href", `/panel/clientes/${clienteId}`);
  // Con un solo vehículo pasa directo a Servicios: ahí está el formulario, con el origen para la reserva creada
  await expect(page.locator('form input[name="volver"]')).toHaveValue(`/panel/clientes/${clienteId}`);
});

test("al recibir, la orden vuelve a donde se estaba antes de abrir la reserva y «atrás» no vuelve a Recibir", async ({ page }, info) => {
  const s = sufijo(info);
  const placa = `VE43${s}1`;
  await crearClienteEnBase({ nombre: `Volver recibir ${s}`, telefono: telefono(info, 5), placa });
  // Una reserva de hoy en un espacio propio y desactivado, como en hu-33-checklist
  const hoy = new Intl.DateTimeFormat("en-CA", { timeZone: "America/La_Paz" }).format(new Date());
  const [{ id }] = await consultar<{ id: number }>(
    `with e as (insert into espacio_taller (sucursal_id, nombre, orden, activo) select sucursal_id, $2, 94, false from espacio_taller limit 1 returning id, sucursal_id)
     insert into trabajo (sucursal_id, cliente_id, vehiculo_id, espacio_id, fecha_inicio, fecha_fin, created_by)
     select e.sucursal_id, v.cliente_id, v.id, e.id, $3::date, $3::date, v.created_by from vehiculo v, e where v.placa = $1 returning id`,
    [placa, `Espacio volver ${s}`, hoy],
  );
  await ingresarComoDueno(page);
  await page.goto("/panel/agenda");
  await page.goto(`/panel/agenda/${id}?volver=%2Fpanel%2Fagenda`);
  await page.getByRole("link", { name: "Recibir vehículo" }).click();
  await expect(page).toHaveURL(new RegExp(`/panel/ordenes/${id}/recibir\\?volver=`));
  await expect(volverA(page, "Reserva")).toBeVisible();
  await page.getByRole("button", { name: /Marcar (todas|el resto) como bien/ }).click();
  await expect(page.getByText(/Faltan? \d+ partes? del checklist/)).toHaveCount(0);
  await page.getByRole("button", { name: "Recibir vehículo" }).click();
  await expect(page).toHaveURL(new RegExp(`/panel/ordenes/${id}\\?recibido=1&volver=%2Fpanel%2Fagenda$`));
  await expect(volverA(page, "Agenda")).toHaveAttribute("href", "/panel/agenda");
  // "Atrás" del navegador: Recibir quedó reemplazado en el historial
  await page.goBack();
  await expect(page).not.toHaveURL(/\/recibir/);
});
