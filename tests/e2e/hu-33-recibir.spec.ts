import { expect, test, type TestInfo } from "@playwright/test";
import { consultar, crearClienteEnBase, crearUsuario, ingresar, PNG } from "./apoyo";

// HU-33 Recibir vehículo (flujo crítico 3, primera parte). Especificación: docs/08-desarrollo/etapas/C4-taller-entrega.md §9.
// Se recibe desde el día de ingreso: las reservas de hoy van en un espacio propio de cada proyecto (celular: el
// primero; escritorio: el segundo), así no se cruzan. Encargados y técnicos por prueba (límite de ingreso, RNF-04).
test.describe.configure({ mode: "serial" });

const sufijo = (info: TestInfo) => (info.project.name === "celular" ? "c" : "e");
const telefono = (info: TestInfo, n: number) => `5917${info.project.name === "celular" ? 5 : 6}3300${n}0`;
/** Hoy en Bolivia (la base corre en UTC: de noche ya sería mañana). */
const hoy = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/La_Paz" }).format(new Date());

/** Una reserva agendada con un servicio, en el espacio del proyecto, del día indicado (hoy, si no se dice). Devuelve su id. */
async function reserva(info: TestInfo, placa: string, dia = hoy()): Promise<number> {
  const [{ id }] = await consultar<{ id: number }>(
    `insert into trabajo (sucursal_id, cliente_id, vehiculo_id, espacio_id, fecha_inicio, fecha_fin, created_by)
     select e.sucursal_id, v.cliente_id, v.id, e.id, $3::date, $3::date, v.created_by
     from vehiculo v, (select * from espacio_taller where activo order by orden offset $2 limit 1) e where v.placa = $1 returning id`,
    [placa, info.project.name === "celular" ? 0 : 1, dia],
  );
  await consultar(
    `insert into trabajo_linea (trabajo_id, variante_id, descripcion, precio, orden)
     select $1, (select id from variante order by id limit 1), 'Lavado completo', 500, 0`,
    [id],
  );
  return id;
}

const idDeUsuario = async (usuario: string) => (await consultar<{ id: number }>("select id from usuario where nombre_usuario = $1", [usuario]))[0].id;

test("recibir con fotos y observaciones: la reserva pasa a orden, las fotos de ingreso quedan y el técnico la ve sin precios", async ({ page }, info) => {
  const s = sufijo(info);
  const placa = `RC33${s.toUpperCase()}1`;
  const clienteId = await crearClienteEnBase({ nombre: `Recibe ${s}`, telefono: telefono(info, 1), placa });
  const id = await reserva(info, placa);
  // Con "Clientes": desde la ficha se comprueba a dónde lleva la reserva ya recibida
  await crearUsuario({ usuario: `taller-hu33-${s}`, nombre: "Encargado del taller", contrasena: "encargado-123", rol: "encargado", permisos: ["agenda", "ordenes", "pagos", "clientes"] });
  await crearUsuario({ usuario: `tec-hu33-${s}`, nombre: `Técnico Uno ${s}`, contrasena: "tecnico-123", rol: "tecnico" });
  await crearUsuario({ usuario: `tec2-hu33-${s}`, nombre: `Técnico Dos ${s}`, contrasena: "tecnico-123", rol: "tecnico" });
  const tecnicoId = await idDeUsuario(`tec-hu33-${s}`);

  await ingresar(page, `taller-hu33-${s}`, "encargado-123");
  await expect(page).toHaveURL(/\/panel$/);
  await page.goto(`/panel/agenda/${id}`);
  await page.getByRole("link", { name: "Recibir vehículo" }).click();
  await expect(page).toHaveURL(new RegExp(`/panel/ordenes/${id}/recibir$`));
  await expect(page.getByRole("heading", { level: 1, name: `Recibir ${placa}` })).toBeVisible();

  // Una foto de ingreso con la cámara
  await page.getByLabel("Cámara para fotos de ingreso").setInputFiles({ name: "frente.png", mimeType: "image/png", buffer: PNG });
  await expect(page.getByText("Foto guardada.")).toBeVisible();
  // Mientras se recibe, quien la subió la puede quitar
  await page.getByRole("button", { name: "Ver la foto 1 de ingreso" }).click();
  await expect(page.getByRole("dialog").getByRole("button", { name: "Quitar foto" })).toBeVisible();
  await page.keyboard.press("Escape");

  const form = page.getByRole("form", { name: "Recibir vehículo" });
  await form.getByLabel("Observaciones").fill("Rayón en la puerta trasera; deja una silla de bebé.");
  await form.getByLabel("Técnico").selectOption({ label: `Técnico Uno ${s}` });
  await form.getByRole("button", { name: "Recibir vehículo" }).click();
  await expect(page).toHaveURL(new RegExp(`/panel/ordenes/${id}\\?recibido=1$`));
  await expect(page.getByText("Vehículo recibido. La orden está en «Recibidas».")).toBeVisible();
  // Acotado a la orden: Next.js deja oculta la página anterior (el formulario de recibir, con el mismo texto)
  await expect(page.getByRole("region", { name: "Cómo llegó" }).getByText("Rayón en la puerta trasera; deja una silla de bebé.")).toBeVisible();

  const [t] = await consultar<{ estado: string; tecnico: number; recibio: boolean; privado: boolean; etapa: string; avances: number }>(
    `select t.estado, t.tecnico_id as tecnico, t.recibido_por is not null as recibio, a.privado, f.etapa,
       (select count(*)::int from trabajo_avance v where v.trabajo_id = t.id) as avances
     from trabajo t join trabajo_foto f on f.trabajo_id = t.id join archivo a on a.id = f.archivo_id where t.id = $1`,
    [id],
  );
  expect(t).toEqual({ estado: "recibido", tecnico: tecnicoId, recibio: true, privado: true, etapa: "ingreso", avances: 1 });
  const [{ accion }] = await consultar<{ accion: string }>("select accion from auditoria where entidad = 'trabajo' and entidad_id = $1", [id]);
  expect(accion).toBe("recibir");

  // En la ficha del cliente, ya recibida, lleva a la orden (C5 §0)
  await page.goto(`/panel/clientes/${clienteId}`);
  await expect(page.getByRole("list", { name: "Reservas" }).getByRole("link")).toHaveAttribute("href", `/panel/ordenes/${id}`);

  // La reserva ya es una orden: sin acciones de reserva
  await page.goto(`/panel/agenda/${id}`);
  await expect(page.getByText("Esta reserva ya es una orden.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Reprogramar" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Recibir vehículo" })).toHaveCount(0);
  await page.getByRole("link", { name: "Ver la orden" }).click();
  await expect(page).toHaveURL(new RegExp(`/panel/ordenes/${id}$`));
  // Recibido, las fotos de ingreso son la prueba de cómo llegó: ya no se quitan (D-6)
  await page.getByRole("button", { name: "Ver la foto 1 de ingreso" }).click();
  await expect(page.getByRole("dialog").getByRole("img")).toBeVisible();
  await expect(page.getByRole("dialog").getByRole("button", { name: "Quitar foto" })).toHaveCount(0);
  await page.keyboard.press("Escape");

  // El técnico la ve en "Mis órdenes", sin precios ni el teléfono del cliente
  await page.context().clearCookies();
  await ingresar(page, `tec-hu33-${s}`, "tecnico-123");
  await expect(page).toHaveURL(/\/panel$/);
  await page.goto("/panel/ordenes");
  await expect(page.getByRole("heading", { level: 1, name: "Mis órdenes" })).toBeVisible();
  await page.getByRole("link", { name: new RegExp(`^${placa}`) }).click();
  await expect(page.getByRole("heading", { level: 1, name: placa })).toBeVisible();
  await expect(page.getByRole("region", { name: "Servicios" }).getByText("Lavado completo")).toBeVisible();
  await expect(page.getByText(/Bs/)).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Escribir por WhatsApp" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Ver la foto 1 de ingreso" })).toBeVisible();

  // Otro técnico no la ve
  await page.context().clearCookies();
  await ingresar(page, `tec2-hu33-${s}`, "tecnico-123");
  await expect(page).toHaveURL(/\/panel$/);
  await page.goto("/panel/ordenes");
  await expect(page.getByText("No tienes órdenes asignadas.")).toBeVisible();
  await page.goto(`/panel/ordenes/${id}`);
  await expect(page).toHaveURL(/\/panel\/sin-acceso$/);
});

test("antes de su día no se recibe y sin fotos se pide confirmar", async ({ page }, info) => {
  const s = sufijo(info);
  const futura = `RC33${s.toUpperCase()}2`;
  const sinFotos = `RC33${s.toUpperCase()}3`;
  await crearClienteEnBase({ nombre: `Llega después ${s}`, telefono: telefono(info, 2), placa: futura });
  await crearClienteEnBase({ nombre: `Sin fotos ${s}`, telefono: telefono(info, 3), placa: sinFotos });
  const [{ manana }] = await consultar<{ manana: string }>("select to_char($1::date + 30, 'YYYY-MM-DD') as manana", [hoy()]);
  const idFutura = await reserva(info, futura, manana);
  const idSinFotos = await reserva(info, sinFotos, (await consultar<{ ayer: string }>("select to_char($1::date - 1, 'YYYY-MM-DD') as ayer", [hoy()]))[0].ayer);
  await crearUsuario({ usuario: `taller2-hu33-${s}`, nombre: "Encargado del taller", contrasena: "encargado-123", rol: "encargado", permisos: ["agenda", "ordenes"] });
  await ingresar(page, `taller2-hu33-${s}`, "encargado-123");
  await expect(page).toHaveURL(/\/panel$/);

  // Todavía no llega su día: no se ofrece, y por la dirección lo explica
  await page.goto(`/panel/agenda/${idFutura}`);
  await expect(page.getByRole("button", { name: "Reprogramar" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Recibir vehículo" })).toHaveCount(0);
  await page.goto(`/panel/ordenes/${idFutura}/recibir`);
  await expect(page.getByText(/todavía no llega a su día de ingreso/)).toBeVisible();

  // El cliente llegó un día tarde y sin fotos: se pide confirmar
  await page.goto(`/panel/ordenes/${idSinFotos}/recibir`);
  const form = page.getByRole("form", { name: "Recibir vehículo" });
  await form.getByRole("button", { name: "Recibir vehículo" }).click();
  await expect(form.getByText(/Sin fotos de ingreso no hay cómo probar/)).toBeVisible();
  await form.getByRole("button", { name: "Recibir sin fotos" }).click();
  await expect(page).toHaveURL(new RegExp(`/panel/ordenes/${idSinFotos}\\?recibido=1$`));
  await expect(page.getByText("Se recibió sin fotos de ingreso.")).toBeVisible();
  // Recibida, la recepción ya no se abre: lleva a la orden
  await page.goto(`/panel/ordenes/${idSinFotos}/recibir`);
  await expect(page).toHaveURL(new RegExp(`/panel/ordenes/${idSinFotos}$`));
});

test("si la reserva se cancela, las fotos de ingreso que se alcanzaron a tomar se descartan", async ({ page }, info) => {
  const s = sufijo(info);
  const placa = `RC33${s.toUpperCase()}4`;
  await crearClienteEnBase({ nombre: `No vino ${s}`, telefono: telefono(info, 4), placa });
  const [{ antes }] = await consultar<{ antes: string }>("select to_char($1::date - 2, 'YYYY-MM-DD') as antes", [hoy()]);
  const id = await reserva(info, placa, antes);
  await crearUsuario({ usuario: `taller3-hu33-${s}`, nombre: "Encargado del taller", contrasena: "encargado-123", rol: "encargado", permisos: ["agenda", "ordenes"] });
  await ingresar(page, `taller3-hu33-${s}`, "encargado-123");
  await expect(page).toHaveURL(/\/panel$/);

  await page.goto(`/panel/ordenes/${id}/recibir`);
  // La subida necesita JavaScript: el botón se habilita al hidratar
  await expect(page.getByRole("button", { name: "Tomar foto" })).toBeEnabled();
  await page.getByLabel("Cámara para fotos de ingreso").setInputFiles({ name: "frente.png", mimeType: "image/png", buffer: PNG });
  await expect(page.getByText("Foto guardada.")).toBeVisible();
  const [{ archivo }] = await consultar<{ archivo: number }>("select archivo_id as archivo from trabajo_foto where trabajo_id = $1", [id]);

  // Al final no lo dejó: se cancela la reserva
  await page.goto(`/panel/agenda/${id}`);
  await page.getByRole("button", { name: "Cancelar reserva" }).click();
  const form = page.getByRole("form", { name: "Cancelar reserva" });
  await form.getByLabel("Motivo").fill("No trajo el vehículo");
  await form.getByRole("button", { name: "Cancelar reserva" }).click();
  await expect(page.getByText(/^Reserva cancelada/)).toBeVisible();
  const [quedan] = await consultar<{ fotos: number; archivos: number }>(
    "select (select count(*)::int from trabajo_foto where trabajo_id = $1) as fotos, (select count(*)::int from archivo where id = $2) as archivos",
    [id, archivo],
  );
  expect(quedan).toEqual({ fotos: 0, archivos: 0 });
});
