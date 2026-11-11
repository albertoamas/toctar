import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { consultar, crearClienteEnBase, crearCotizacionEnBase, crearUsuario, ingresar, ingresarComoDueno, PERFIL_TALLER } from "./apoyo";

// Cotización directa (pedido 23, flujo crítico 1; antes HU-24 y HU-25). Especificación:
// docs/08-desarrollo/etapas/P23-cotizacion-directa.md §9. Cada proyecto (celular o escritorio) crea su propio servicio
// con precios y sus clientes, directo en la base.
// En serie: las del dueño entran todas con el mismo usuario y, a la vez, chocaban con el límite de intentos (RNF-04).
test.describe.configure({ mode: "serial" });

const sufijo = (info: TestInfo) => (info.project.name === "celular" ? "C" : "E");
/** Local, 8 dígitos (lo que se escribe en el campo). */
const local = (info: TestInfo, n: number) => `7${info.project.name === "celular" ? 3 : 4}2500${n}0`;
const telefono = (info: TestInfo, n: number) => `591${local(info, n)}`;

/**
 * Un servicio con dos variantes: "Con precio" (450 Bs para el primer tamaño, el del vehículo de crearClienteEnBase) y
 * "Por evaluar" (según evaluación). Devuelve el nombre del servicio.
 */
async function crearServicioConPrecios(info: TestInfo): Promise<string> {
  const nombre = `Cotizable ${sufijo(info)}`;
  await consultar(
    `with s as (
       insert into servicio (nombre, slug, resumen, orden) values ($1, $2, 'Servicio de prueba para cotizar.', 99)
       on conflict do nothing returning id
     ), v as (
       insert into variante (servicio_id, nombre, orden) select id, x.nombre, x.orden from s, (values ('Con precio', 1), ('Por evaluar', 2)) as x(nombre, orden)
       returning id, nombre
     )
     insert into precio (variante_id, tamano_id, monto, created_by)
     select v.id, (select id from tamano_vehiculo order by orden limit 1), case when v.nombre = 'Con precio' then 450 end, (select id from usuario where nombre_usuario = 'dueno')
     from v`,
    [nombre, `cotizable-${sufijo(info).toLowerCase()}`],
  );
  return nombre;
}

const servicio = (page: Page, i: number) => page.getByLabel(`Servicio ${i}`, { exact: true }).filter({ visible: true });
const opcion = (page: Page, i: number) => page.getByLabel(`Opción del servicio ${i}`).filter({ visible: true });
/** Elige el servicio y su opción en sus dos menús (pulido 9.4). */
async function elegir(page: Page, i: number, nombre: string, variante: string) {
  await servicio(page, i).selectOption({ label: nombre });
  await opcion(page, i).selectOption({ label: variante });
}
// Solo los visibles: Next guarda escondida la pantalla anterior (Nueva cotización, con su primera fila lista) al ir a
// la versión nueva
const precio = (page: Page, i: number) => page.getByLabel(`Precio del servicio ${i}`).filter({ visible: true });
const crear = (page: Page) => page.getByRole("button", { name: "Crear cotización" }).click();
/** Pedido 40: con el cliente ya elegido se empieza en el vehículo; el suyo (si tiene uno) ya va marcado. */
const aServicios = (page: Page) => page.getByRole("button", { name: "Siguiente: servicios" }).click();
const aVehiculo = (page: Page) => page.getByRole("button", { name: "Siguiente: vehículo" }).click();
/** El paso en que está la pantalla, como lo dice el indicador. */
const pasoActual = (page: Page) => page.getByRole("navigation", { name: "Pasos de la cotización" }).locator('[aria-current="step"]');
const idDeLaPagina = (page: Page) => Number(new URL(page.url()).pathname.split("/")[3]);

test("cliente nuevo en tres pasos: sus datos completos, su vehículo, y los servicios con el precio del tamaño", async ({ page }, info) => {
  const s = sufijo(info);
  const nombre = await crearServicioConPrecios(info);
  await ingresarComoDueno(page);
  await page.goto("/panel/cotizaciones");
  await page.getByRole("link", { name: "Nueva cotización" }).click();
  // Paso 1: el cliente; buscarlo o uno nuevo
  await expect(pasoActual(page)).toContainText("Cliente");
  await page.getByRole("link", { name: "Cliente nuevo" }).click();
  await expect(page.getByRole("heading", { name: "Cliente nuevo" })).toBeVisible();
  await expect(pasoActual(page)).toContainText("Cliente");

  // Vacío: los errores del cliente, sin pasar al vehículo; el foco, al primero
  await aVehiculo(page);
  await expect(page.getByText("Escribe el nombre.")).toBeVisible();
  await expect(page.getByLabel("Nombre", { exact: true })).toBeFocused();
  await expect(pasoActual(page)).toContainText("Cliente");
  // Completo: también correo, NIT y notas
  await page.getByLabel("Nombre", { exact: true }).fill(`Nuevo cotizado ${s}`);
  await page.getByRole("textbox", { name: "WhatsApp" }).fill(local(info, 1));
  await page.getByText("Agregar correo, NIT y notas").click();
  await page.getByLabel("Correo").fill(`nuevo${s.toLowerCase()}@ejemplo.com`);
  await page.getByLabel("NIT").fill("1234567");
  await aVehiculo(page);

  // Paso 2: el vehículo, con todo a la vista; arriba, el cliente
  await expect(pasoActual(page)).toContainText("Vehículo");
  await expect(page.getByRole("region", { name: "Cotización para" })).toContainText(`Nuevo cotizado ${s}`);
  await aServicios(page);
  await expect(page.getByText("Escribe la placa.")).toBeVisible();
  await expect(page.getByLabel("Placa", { exact: true })).toBeFocused();
  await page.getByLabel("Placa", { exact: true }).fill(`CN25${s}1`);
  await page.getByLabel("Tamaño", { exact: true }).selectOption({ index: 1 });
  await page.getByLabel("Marca").fill("Nissan");
  await page.getByLabel("Color").fill("Negro");
  await aServicios(page);

  // Paso 3: los servicios; arriba, el cliente y el vehículo
  await expect(pasoActual(page)).toContainText("Servicios y precio");
  await expect(page.getByRole("region", { name: "Cotización para" })).toContainText(`CN25${s}1`);
  // "Siguiente" no envía: antes, el mismo botón pasaba a "Crear cotización" en el mismo toque y la mandaba vacía
  await page.waitForTimeout(500);
  await expect(page.getByText("Agrega al menos un servicio.")).toHaveCount(0);
  await crear(page);
  await expect(page.getByText("Elige cómo se cotizó.")).toBeVisible();
  await expect(page.getByText("Agrega al menos un servicio.")).toBeVisible();
  await expect(pasoActual(page)).toContainText("Servicios y precio");
  // La primera fila ya está (pulido final del 09/11); elegido el servicio, el error se va sin esperar a "Crear"
  await elegir(page, 1, nombre, "Con precio");
  await expect(page.getByText("Agrega al menos un servicio.")).toHaveCount(0);
  await expect(precio(page, 1)).toHaveValue("450");
  await expect(page.getByText("Precio sugerido: 450 Bs")).toBeVisible();
  // Otro tamaño, otro precio sugerido: este no tiene, y vuelve al cambiar de nuevo (desde "Cambiar" del vehículo)
  await page.getByRole("button", { name: "Cambiar vehículo" }).click();
  await page.getByLabel("Tamaño", { exact: true }).selectOption({ index: 2 });
  await aServicios(page);
  await expect(precio(page, 1)).toHaveValue("");
  await expect(page.getByText("Sin precio en el catálogo para este tamaño: escribe el precio")).toBeVisible();
  await page.getByRole("button", { name: "Cambiar vehículo" }).click();
  await page.getByLabel("Tamaño", { exact: true }).selectOption({ index: 1 });
  await aServicios(page);
  await expect(precio(page, 1)).toHaveValue("450");

  await page.getByRole("button", { name: "Agregar servicio" }).click();
  await elegir(page, 2, nombre, "Por evaluar");
  await expect(page.getByText("Según evaluación: escribe el precio")).toBeVisible();
  await precio(page, 2).fill("200,50");
  // Abierto se puede cerrar (pulido final del 10/11): "Quitar" borra lo escrito, así no se guarda escondido
  await page.getByText("Agregar descuento", { exact: true }).click();
  await page.getByLabel("Monto del descuento").fill("30");
  await page.getByRole("button", { name: "Quitar Descuento" }).click();
  await expect(page.getByLabel("Monto del descuento")).toBeHidden();
  await page.getByText("Agregar descuento", { exact: true }).click();
  await expect(page.getByLabel("Monto del descuento")).toHaveValue("");
  await page.getByLabel("Monto del descuento").fill("50");
  await page.getByRole("radio", { name: /^Por fotos/ }).check();
  const totales = page.locator("dl").filter({ hasText: "Subtotal" });
  await expect(totales).toContainText("650,50 Bs");
  // El total, arriba en "Total y condiciones" (pulido final del 10/11); el desglose, en el recuadro del descuento
  await expect(page.getByRole("group", { name: "Total y condiciones" }).getByText("600,50 Bs", { exact: true })).toBeVisible();
  await crear(page);

  await expect(page).toHaveURL(/\/panel\/cotizaciones\/\d+\?creada=1(?:[?&]volver=[^&#]*)?$/);
  const id = idDeLaPagina(page);
  const [c] = await consultar<{ numero: string; es_estimado: boolean; canal: string | null; estado: string; cliente: string; placa: string }>(
    `select k.numero, k.es_estimado, q.canal, q.estado, cl.nombre as cliente, v.placa
     from consulta q join cotizacion k on k.consulta_id = q.id join cliente cl on cl.id = q.cliente_id join vehiculo v on v.id = q.vehiculo_id where q.id = $1`,
    [id],
  );
  expect(c).toEqual({ numero: expect.stringMatching(/^\d{4}-\d{4}$/), es_estimado: true, canal: null, estado: "cotizado", cliente: `Nuevo cotizado ${s}`, placa: `CN25${s}1` });
  await expect(page.getByText(/^Cotización creada\./)).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: `Cotización ${c.numero}` })).toBeVisible();
  await expect(page.getByRole("main").getByText("Pendiente", { exact: true })).toBeVisible();
  const versiones = page.getByRole("list", { name: "Versiones" });
  await expect(versiones).toContainText("600,50 Bs");
  await expect(versiones).toContainText("Por fotos (estimado)");
  await expect(versiones.getByRole("link", { name: "Ver PDF" })).toBeVisible();

  // Los precios copiados y el sugerido de cada línea (D-4), y la auditoría (RNF-10)
  const lineas = await consultar<{ descripcion: string; precio_sugerido: string | null; precio: string }>(
    "select l.descripcion, l.precio_sugerido, l.precio from cotizacion_linea l join cotizacion c on c.id = l.cotizacion_id where c.consulta_id = $1 order by l.orden",
    [id],
  );
  expect(lineas).toEqual([
    { descripcion: `${nombre} (Con precio)`, precio_sugerido: "450.00", precio: "450.00" },
    { descripcion: `${nombre} (Por evaluar)`, precio_sugerido: null, precio: "200.50" },
  ]);
  const [registro] = await consultar<{ accion: string }>(
    "select a.accion from auditoria a join cotizacion c on c.id = a.entidad_id where a.entidad = 'cotizacion' and c.consulta_id = $1",
    [id],
  );
  expect(registro.accion).toBe("crear");

  const [registrado] = await consultar<{ correo: string; nit: string; marca: string; color: string }>(
    "select cl.correo, cl.nit, v.marca, v.color from consulta q join cliente cl on cl.id = q.cliente_id join vehiculo v on v.id = q.vehiculo_id where q.id = $1",
    [id],
  );
  expect(registrado).toEqual({ correo: `nuevo${s.toLowerCase()}@ejemplo.com`, nit: "1234567", marca: "Nissan", color: "Negro" });

  // El cliente quedó registrado, con su vehículo y la cotización en su ficha
  // El cliente es una fila que lleva a su ficha (pulido 13.50)
  await page.getByRole("link", { name: /^Ver ficha del cliente: / }).click();
  await expect(page.getByRole("list", { name: "Vehículos", exact: true })).toContainText(`CN25${s}1`);
  await expect(page.getByRole("list", { name: "Cotizaciones" })).toContainText("600,50 Bs");
});

test("un WhatsApp repetido avisa y ofrece cotizarle a ese cliente; lo escrito se conserva", async ({ page }, info) => {
  const s = sufijo(info);
  const nombre = `Cotizable ${s}`;
  const existente = await crearClienteEnBase({ nombre: `Ya registrado ${s}`, telefono: telefono(info, 2) });
  await ingresarComoDueno(page);
  await page.goto("/panel/cotizaciones/nueva?nuevo=1", { waitUntil: "networkidle" });
  await page.getByLabel("Nombre", { exact: true }).fill(`Repetido ${s}`);
  await page.getByRole("textbox", { name: "WhatsApp" }).fill(local(info, 2));
  await aVehiculo(page);
  await page.getByLabel("Placa", { exact: true }).fill(`CR25${s}1`);
  await page.getByLabel("Tamaño", { exact: true }).selectOption({ index: 1 });
  await aServicios(page);
  await elegir(page, 1, nombre, "Con precio");
  await page.getByRole("radio", { name: "En persona" }).check();
  await crear(page);
  // El error es del cliente: la pantalla vuelve a su paso, con el foco en el WhatsApp
  await expect(pasoActual(page)).toContainText("Cliente");
  await expect(page.getByText(`Ese número ya es de Ya registrado ${s}.`)).toBeVisible();
  await expect(page.getByRole("textbox", { name: "WhatsApp" })).toBeFocused();
  await expect(page.getByRole("link", { name: `Usar a Ya registrado ${s}` })).toHaveAttribute("href", `/panel/cotizaciones/nueva?cliente=${existente}`);
  // Lo escrito se conserva tras el error: el vehículo, los servicios y cómo se cotizó
  await aVehiculo(page);
  await expect(page.getByLabel("Tamaño", { exact: true })).not.toHaveValue("");
  await aServicios(page);
  await expect(precio(page, 1)).toHaveValue("450");
  await expect(page.getByRole("radio", { name: "En persona" })).toBeChecked();
  expect(await consultar("select 1 from vehiculo where placa = $1", [`CR25${s}1`])).toEqual([]);
});

test("desde la ficha del cliente: llega elegido, con su vehículo marcado, y la cotización queda en su ficha", async ({ page }, info) => {
  const s = sufijo(info);
  const nombre = `Cotizable ${s}`;
  const id = await crearClienteEnBase({ nombre: `Desde ficha ${s}`, telefono: telefono(info, 3), placa: `CF25${s}1` });
  await ingresarComoDueno(page);
  await page.goto(`/panel/clientes/${id}`);
  await expect(page.getByText("Todavía no tiene cotizaciones.")).toBeVisible();
  await page.getByRole("link", { name: "Nueva cotización" }).click();
  await expect(page).toHaveURL(new RegExp(`/panel/cotizaciones/nueva\\?cliente=${id}(?:[?&]volver=[^&#]*)?$`));
  await expect(page.getByRole("region", { name: "Cotización para" })).toContainText(`Desde ficha ${s}`);
  await expect(page.getByRole("radio", { name: new RegExp(`CF25${s}1`) })).toBeChecked();
  await expect(pasoActual(page)).toContainText("Vehículo");
  await aServicios(page);
  // Con el vehículo elegido, los servicios ya muestran su precio
  await elegir(page, 1, nombre, "Con precio");
  await expect(precio(page, 1)).toHaveValue("450");
  await page.getByRole("radio", { name: "En persona" }).check();
  await crear(page);
  await expect(page).toHaveURL(/\/panel\/cotizaciones\/\d+\?creada=1(?:[?&]volver=[^&#]*)?$/);
  await expect(page.getByRole("list", { name: "Versiones" })).toContainText("En persona");

  await page.goto(`/panel/clientes/${id}`);
  await expect(page.getByRole("list", { name: "Cotizaciones" }).getByRole("link", { name: new RegExp(`CF25${s}1`) })).toBeVisible();
});

test("nueva versión: el mismo número, la anterior queda reemplazada y una vieja lleva a la vigente", async ({ page }, info) => {
  const s = sufijo(info);
  const nombre = `Cotizable ${s}`;
  const cliente = await crearClienteEnBase({ nombre: `Con versiones ${s}`, telefono: telefono(info, 4), placa: `CV25${s}1` });
  await ingresarComoDueno(page);
  await page.goto(`/panel/cotizaciones/nueva?cliente=${cliente}`, { waitUntil: "networkidle" });
  await aServicios(page);
  await elegir(page, 1, nombre, "Con precio");
  await page.getByRole("radio", { name: /^Por fotos/ }).check();
  await crear(page);
  await expect(page).toHaveURL(/\?creada=1$/);
  const id = idDeLaPagina(page);

  await page.getByRole("button", { name: "Más" }).click();
  await page.getByRole("menuitem", { name: "Nueva versión" }).click();
  await expect(page).toHaveURL(new RegExp(`/panel/cotizaciones/${id}/nueva-version\\?desde=\\d+(?:[?&]volver=[^&#]*)?$`));
  await expect(page.getByRole("heading", { level: 1, name: "Versión 2" })).toBeVisible();
  // Arranca con lo de la versión 1, también cómo se cotizó
  await expect(precio(page, 1)).toHaveValue("450");
  await expect(page.getByRole("radio", { name: /^Por fotos/ })).toBeChecked();
  // El cliente y el vehículo, en su tarjeta; el total de la versión 1 aparece al cambiar el precio (pulido final del 10/11)
  await expect(page.getByRole("region", { name: "Cotización para" })).toContainText(`CV25${s}1`);
  await expect(page.getByText("Versión 1: 450 Bs")).toHaveCount(0);
  await precio(page, 1).fill("400");
  await expect(page.getByText("Versión 1: 450 Bs")).toBeVisible();
  await page.getByRole("radio", { name: "En persona" }).check();
  await page.getByRole("button", { name: "Guardar versión 2" }).click();
  await expect(page).toHaveURL(new RegExp(`/panel/cotizaciones/${id}\\?version=\\d+(?:[?&]volver=[^&#]*)?$`));
  await expect(page.getByText(/^Versión 2 guardada\./)).toBeVisible();

  const versiones = await consultar<{ id: number; numero: string; version: number; estado: string; total: string; es_estimado: boolean }>(
    "select id, numero, version, estado, total, es_estimado from cotizacion where consulta_id = $1 order by version",
    [id],
  );
  expect(versiones.map((v) => [v.version, v.estado, v.total, v.es_estimado])).toEqual([
    [1, "reemplazada", "450.00", true],
    [2, "enviada", "400.00", false],
  ]);
  expect(versiones[0].numero).toBe(versiones[1].numero);
  const lista = page.getByRole("list", { name: "Versiones" });
  await expect(lista.getByRole("listitem")).toHaveCount(2);
  await expect(lista.getByRole("listitem").first()).toContainText("Vigente");

  // Una versión vieja ya no se reemplaza; sin `desde` o con uno de otra cotización, a la vigente
  await page.goto(`/panel/cotizaciones/${id}/nueva-version?desde=${versiones[0].id}`);
  await expect(page.getByText("Esa versión ya fue reemplazada.")).toBeVisible();
  for (const desde of ["", "?desde=999999"]) {
    await page.goto(`/panel/cotizaciones/${id}/nueva-version${desde}`);
    await expect(page).toHaveURL(new RegExp(`desde=${versiones[1].id}$`));
    await expect(page.getByRole("heading", { level: 1, name: "Versión 3" })).toBeVisible();
  }
});

test("el descuento no pasa el subtotal, el adelanto no pasa el total y la validez no es anterior a hoy", async ({ page }, info) => {
  const s = sufijo(info);
  const nombre = `Cotizable ${s}`;
  const cliente = await crearClienteEnBase({ nombre: `Con errores ${s}`, telefono: telefono(info, 5), placa: `CE25${s}1` });
  await ingresarComoDueno(page);
  await page.goto(`/panel/cotizaciones/nueva?cliente=${cliente}`, { waitUntil: "networkidle" });
  await aServicios(page);
  await page.getByRole("radio", { name: "En persona" }).check();
  await crear(page);
  await expect(page.getByText("Agrega al menos un servicio.")).toBeVisible();

  await elegir(page, 1, nombre, "Con precio");
  await page.getByText("Agregar descuento", { exact: true }).click();
  await page.getByLabel("Monto del descuento").fill("500");
  await crear(page);
  await expect(page.getByText("El descuento no puede ser mayor que el subtotal.")).toBeVisible();
  await expect(page.getByLabel("Monto del descuento")).toBeFocused();

  await page.getByLabel("Monto del descuento").fill("");
  // Plegadas, diciendo lo que va al PDF (el adelanto de Configuración y la validez)
  await expect(page.getByText(/^Ahora: \d+ Bs, hasta el /)).toBeVisible();
  await page.getByText("Cambiar adelanto o validez", { exact: true }).click();
  await page.getByLabel("Adelanto sugerido").fill("451");
  await crear(page);
  await expect(page.getByText("El adelanto no puede ser mayor que el total.")).toBeVisible();

  await page.getByLabel("Adelanto sugerido").fill("100");
  await page.getByLabel("Válida hasta").fill("2020-01-01");
  await crear(page);
  await expect(page.getByText("La validez no puede ser anterior a hoy.")).toBeVisible();
});

test("pedido 24: el encargado con Cotizaciones cotiza y ve los montos; sin el permiso no entra; el perfil Taller tampoco", async ({ page }, info) => {
  const s = sufijo(info);
  const nombre = `Cotizable ${s}`;
  const cliente = await crearClienteEnBase({ nombre: `Para encargado ${s}`, telefono: telefono(info, 6), placa: `CP25${s}1` });
  const otra = await crearCotizacionEnBase({ placa: `CP25${s}1`, numero: `2030-9${s === "C" ? 1 : 2}25`, total: 300 });
  await crearUsuario({ usuario: `enc-hu25-${s.toLowerCase()}`, nombre: "Encargado que cotiza", contrasena: "encargado-123", rol: "encargado", permisos: ["cotizaciones"] });
  await ingresar(page, `enc-hu25-${s.toLowerCase()}`, "encargado-123");
  await expect(page).toHaveURL(/\/panel$/);
  await page.goto(`/panel/cotizaciones/${otra}`);
  await expect(page.getByRole("list", { name: "Versiones" })).toContainText("300 Bs");
  // Sin Clientes no se enlaza a la ficha
  await expect(page.getByRole("link", { name: /^Ver ficha del cliente/ })).toHaveCount(0);
  await expect(page.getByRole("group", { name: "Datos de la cotización" })).toContainText("Cliente");

  await page.goto(`/panel/cotizaciones/nueva?cliente=${cliente}`, { waitUntil: "networkidle" });
  await aServicios(page);
  await elegir(page, 1, nombre, "Con precio");
  await page.getByRole("radio", { name: "En persona" }).check();
  await crear(page);
  await expect(page).toHaveURL(/\/panel\/cotizaciones\/\d+\?creada=1(?:[?&]volver=[^&#]*)?$/);
  const [{ autor }] = await consultar<{ autor: string }>(
    "select u.nombre as autor from cotizacion c join usuario u on u.id = c.created_by where c.consulta_id = $1",
    [idDeLaPagina(page)],
  );
  expect(autor).toBe("Encargado que cotiza");

  // Sin el permiso: ni la lista ni cotizar
  await page.context().clearCookies();
  await crearUsuario({ usuario: `enc-sin-hu25-${s.toLowerCase()}`, nombre: "Encargado sin cotizaciones", contrasena: "encargado-123", rol: "encargado", permisos: ["clientes", "agenda"] });
  await ingresar(page, `enc-sin-hu25-${s.toLowerCase()}`, "encargado-123");
  await expect(page).toHaveURL(/\/panel$/);
  for (const ruta of ["/panel/cotizaciones", "/panel/cotizaciones/nueva", `/panel/cotizaciones/${otra}`]) {
    await page.goto(ruta);
    await expect(page).toHaveURL(/\/panel\/sin-acceso$/);
  }
  // En la ficha del cliente no aparece la sección
  await page.goto(`/panel/clientes/${cliente}`);
  await expect(page.getByRole("heading", { name: "Cotizaciones" })).toHaveCount(0);

  await page.context().clearCookies();
  await crearUsuario({ usuario: `taller-hu25-${s.toLowerCase()}`, nombre: "Chico del taller", contrasena: "taller-123", rol: "encargado", permisos: PERFIL_TALLER });
  await ingresar(page, `taller-hu25-${s.toLowerCase()}`, "taller-123");
  await expect(page).toHaveURL(/\/panel$/);
  await page.goto("/panel/cotizaciones/nueva");
  await expect(page).toHaveURL(/\/panel\/sin-acceso$/);
});

test("Atrás vuelve al paso anterior sin perder lo escrito; nada se registra hasta crear", async ({ page }, info) => {
  const s = sufijo(info);
  await ingresarComoDueno(page);
  await page.goto("/panel/cotizaciones/nueva?nuevo=1", { waitUntil: "networkidle" });
  await page.getByLabel("Nombre", { exact: true }).fill(`Con atrás ${s}`);
  await page.getByRole("textbox", { name: "WhatsApp" }).fill(local(info, 7));
  await aVehiculo(page);
  await page.getByLabel("Placa", { exact: true }).fill(`CA25${s}1`);
  await page.getByLabel("Tamaño", { exact: true }).selectOption({ index: 1 });
  await aServicios(page);
  await expect(pasoActual(page)).toContainText("Servicios y precio");
  // "Cambiar" vuelve en el historial: después, Atrás lleva al paso anterior y no de nuevo a Servicios
  await page.getByRole("button", { name: "Cambiar vehículo" }).click();
  await expect(pasoActual(page)).toContainText("Vehículo");
  await expect(page.getByLabel("Placa", { exact: true })).toHaveValue(`CA25${s}1`);
  await page.getByRole("button", { name: "Atrás" }).click();
  await expect(pasoActual(page)).toContainText("Cliente");
  await expect(page.getByLabel("Nombre", { exact: true })).toHaveValue(`Con atrás ${s}`);
  await expect(page).toHaveURL(/\/panel\/cotizaciones\/nueva\?nuevo=1$/);
  // Adelante del navegador revisa el paso que salta: sin nombre, se queda en Cliente con el error
  await page.getByLabel("Nombre", { exact: true }).fill("");
  await page.goForward();
  await expect(page.getByText("Escribe el nombre.")).toBeVisible();
  await expect(pasoActual(page)).toContainText("Cliente");
  // Con el nombre, el del celular (o el navegador) avanza y retrocede de a un paso
  await page.getByLabel("Nombre", { exact: true }).fill(`Con atrás ${s}`);
  await aVehiculo(page);
  await expect(page.getByRole("region", { name: "Cotización para" })).toContainText(`Con atrás ${s}`);
  await page.goBack();
  await expect(pasoActual(page)).toContainText("Cliente");
  // Hasta "Crear cotización" no se registró nada
  expect(await consultar("select 1 from cliente where nombre = $1", [`Con atrás ${s}`])).toEqual([]);
});
