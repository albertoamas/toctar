import { expect, test, type Browser, type Page, type TestInfo } from "@playwright/test";
import { consultar, crearClienteEnBase, crearUsuario, ingresar, ingresarComoDueno, PNG } from "./apoyo";

// HU-30 Agendar reserva (flujo crítico 2). Especificación: docs/08-desarrollo/etapas/C3-agenda-pagos.md §9.
// Cada prueba usa sus propios días (lejos de hoy y distintos por proyecto) para no chocar con las demás en los
// espacios. En serie: las del dueño entran con el mismo usuario y, a la vez, chocaban con el límite de intentos.
test.describe.configure({ mode: "serial" });

// Datos propios de cada proyecto y de cada intento: si el CI reintenta una prueba, no choca con lo que dejó la anterior
const sufijo = (info: TestInfo) => `${info.project.name === "celular" ? "C" : "E"}${info.retry || ""}`;
const telefono = (info: TestInfo, n: number) => `5917${info.project.name === "celular" ? 1 : 2}30${info.retry}0${n}0`;

/** Un día propio de cada prueba: dentro de 100 a 300 días, según el proyecto y el número de prueba (y el intento). */
async function diaPropio(info: TestInfo, n: number): Promise<string> {
  const [{ dia }] = await consultar<{ dia: string }>("select to_char(current_date + $1::int, 'YYYY-MM-DD') as dia", [
    (info.project.name === "celular" ? 100 : 200) + n * 5 + info.retry * 2000,
  ]);
  return dia;
}

/** Un servicio con una variante de 2 días y precio para el primer tamaño. Devuelve su variante y su nombre. */
async function servicioDeDosDias(info: TestInfo): Promise<{ varianteId: number; nombre: string }> {
  const s = sufijo(info);
  const nombre = `Para agendar ${s}`;
  await consultar(
    `with sv as (
       insert into servicio (nombre, slug, resumen, orden, duracion_dias) values ($1, $2, 'Servicio de prueba para la agenda.', 99, 2)
       on conflict do nothing returning id
     ), v as (insert into variante (servicio_id, nombre, orden) select id, 'Única', 1 from sv returning id)
     insert into precio (variante_id, tamano_id, monto, created_by)
     select v.id, (select id from tamano_vehiculo order by orden limit 1), 900, (select id from usuario where nombre_usuario = 'dueno') from v`,
    [nombre, `para-agendar-${s.toLowerCase()}`],
  );
  const [{ id }] = await consultar<{ id: number }>("select v.id from variante v join servicio s on s.id = v.servicio_id where s.nombre = $1", [nombre]);
  return { varianteId: id, nombre };
}

/** Una cotización pendiente (versión vigente de 900 Bs con 100 de descuento), directo en la base. */
async function consultaCotizada(info: TestInfo, n: number): Promise<{ consultaId: number; cotizacionId: number }> {
  const s = sufijo(info);
  const { varianteId, nombre } = await servicioDeDosDias(info);
  await crearClienteEnBase({ nombre: `Agenda ${n} ${s}`, telefono: telefono(info, n), placa: `AG30${s}${n}` });
  const [c] = await consultar<{ consulta: number; cotizacion: number }>(
    `with q as (
       insert into consulta (cliente_id, vehiculo_id, estado, created_by)
       select v.cliente_id, v.id, 'cotizado', v.created_by from vehiculo v where v.placa = $1 returning id, created_by
     ), c as (
       insert into cotizacion (consulta_id, numero, version, es_estimado, subtotal, descuento, total, adelanto_sugerido, valida_hasta,
         condiciones, garantia, formas_pago, datos_documento, created_by)
       select q.id, '2030-' || $2, 1, false, 900, 100, 800, 200, current_date + 15, 'c', 'g', 'f', '{}'::jsonb, q.created_by from q returning id
     ), l as (
       insert into cotizacion_linea (cotizacion_id, variante_id, tamano_id, descripcion, precio_sugerido, precio, orden)
       select c.id, $3, (select id from tamano_vehiculo order by orden limit 1), $4, 900, 900, 0 from c returning cotizacion_id
     )
     select (select id from q) as consulta, (select cotizacion_id from l) as cotizacion`,
    [`AG30${s}${n}`, `${s === "C" ? 1 : 2}${String(n).padStart(3, "0")}`, varianteId, nombre],
  );
  return { consultaId: c.consulta, cotizacionId: c.cotizacion };
}

const espacio = (page: Page) => page.getByLabel("Espacio", { exact: true });

test("desde la cotización: la versión y la cotización quedan aceptadas, las líneas copiadas y el adelanto registrado", async ({ page }, info) => {
  const { consultaId, cotizacionId } = await consultaCotizada(info, 1);
  const dia = await diaPropio(info, 1);
  await ingresarComoDueno(page);
  await page.goto(`/panel/cotizaciones/${consultaId}`);
  await expect(page.getByRole("link", { name: "Agendar" })).toHaveAttribute("href", `/panel/agenda/nueva?cotizacion=${cotizacionId}`);
  await page.goto(`/panel/agenda/nueva?cotizacion=${cotizacionId}&fecha=${dia}`);

  // La entrega sugerida usa la duración del servicio (2 días: sale al día siguiente)
  await expect(page.getByLabel("Ingresa el")).toHaveValue(dia);
  const [{ fin }] = await consultar<{ fin: string }>("select to_char($1::date + 1, 'YYYY-MM-DD') as fin", [dia]);
  await expect(page.getByLabel("Entrega aproximada")).toHaveValue(fin);
  // Los servicios de la cotización con su total, en su recuadro (pulido 10.2)
  const cotizada = page.getByRole("region", { name: /^Cotización/ });
  await expect(cotizada.getByText("Total", { exact: true })).toBeVisible();
  await expect(cotizada.getByText("800 Bs", { exact: true }).last()).toBeVisible();

  // Sin elegir espacio ni método: los errores
  await page.getByRole("button", { name: "Agendar" }).click();
  await expect(page.getByText("Elige el espacio.")).toBeVisible();
  await expect(page.getByText("Elige cómo pagó.")).toBeVisible();

  await espacio(page).selectOption({ index: 1 });
  await page.getByRole("radio", { name: "QR" }).check();
  // La hora y la nota van plegadas (pulido 10.2): al abrirlas, el foco pasa a la hora
  await expect(page.getByLabel("Hora aproximada")).toBeHidden();
  await page.getByText("Agregar hora y nota").click();
  await expect(page.getByLabel("Hora aproximada")).toBeFocused();
  await page.getByLabel("Hora aproximada").fill("a las 9");
  // El adelanto con la foto del comprobante (HU-32): queda privada y se ve en la reserva
  await page.locator("#comprobante").setInputFiles({ name: "comprobante.png", mimeType: "image/png", buffer: PNG });
  await expect(page.getByRole("img", { name: "Foto del comprobante elegida" })).toBeVisible();
  // El adelanto sugerido sale de Configuración (otra prueba lo cambia mientras esta corre): se usa el que trae
  const adelanto = Number(await page.getByLabel("Monto").inputValue());
  await page.getByRole("button", { name: "Agendar" }).click();
  await expect(page).toHaveURL(/\/panel\/agenda\/\d+\?agendada=1$/);
  await expect(page.getByText(/^Reserva agendada para el/)).toBeVisible();
  const saldo = page.locator("dl").filter({ hasText: "Saldo" });
  await expect(saldo).toContainText("800 Bs");
  await expect(saldo).toContainText(`${800 - adelanto} Bs`);
  await expect(page.getByRole("button", { name: /^Ver el comprobante: Adelanto por QR/ })).toBeVisible();

  const [r] = await consultar<{ trabajo: number; descuento: string; cot: string; con: string; lineas: number; adelanto: string; metodo: string; privado: boolean }>(
    `select t.id as trabajo, t.descuento, c.estado as cot, q.estado as con,
       (select count(*)::int from trabajo_linea l where l.trabajo_id = t.id) as lineas,
       (select p.monto from pago p where p.trabajo_id = t.id) as adelanto, (select p.metodo from pago p where p.trabajo_id = t.id) as metodo,
       (select a.privado from pago p join archivo a on a.id = p.comprobante_archivo_id where p.trabajo_id = t.id) as privado
     from trabajo t join cotizacion c on c.id = t.cotizacion_id join consulta q on q.id = t.consulta_id where t.cotizacion_id = $1`,
    [cotizacionId],
  );
  expect(r).toMatchObject({ descuento: "100.00", cot: "aceptada", con: "confirmado", lineas: 1, adelanto: adelanto.toFixed(2), metodo: "qr", privado: true });
  // Auditoría de la reserva y del pago (RNF-10)
  const auditoria = await consultar<{ accion: string }>(
    "select accion from auditoria where (entidad = 'trabajo' and entidad_id = $1) or (entidad = 'pago' and (datos->>'trabajoId')::int = $1) order by id",
    [r.trabajo],
  );
  expect(auditoria.map((a) => a.accion)).toEqual(["agendar", "crear"]);

  // En la cotización: la reserva, y ya no se agenda otra vez
  await page.goto(`/panel/cotizaciones/${consultaId}`);
  await expect(page.getByRole("link", { name: /^Reserva del/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "Agendar" })).toHaveCount(0);
  await page.goto(`/panel/agenda/nueva?cotizacion=${cotizacionId}`);
  await expect(page.getByText("Esa cotización ya fue agendada o tiene una versión nueva.")).toBeVisible();
});

test("la base rechaza un cruce en el mismo espacio aunque el código fallara; una cancelada no ocupa", async ({}, info) => {
  const dia = await diaPropio(info, 2);
  await crearClienteEnBase({ nombre: `Cruce ${sufijo(info)}`, telefono: telefono(info, 2), placa: `CR30${sufijo(info)}2` });
  const insertar = (inicio: string, fin: string, estado = "agendado") =>
    consultar(
      `insert into trabajo (sucursal_id, cliente_id, vehiculo_id, espacio_id, fecha_inicio, fecha_fin, estado, motivo_cancelacion, created_by)
       select e.sucursal_id, v.cliente_id, v.id, e.id, $2::date, $3::date, $4, case when $4 = 'cancelado' then 'prueba' end, v.created_by
       from vehiculo v, (select * from espacio_taller order by orden limit 1) e where v.placa = $1`,
      [`CR30${sufijo(info)}2`, inicio, fin, estado],
    );
  const [{ masUno, masTres }] = await consultar<{ masUno: string; masTres: string }>(
    `select to_char($1::date + 1, 'YYYY-MM-DD') as "masUno", to_char($1::date + 3, 'YYYY-MM-DD') as "masTres"`,
    [dia],
  );
  await insertar(dia, masUno);
  // Empieza el mismo día en que termina la otra: se cruzan (bordes incluidos)
  await expect(insertar(masUno, masTres)).rejects.toMatchObject({ code: "23P01", constraint: "trabajo_sin_cruces" });
  // Una cancelada en esos días no ocupa
  await insertar(masUno, masTres, "cancelado");
});

test("solo se ofrecen los espacios libres; si dos personas agendan el mismo a la vez, una recibe un aviso", async ({ page, browser }, info) => {
  const dia = await diaPropio(info, 3);
  const espacios = await consultar<{ id: number; nombre: string }>("select id, nombre from espacio_taller where activo order by orden");
  // Todos ocupados menos el último
  await crearClienteEnBase({ nombre: `Ocupa ${sufijo(info)}`, telefono: telefono(info, 3), placa: `OC30${sufijo(info)}3` });
  for (const e of espacios.slice(0, -1)) {
    await consultar(
      `insert into trabajo (sucursal_id, cliente_id, vehiculo_id, espacio_id, fecha_inicio, fecha_fin, created_by)
       select $2, v.cliente_id, v.id, $3, $4::date, $4::date, v.created_by from vehiculo v where v.placa = $1`,
      [`OC30${sufijo(info)}3`, 1, e.id, dia],
    );
  }
  const a = await consultaCotizada(info, 4);
  const b = await consultaCotizada(info, 5);
  await ingresarComoDueno(page);
  const otra = await otraPersona(browser, info);

  const abrir = async (p: Page, cotizacionId: number) => {
    await p.goto(`/panel/agenda/nueva?cotizacion=${cotizacionId}&fecha=${dia}`);
    await p.getByLabel("Entrega aproximada").fill(dia);
    await expect(espacio(p).locator("option")).toHaveText(["Elige el espacio", espacios.at(-1)!.nombre]);
    await espacio(p).selectOption({ label: espacios.at(-1)!.nombre });
    await p.getByRole("checkbox", { name: "Sin adelanto" }).check();
  };
  await abrir(page, a.cotizacionId);
  await abrir(otra.page, b.cotizacionId);
  // A la vez
  await Promise.all([page.getByRole("button", { name: "Agendar" }).click(), otra.page.getByRole("button", { name: "Agendar" }).click()]);
  // Lo que ve cada persona: la redirección de la acción es una navegación interna (sin evento "load"), y esperar la
  // dirección con waitForURL a veces no terminaba aunque la reserva ya se mostraba (CI, 25/10)
  const resultado = async (p: Page) =>
    Promise.race([
      p.getByText(/^Reserva agendada para el /).waitFor().then(() => "agendada"),
      p.getByText("Ese espacio se ocupó recién: elige otro.").waitFor().then(() => "ocupado"),
    ]);
  expect((await Promise.all([resultado(page), resultado(otra.page)])).sort()).toEqual(["agendada", "ocupado"]);
  await otra.ctx.close();
});

async function otraPersona(browser: Browser, info: TestInfo) {
  const ctx = await browser.newContext(info.project.use);
  const page = await ctx.newPage();
  await crearUsuario({ usuario: `dueno2-hu30-${sufijo(info).toLowerCase()}`, nombre: "Otro dueño", contrasena: "dueno-hu30-123", rol: "encargado", permisos: ["agenda", "cotizaciones", "pagos"] });
  await ingresar(page, `dueno2-hu30-${sufijo(info).toLowerCase()}`, "dueno-hu30-123");
  await expect(page).toHaveURL(/\/panel$/);
  return { ctx, page };
}

test("reserva directa: cliente y vehículo registrados, servicio del catálogo con su precio, sin adelanto", async ({ page }, info) => {
  const s = sufijo(info);
  const { nombre } = await servicioDeDosDias(info);
  const clienteId = await crearClienteEnBase({ nombre: `Directa ${s}`, telefono: telefono(info, 6), placa: `DI30${s}6` });
  const dia = await diaPropio(info, 6);
  await ingresarComoDueno(page);
  await page.goto("/panel/agenda");
  await page.getByRole("link", { name: "Nueva reserva" }).click();
  await page.getByLabel("Buscar por nombre, teléfono o placa").fill(`DI30${s}6`);
  // La búsqueda va a la dirección (?q=) un momento después de escribir y la lista se vuelve a armar: un toque antes de
  // eso caía en la lista vieja y se perdía (CI del PR #95). Se toca cuando la búsqueda ya está aplicada
  await expect(page).toHaveURL(new RegExp(`q=DI30${s}6`));
  const elegir = page.getByRole("list", { name: "Elegir cliente" });
  await expect(elegir.getByRole("link")).toHaveCount(1);
  await elegir.getByRole("link", { name: new RegExp(`Directa ${s}`) }).click();
  await expect(page).toHaveURL(new RegExp(`cliente=${clienteId}`));
  // Con un solo vehículo, no hace falta elegirlo
  await page.getByRole("button", { name: "Agregar servicio" }).click();
  await page.getByLabel("Servicio 1", { exact: true }).selectOption({ label: nombre });
  await expect(page.getByLabel("Precio del servicio 1")).toHaveValue("900");
  await page.getByLabel("Ingresa el").fill(dia);
  await expect(espacio(page)).toBeEnabled();
  await espacio(page).selectOption({ index: 1 });
  await page.getByRole("checkbox", { name: "Sin adelanto" }).check();
  await page.getByRole("button", { name: "Agendar" }).click();
  await expect(page).toHaveURL(/\/panel\/agenda\/\d+\?agendada=1$/);
  await expect(page.getByRole("heading", { level: 1, name: `DI30${s}6` })).toBeVisible();
  await expect(page.getByText("Todavía no hay pagos.")).toBeVisible();
  await expect(page.locator("dl").filter({ hasText: "Saldo" })).toContainText("900 Bs");
});

test("el encargado con Agenda sin Pagos agenda sin montos ni adelanto; el técnico no entra", async ({ page }, info) => {
  const s = sufijo(info).toLowerCase();
  const { consultaId, cotizacionId } = await consultaCotizada(info, 7);
  const dia = await diaPropio(info, 7);
  await crearUsuario({ usuario: `enc-hu30-${s}`, nombre: "Encargado de agenda", contrasena: "encargado-123", rol: "encargado", permisos: ["agenda", "cotizaciones"] });
  await ingresar(page, `enc-hu30-${s}`, "encargado-123");
  await expect(page).toHaveURL(/\/panel$/);
  await page.goto(`/panel/cotizaciones/${consultaId}`);
  await page.getByRole("link", { name: "Agendar" }).click();
  await expect(page.getByText(/Total:/)).toHaveCount(0);
  await expect(page.getByRole("checkbox", { name: "Sin adelanto" })).toHaveCount(0);
  await page.getByLabel("Ingresa el").fill(dia);
  await expect(espacio(page)).toBeEnabled();
  await espacio(page).selectOption({ index: 1 });
  await page.getByRole("button", { name: "Agendar" }).click();
  await expect(page).toHaveURL(/\?agendada=1$/);
  await expect(page.getByRole("heading", { name: "Saldo" })).toHaveCount(0);
  await expect(page.getByText("Saldo")).toHaveCount(0);
  const [{ pagos }] = await consultar<{ pagos: number }>("select count(*)::int as pagos from pago p join trabajo t on t.id = p.trabajo_id where t.cotizacion_id = $1", [cotizacionId]);
  expect(pagos).toBe(0);
  // La reserva directa lleva precios: no la arma
  await page.goto("/panel/agenda/nueva");
  await expect(page.getByText(/La reserva directa lleva precios/)).toBeVisible();

  await page.context().clearCookies();
  await crearUsuario({ usuario: `tec-hu30-${s}`, nombre: "Técnico", contrasena: "tecnico-123", rol: "tecnico" });
  await ingresar(page, `tec-hu30-${s}`, "tecnico-123");
  await expect(page).toHaveURL(/\/panel$/);
  await page.goto("/panel/agenda");
  await expect(page).toHaveURL(/\/panel\/sin-acceso$/);
});

test("«Cambiar» vuelve a elegir el cliente sin perder el día y el espacio que llegaron del tablero", async ({ page }, info) => {
  const s = sufijo(info);
  const clienteId = await crearClienteEnBase({ nombre: `Cambia cliente ${s}`, telefono: telefono(info, 9), placa: `CC30${s}9` });
  await ingresarComoDueno(page);
  await page.goto(`/panel/agenda/nueva?fecha=2030-01-02&espacio=1&cliente=${clienteId}`);
  await expect(page.getByRole("link", { name: "Cambiar" })).toHaveAttribute("href", "/panel/agenda/nueva?fecha=2030-01-02&espacio=1");
});

