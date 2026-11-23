import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { consultar, crearClienteEnBase, crearCotizacionEnBase, crearUsuario, ingresar, ingresarComoDueno, PERFIL_TALLER, PNG, sinAdelantoEnReserva } from "./apoyo";

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

// Pedido 31, parte 2 (P31b): alguien nuevo se cotiza sin registrarlo; el tamaño da el precio, y qué vehículo es y la foto son opcionales
test("alguien nuevo en tres pasos: nombre y WhatsApp, la placa, el tamaño y la foto, y los servicios con el precio del tamaño", async ({ page }, info) => {
  const s = sufijo(info);
  const nombre = await crearServicioConPrecios(info);
  await ingresarComoDueno(page);
  await page.goto("/panel/cotizaciones");
  await page.getByRole("link", { name: "Nueva cotización" }).click();
  // Paso 1: el cliente; buscarlo o uno nuevo
  await expect(pasoActual(page)).toContainText("Cliente");
  await page.getByRole("link", { name: "Cliente nuevo" }).click();
  await expect(page.getByRole("group", { name: "Cliente nuevo" })).toBeVisible();
  await expect(pasoActual(page)).toContainText("Cliente");

  // Vacío: los errores del cliente, sin pasar al vehículo; el foco, al primero
  await aVehiculo(page);
  await expect(page.getByText("Escribe el nombre.")).toBeVisible();
  await expect(page.getByLabel("Nombre", { exact: true })).toBeFocused();
  await expect(pasoActual(page)).toContainText("Cliente");
  // Solo nombre y WhatsApp: sin correo, NIT ni notas (no se registra)
  await expect(page.getByText("Agregar correo, NIT y notas")).toHaveCount(0);
  await page.getByLabel("Nombre", { exact: true }).fill(`Nuevo cotizado ${s}`);
  await page.getByRole("textbox", { name: "WhatsApp" }).fill(local(info, 1));
  await aVehiculo(page);

  // Paso 2: el vehículo, solo la placa y el tamaño, y si se quiere una foto (22/11); arriba, el cliente
  await expect(pasoActual(page)).toContainText("Vehículo");
  await expect(page.getByRole("region", { name: "Cotización para" })).toContainText(`Nuevo cotizado ${s}`);
  await expect(page.getByLabel("Marca")).toHaveCount(0);
  await aServicios(page);
  await expect(page.getByText("Escribe la placa.")).toBeVisible();
  await expect(page.getByText("Elige el tamaño.")).toBeVisible();
  await expect(page.getByLabel("Placa", { exact: true })).toBeFocused();
  await page.getByLabel("Placa", { exact: true }).fill(`cn25 ${s}1`);
  await page.getByLabel("Tamaño", { exact: true }).selectOption({ index: 1 });
  await page.getByLabel("Galería para la foto del vehículo").setInputFiles({ name: "auto.png", mimeType: "image/png", buffer: PNG });
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
  // Otro tamaño, otro precio sugerido: este no tiene, y vuelve al cambiar de nuevo (tocando "Vehículo" en el indicador, 20/11)
  await page.getByRole("navigation", { name: "Pasos de la cotización" }).getByRole("button", { name: "Ir al paso Vehículo" }).click();
  await page.getByLabel("Tamaño", { exact: true }).selectOption({ index: 2 });
  await aServicios(page);
  await expect(precio(page, 1)).toHaveValue("");
  await expect(page.getByText("Sin precio en el catálogo para este tamaño: escribe el precio")).toBeVisible();
  await page.getByRole("navigation", { name: "Pasos de la cotización" }).getByRole("button", { name: "Ir al paso Vehículo" }).click();
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
  // El desglose, en el recuadro del descuento y, en la computadora, también en el resumen del costado (C7 §5.2)
  const totales = page.locator("dl").filter({ hasText: "Subtotal" }).first();
  await expect(totales).toContainText("650,50 Bs");
  // El total: arriba en "Total y condiciones" en el celular; al costado, en el resumen, en la computadora
  await expect(page.getByRole("main").getByText("600,50 Bs", { exact: true }).locator("visible=true").first()).toBeVisible();
  await crear(page);

  await expect(page).toHaveURL(/\/panel\/cotizaciones\/\d+\?creada=1(?:[?&]volver=[^&#]*)?$/);
  const id = idDeLaPagina(page);
  // Sin cliente ni vehículo: lo del interesado queda en la consulta, con la foto (privada)
  const [c] = await consultar<{ numero: string; es_estimado: boolean; canal: string | null; estado: string; cliente_id: number | null; vehiculo_id: number | null; nombre: string; telefono: string; placa: string; fotos: number }>(
    `select k.numero, k.es_estimado, q.canal, q.estado, q.cliente_id, q.vehiculo_id, q.interesado_nombre as nombre, q.interesado_telefono as telefono,
            q.interesado_placa as placa, (select count(*)::int from consulta_archivo a join archivo f on f.id = a.archivo_id where a.consulta_id = q.id and f.privado) as fotos
     from consulta q join cotizacion k on k.consulta_id = q.id where q.id = $1`,
    [id],
  );
  expect(c).toEqual({
    numero: expect.stringMatching(/^\d{4}-\d{4}$/),
    es_estimado: true,
    canal: null,
    estado: "cotizado",
    cliente_id: null,
    vehiculo_id: null,
    nombre: `Nuevo cotizado ${s}`,
    telefono: telefono(info, 1),
    placa: `CN25${s}1`,
    fotos: 1,
  });
  await expect(page.getByText(/^Cotización creada\./)).toBeVisible();
  // Recorrido visual del 23/11: la placa como título; el número y el estado, debajo
  await expect(page.getByRole("heading", { level: 1, name: `CN25${s}1` })).toBeVisible();
  await expect(page.getByRole("main").getByText(`Cotización ${c.numero}`)).toBeVisible();
  await expect(page.getByRole("main").getByText("Pendiente", { exact: true })).toBeVisible();
  const versiones = page.getByRole("region", { name: "Precio" });
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

  // No está en Clientes; en la ficha, su placa y su foto, sin enlace a una ficha de cliente
  expect(await consultar("select 1 from cliente where nombre = $1", [`Nuevo cotizado ${s}`])).toEqual([]);
  expect(await consultar("select 1 from vehiculo where placa = $1", [`CN25${s}1`])).toEqual([]);
  await expect(page.getByRole("link", { name: /^Ver ficha del cliente: / })).toHaveCount(0);
  await expect(page.getByRole("main")).toContainText(`CN25${s}1`);
  await expect(page.getByRole("button", { name: "Ver la foto del vehículo" })).toBeVisible();
  // En la lista, con su nombre, su placa y "Sin registrar"; también se la encuentra por la placa
  await page.goto(`/panel/cotizaciones?q=CN25${s}1`);
  const tarjeta = page.getByRole("list", { name: "Cotizaciones" }).getByRole("listitem").filter({ hasText: `CN25${s}1` });
  await expect(tarjeta).toContainText("Sin registrar");
});

test("una placa ya registrada avisa y ofrece cotizarle a su dueño", async ({ page }, info) => {
  const s = sufijo(info);
  const nombre = await crearServicioConPrecios(info);
  const dueno = await crearClienteEnBase({ nombre: `Dueño de la placa ${s}`, telefono: telefono(info, 9), placa: `PR25${s}1` });
  await ingresarComoDueno(page);
  await page.goto("/panel/cotizaciones/nueva?nuevo=1", { waitUntil: "networkidle" });
  await page.getByLabel("Nombre", { exact: true }).fill(`Otro ${s}`);
  await page.getByRole("textbox", { name: "WhatsApp" }).fill(local(info, 6));
  await aVehiculo(page);
  await page.getByLabel("Placa", { exact: true }).fill(`PR25${s}1`);
  await page.getByLabel("Tamaño", { exact: true }).selectOption({ index: 1 });
  await aServicios(page);
  await elegir(page, 1, nombre, "Con precio");
  await page.getByRole("radio", { name: "En persona" }).check();
  await crear(page);
  await expect(pasoActual(page)).toContainText("Vehículo");
  await expect(page.getByText(`La placa PR25${s}1 ya está registrada a nombre de Dueño de la placa ${s}.`)).toBeVisible();
  await expect(page.getByRole("link", { name: `Usar a Dueño de la placa ${s}` })).toHaveAttribute("href", `/panel/cotizaciones/nueva?cliente=${dueno}`);
});

// 22/11: con los pasos de siempre de la reserva, ya escritos; el cliente y el vehículo se registran al reservar
test("reservar la de un interesado: sus pasos llegan escritos y se registra con la reserva", async ({ page }, info) => {
  const s = sufijo(info);
  const nombre = await crearServicioConPrecios(info);
  await ingresarComoDueno(page);
  await page.goto("/panel/cotizaciones/nueva?nuevo=1", { waitUntil: "networkidle" });
  await page.getByLabel("Nombre", { exact: true }).fill(`Interesado ${s}`);
  await page.getByRole("textbox", { name: "WhatsApp" }).fill(local(info, 8));
  await aVehiculo(page);
  await page.getByLabel("Placa", { exact: true }).fill(`RI25${s}1`);
  await page.getByLabel("Tamaño", { exact: true }).selectOption({ index: 1 });
  await aServicios(page);
  await elegir(page, 1, nombre, "Con precio");
  await page.getByRole("radio", { name: "En persona" }).check();
  await crear(page);
  await expect(page).toHaveURL(/\/panel\/cotizaciones\/\d+\?creada=1/);
  const id = idDeLaPagina(page);
  const [{ cotizacion }] = await consultar<{ cotizacion: number }>("select id as cotizacion from cotizacion where consulta_id = $1", [id]);

  // La reserva empieza en el cliente, escrito; después el vehículo, con la placa y el tamaño, y la fecha (sin Servicios)
  const [{ dia }] = await consultar<{ dia: string }>("select to_char((now() at time zone 'America/La_Paz')::date + $1::int, 'YYYY-MM-DD') as dia", [
    (info.project.name === "celular" ? 300 : 320) + info.retry * 7,
  ]);
  await page.goto(`/panel/agenda/nueva?cotizacion=${cotizacion}&fecha=${dia}`, { waitUntil: "networkidle" });
  const pasoReserva = page.getByRole("navigation", { name: "Pasos de la reserva" }).locator('[aria-current="step"]');
  await expect(page.getByRole("heading", { level: 1, name: "Nueva reserva" })).toBeVisible();
  await expect(pasoReserva).toHaveText("Cliente");
  await expect(page.getByLabel("Nombre", { exact: true })).toHaveValue(`Interesado ${s}`);
  await page.getByRole("button", { name: "Siguiente: vehículo" }).click();
  await expect(pasoReserva).toHaveText("Vehículo");
  await expect(page.getByLabel("Placa", { exact: true })).toHaveValue(`RI25${s}1`);
  await page.getByLabel("Marca").fill("Toyota");
  await page.getByLabel("Marca").press("Tab");
  await page.getByRole("button", { name: "Siguiente: fecha" }).click();
  await expect(pasoReserva).toHaveText("Fecha");
  // Atrás vuelve al vehículo (no hay Servicios)
  await page.getByRole("button", { name: "Atrás" }).click();
  await expect(pasoReserva).toHaveText("Vehículo");
  await page.getByRole("button", { name: "Siguiente: fecha" }).click();
  // Hasta reservar, no se registró nada
  expect(await consultar("select 1 from cliente where nombre = $1", [`Interesado ${s}`])).toEqual([]);
  await sinAdelantoEnReserva(page);
  await page.getByRole("button", { name: "Reservar" }).click();
  await expect(page).toHaveURL(/\/panel\/agenda\/\d+\?agendada=1/);

  // Registrado con la reserva: la cotización queda con su cliente y su vehículo
  const [q] = await consultar<{ cliente: string; placa: string; marca: string; estado: string }>(
    "select cl.nombre as cliente, v.placa, v.marca, q.estado from consulta q join cliente cl on cl.id = q.cliente_id join vehiculo v on v.id = q.vehiculo_id where q.id = $1",
    [id],
  );
  expect(q).toEqual({ cliente: `Interesado ${s}`, placa: `RI25${s}1`, marca: "Toyota", estado: "confirmado" });
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
  expect(await consultar("select 1 from consulta where interesado_nombre = $1", [`Repetido ${s}`])).toEqual([]);
});

test("desde la ficha del cliente: llega elegido, con su vehículo marcado, y la cotización queda en su ficha", async ({ page }, info) => {
  const s = sufijo(info);
  const nombre = `Cotizable ${s}`;
  const id = await crearClienteEnBase({ nombre: `Desde ficha ${s}`, telefono: telefono(info, 3), placa: `CF25${s}1` });
  await ingresarComoDueno(page);
  await page.goto(`/panel/clientes/${id}`);
  await expect(page.getByText("Todavía no tiene trabajos ni cotizaciones.")).toBeVisible();
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
  await expect(page.getByRole("region", { name: "Precio" })).toContainText("En persona");

  await page.goto(`/panel/clientes/${id}`);
  await expect(page.getByRole("list", { name: "Historia" }).getByRole("link").filter({ hasText: `CF25${s}1` })).toBeVisible();
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
  await expect(page.getByText("Versión 1: 450 Bs").locator("visible=true")).toBeVisible();
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
  // La que vale, a la vista; la anterior, plegada (23/11)
  const seccionPrecio = page.getByRole("region", { name: "Precio" });
  await expect(seccionPrecio).toContainText("Versión 2");
  await seccionPrecio.getByText("Ver la versión anterior").click();
  await expect(seccionPrecio.getByRole("list", { name: "Versiones anteriores" }).getByRole("listitem")).toHaveCount(1);
  await expect(seccionPrecio.getByRole("list", { name: "Versiones anteriores" })).toContainText("Versión 1");

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
  // Siempre a la vista (hallazgo 8), con lo que va al PDF: el adelanto de Configuración y la validez
  await expect(page.getByLabel("Adelanto sugerido")).toHaveValue(/^\d+/);
  await expect(page.getByLabel("Válida hasta")).toHaveValue(/^\d{4}-\d{2}-\d{2}$/);
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
  await expect(page.getByRole("region", { name: "Precio" })).toContainText("300 Bs");
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
  await page.getByRole("navigation", { name: "Pasos de la cotización" }).getByRole("button", { name: "Ir al paso Vehículo" }).click();
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

// Recorrido visual del 22/11: la columna del tiempo dice qué mide según la pestaña, y las rechazadas, su motivo
test("la lista dice cuándo se envió, aceptó o rechazó, y por qué se perdió", async ({ page }, info) => {
  const s = sufijo(info);
  await crearClienteEnBase({ nombre: `Perdida ${s}`, telefono: `5917${info.project.name === "celular" ? 3 : 4}2509${info.retry}0`, placa: `LR25${s}1` });
  await crearCotizacionEnBase({ placa: `LR25${s}1`, numero: `2026-95${info.project.name === "celular" ? 1 : 2}${info.retry}`, estado: "perdido", dias: 4 });
  await ingresarComoDueno(page);
  await page.goto(`/panel/cotizaciones?vista=rechazadas&q=LR25${s}1`);
  const fila = page.getByRole("list", { name: "Cotizaciones" }).or(page.getByRole("table", { name: "Cotizaciones" })).getByRole("link").filter({ hasText: `Perdida ${s}` });
  await expect(fila).toContainText("Precio");
  await expect(fila).toContainText("hace 4 días");
  // La tabla de la computadora titula la columna con lo que mide
  if (info.project.name === "escritorio") await expect(page.getByRole("main").getByText("Rechazada", { exact: true })).toBeVisible();
});
