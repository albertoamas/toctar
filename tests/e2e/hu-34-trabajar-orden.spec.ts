import { expect, test, type TestInfo } from "@playwright/test";
import { archivosArrastrados, consultar, crearClienteEnBase, crearUsuario, ingresar, PERFIL_TALLER, PNG } from "./apoyo";

// HU-34 Trabajar una orden (flujo crítico 3). Especificación: docs/08-desarrollo/etapas/C4-taller-entrega.md §9 y,
// desde el pedido 32 (sin técnico asignado), P32-roles-sin-tecnico.md. Las órdenes van directo a la base. Para no chocar
// con las reservas de otras pruebas: la que se trabaja, en un espacio
// propio y desactivado (ninguna otra prueba lo usa); la de extender, en días propios lejos de hoy (600 o 700).
test.describe.configure({ mode: "serial" });

const sufijo = (info: TestInfo) => (info.project.name === "celular" ? "c" : "e");
const telefono = (info: TestInfo, n: number) => `5917${info.project.name === "celular" ? 5 : 6}3400${n}0`;
const hoy = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/La_Paz" }).format(new Date());

const dia = async (desplazamiento: number) => (await consultar<{ d: string }>("select to_char($1::date + $2::int, 'YYYY-MM-DD') as d", [hoy(), desplazamiento]))[0].d;
const idDeUsuario = async (usuario: string) => (await consultar<{ id: number }>("select id from usuario where nombre_usuario = $1", [usuario]))[0].id;

/** Una orden ya recibida, con un servicio, en el espacio y los días indicados. Devuelve su id. */
async function orden(placa: string, espacioId: number, desde: string, hasta: string): Promise<number> {
  const [{ id }] = await consultar<{ id: number }>(
    `insert into trabajo (sucursal_id, cliente_id, vehiculo_id, espacio_id, fecha_inicio, fecha_fin, estado, recibido_at, created_by)
     select e.sucursal_id, v.cliente_id, v.id, e.id, $3::date, $4::date, 'recibido', now(), v.created_by
     from vehiculo v, espacio_taller e where v.placa = $1 and e.id = $2 returning id`,
    [placa, espacioId, desde, hasta],
  );
  await consultar("insert into trabajo_linea (trabajo_id, variante_id, descripcion, precio, orden) select $1, (select id from variante order by id limit 1), 'Lavado completo', 500, 0", [id]);
  return id;
}

test("el perfil Taller trabaja cualquier orden, sin asignarla y sin ver precios: empieza, sube fotos, el historial se escribe solo y la marca lista", async ({ page }, info) => {
  const s = sufijo(info);
  const placa = `OT34${s.toUpperCase()}1`;
  await crearClienteEnBase({ nombre: `Trabajo ${s}`, telefono: telefono(info, 1), placa });
  await crearUsuario({ usuario: `taller-tr34-${s}`, nombre: `Chico del taller ${s}`, contrasena: "taller-123", rol: "encargado", permisos: PERFIL_TALLER });
  const quienTrabaja = await idDeUsuario(`taller-tr34-${s}`);
  const [{ espacio }] = await consultar<{ espacio: number }>(
    `insert into espacio_taller (sucursal_id, nombre, orden, activo) select sucursal_id, $1, 90, false from espacio_taller limit 1
     on conflict do nothing returning id as espacio`,
    [`Espacio HU-34 ${s}`],
  );
  // Entró hace tres días y la entrega aproximada era dentro de tres
  const id = await orden(placa, espacio, await dia(-3), await dia(3));

  await ingresar(page, `taller-tr34-${s}`, "taller-123");
  await expect(page).toHaveURL(/\/panel$/);
  await page.goto("/panel/ordenes");
  await page.getByRole("link", { name: new RegExp(`^${placa}`) }).click();
  await expect(page.getByRole("heading", { level: 1, name: placa })).toBeVisible();
  const pasos = page.getByRole("form", { name: "Estado de la orden" });
  // Los pasos del trabajo (pedido 31): recibida y en proceso son "En el taller"; la insignia dice cuál
  const pasoActual = page.getByRole("navigation", { name: "Pasos del trabajo" }).locator('[aria-current="step"]');
  await expect(pasoActual).toHaveText("En el taller");
  await expect(page.getByRole("main").getByText("Recibida", { exact: true }).first()).toBeVisible();
  // Sin Pagos: los servicios sin precio (RN-12); y nada dice a quién está asignada (pedido 32)
  await expect(page.getByRole("main")).not.toContainText(" Bs");
  await expect(page.getByLabel("Datos de la orden")).not.toContainText("Técnico");
  // Sin Clientes, el cliente se ve pero no lleva a su ficha; con Agenda, "Ver la reserva" sí (pulido 13.49)
  await expect(page.getByRole("link", { name: /^Ver ficha del cliente/ })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Ver la reserva" })).toHaveAttribute("href", new RegExp(`^/panel/agenda/${id}\\?volver=`));

  await pasos.getByRole("button", { name: "Empezar trabajo" }).click();
  await expect(page.getByText("La orden está en proceso.")).toBeVisible();
  await expect(pasoActual).toHaveText("En el taller");
  await expect(page.getByRole("main").getByText("En proceso", { exact: true }).first()).toBeVisible();

  // Fotos del inicio
  await expect(page.getByRole("button", { name: "Tomar foto" }).first()).toBeEnabled();
  await page.getByLabel("Cámara para fotos del inicio").setInputFiles({ name: "antes.png", mimeType: "image/png", buffer: PNG });
  await expect(page.getByRole("button", { name: "Ver la foto 1 del inicio" })).toBeVisible();
  // En la computadora también se suelta encima (pulido 13.13)
  const fotosInicio = page.locator("[data-zona-foto]").filter({ has: page.getByLabel("Cámara para fotos del inicio") });
  const soltada = await archivosArrastrados(page, [{ name: "soltada.png", mimeType: "image/png", buffer: PNG }]);
  await fotosInicio.dispatchEvent("dragenter", { dataTransfer: soltada });
  await expect(fotosInicio.getByText("Suelta las fotos aquí")).toBeVisible();
  await fotosInicio.dispatchEvent("drop", { dataTransfer: soltada });
  await expect(page.getByRole("button", { name: "Ver la foto 2 del inicio" })).toBeVisible();
  await expect(fotosInicio.getByText("Suelta las fotos aquí")).toHaveCount(0);
  // En grande se pasa a la de al lado sin cerrar (pulido 13.16)
  await page.getByRole("button", { name: "Ver la foto 1 del inicio" }).click();
  await page.getByRole("dialog", { name: "Inicio: foto 1 de 2" }).getByRole("button", { name: "Foto siguiente" }).click();
  await expect(page.getByRole("dialog", { name: "Inicio: foto 2 de 2" }).getByRole("img", { name: "Foto 2 del inicio" })).toBeVisible();
  await page.keyboard.press("Escape");
  // El historial lo escribe el sistema; ya no se escriben notas a mano (pedido 45)
  const historia = page.getByRole("list", { name: "Historial de la orden" });
  await expect(historia.getByText("Pasó a en proceso.")).toBeVisible();
  await expect(page.getByRole("region", { name: "Historial" }).getByRole("textbox")).toHaveCount(0);

  await pasos.getByRole("button", { name: "Marcar listo" }).click();
  await expect(page.getByText("La orden está lista. Avisa al cliente.")).toBeVisible();
  await expect(historia.getByText("Pasó a lista.")).toBeVisible();
  // Volver un paso atrás está en "Más" (pulido 11.2); extender la entrega se prueba abajo (una lista ya no se extiende)
  await page.getByRole("button", { name: "Más" }).click();
  await expect(page.getByRole("menuitem", { name: "Volver a en proceso" })).toBeVisible();
  await page.keyboard.press("Escape");

  // Terminó antes: la entrega pasa a hoy y el espacio queda libre desde mañana
  const [t] = await consultar<{ estado: string; fin: string; listo: boolean; avances: number; fotos: number }>(
    `select estado, to_char(fecha_fin, 'YYYY-MM-DD') as fin, listo_at is not null as listo,
       (select count(*)::int from trabajo_avance where trabajo_id = t.id) as avances,
       (select count(*)::int from trabajo_foto where trabajo_id = t.id and etapa = 'antes') as fotos
     from trabajo t where id = $1`,
    [id],
  );
  expect(t).toEqual({ estado: "listo", fin: hoy(), listo: true, avances: 2, fotos: 2 });
  const auditoria = await consultar<{ accion: string }>("select accion from auditoria where entidad = 'trabajo' and entidad_id = $1 order by id", [id]);
  expect(auditoria.map((a) => a.accion)).toEqual(["estado", "estado"]);

  // La marcó lista por error: al volver, recupera su entrega y deja de figurar como avisada
  await consultar("update trabajo set avisado_listo_at = now(), avisado_listo_por = $2 where id = $1", [id, quienTrabaja]);
  await page.reload();
  await page.getByRole("button", { name: "Más" }).click();
  await page.getByRole("menuitem", { name: "Volver a en proceso" }).click();
  const volver = page.getByRole("dialog", { name: "Volver a en proceso" });
  await expect(volver.getByText(/El aviso al cliente se borra/)).toBeVisible();
  await volver.getByRole("button", { name: "Sí, volver a en proceso" }).click();
  await expect(volver).toHaveCount(0);
  // El aviso de antes puede seguir a la vista: se espera el paso, que sí cambia
  await expect(pasoActual).toHaveText("En el taller");
  await expect(page.getByRole("main").getByText("En proceso", { exact: true }).first()).toBeVisible();
  const [vuelta] = await consultar<{ fin: string; avisada: boolean }>("select to_char(fecha_fin, 'YYYY-MM-DD') as fin, avisado_listo_at is not null as avisada from trabajo where id = $1", [id]);
  expect(vuelta).toEqual({ fin: await dia(3), avisada: false });
});

test("extender la entrega: con el espacio ocupado se elige otro libre; las listas del dueño por estado", async ({ page }, info) => {
  const s = sufijo(info);
  const placa = `OT34${s.toUpperCase()}2`;
  const otra = `OT34${s.toUpperCase()}3`;
  await crearClienteEnBase({ nombre: `Se atrasa ${s}`, telefono: telefono(info, 2), placa });
  await crearClienteEnBase({ nombre: `Viene después ${s}`, telefono: telefono(info, 3), placa: otra });
  const espacios = await consultar<{ id: number; nombre: string }>("select id, nombre from espacio_taller where activo order by orden");
  const base = info.project.name === "celular" ? 600 : 700;
  const [d0, d1, d3] = [await dia(base), await dia(base + 1), await dia(base + 3)];
  const id = await orden(placa, espacios[0].id, d0, d1);
  // En el mismo espacio, otra reserva desde el día 3
  await consultar(
    `insert into trabajo (sucursal_id, cliente_id, vehiculo_id, espacio_id, fecha_inicio, fecha_fin, created_by)
     select e.sucursal_id, v.cliente_id, v.id, e.id, $3::date, $3::date, v.created_by from vehiculo v, espacio_taller e where v.placa = $1 and e.id = $2`,
    [otra, espacios[0].id, d3],
  );
  await crearUsuario({ usuario: `taller-hu34-${s}`, nombre: "Encargado del taller", contrasena: "encargado-123", rol: "encargado", permisos: PERFIL_TALLER });
  await ingresar(page, `taller-hu34-${s}`, "encargado-123");
  await expect(page).toHaveURL(/\/panel$/);

  await page.goto(`/panel/ordenes/${id}`);
  await page.getByRole("button", { name: "Más" }).click();
  await page.getByRole("menuitem", { name: "Extender entrega" }).click();
  const form = page.getByRole("form", { name: "Extender entrega" });
  await form.getByLabel("Nueva entrega").fill(d3);
  await expect(form.getByText(`${espacios[0].nombre} está ocupado en esas fechas: muévela a un espacio libre.`)).toBeVisible();
  await expect(form.getByLabel("Espacio", { exact: true }).locator("option")).toHaveText(["Elige el espacio", ...espacios.slice(1).map((e) => e.nombre)]);
  await form.getByLabel("Espacio", { exact: true }).selectOption({ label: espacios[1].nombre });
  await form.getByRole("button", { name: "Extender entrega" }).click();
  await expect(page.getByText(new RegExp(`^Entrega movida al .* en ${espacios[1].nombre}\\.$`))).toBeVisible();
  const [t] = await consultar<{ fin: string; espacio: number }>("select to_char(fecha_fin, 'YYYY-MM-DD') as fin, espacio_id as espacio from trabajo where id = $1", [id]);
  expect(t).toEqual({ fin: d3, espacio: espacios[1].id });
  await expect(page.getByRole("list", { name: "Historial de la orden" }).getByText(/^Entrega extendida al/)).toBeVisible();

  // La lista del encargado: una tabla con filtros por estado y su conteo (pedido 26)
  await page.goto("/panel/ordenes");
  const filtros = page.getByRole("navigation", { name: "Filtrar por estado" });
  const enTaller = page.getByRole("list", { name: "Órdenes en el taller" });
  await expect(enTaller.getByRole("link", { name: new RegExp(`^${placa}.*Recibida`) })).toBeVisible();
  await filtros.getByRole("link", { name: /^Recibidas \d+$/ }).click();
  await expect(filtros.getByRole("link", { name: /^Recibidas/ })).toHaveAttribute("aria-current", "page");
  await expect(enTaller.getByRole("link", { name: new RegExp(`^${placa}`) })).toBeVisible();
  await filtros.getByRole("link", { name: /^Listas \d+$/ }).click();
  await expect(filtros.getByRole("link", { name: /^Listas/ })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("link", { name: new RegExp(`^${placa}`) })).toHaveCount(0);
});
