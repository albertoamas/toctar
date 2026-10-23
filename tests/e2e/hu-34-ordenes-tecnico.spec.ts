import { expect, test, type TestInfo } from "@playwright/test";
import pg from "pg";
import { crearClienteEnBase, crearUsuario, ingresar, PNG, URL_BASE_E2E } from "./apoyo";

// HU-34 Órdenes del técnico (flujo crítico 3). Especificación: docs/08-desarrollo/etapas/C4-taller-entrega.md §9.
// Las órdenes van directo a la base. Para no chocar con las reservas de otras pruebas: la del técnico, en un espacio
// propio y desactivado (ninguna otra prueba lo usa); la de extender, en días propios lejos de hoy (600 o 700).
test.describe.configure({ mode: "serial" });

const sufijo = (info: TestInfo) => (info.project.name === "celular" ? "c" : "e");
const telefono = (info: TestInfo, n: number) => `5917${info.project.name === "celular" ? 5 : 6}3400${n}0`;
const hoy = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/La_Paz" }).format(new Date());

async function consultar<T extends pg.QueryResultRow>(sql: string, valores: unknown[] = []): Promise<T[]> {
  const base = new pg.Client({ connectionString: URL_BASE_E2E });
  await base.connect();
  try {
    return (await base.query<T>(sql, valores)).rows;
  } finally {
    await base.end();
  }
}

const dia = async (desplazamiento: number) => (await consultar<{ d: string }>("select to_char($1::date + $2::int, 'YYYY-MM-DD') as d", [hoy(), desplazamiento]))[0].d;
const idDeUsuario = async (usuario: string) => (await consultar<{ id: number }>("select id from usuario where nombre_usuario = $1", [usuario]))[0].id;

/** Una orden ya recibida, con un servicio, en el espacio y los días indicados. Devuelve su id. */
async function orden(placa: string, espacioId: number, desde: string, hasta: string, tecnicoId: number | null): Promise<number> {
  const [{ id }] = await consultar<{ id: number }>(
    `insert into trabajo (sucursal_id, cliente_id, vehiculo_id, espacio_id, fecha_inicio, fecha_fin, tecnico_id, estado, recibido_at, created_by)
     select e.sucursal_id, v.cliente_id, v.id, e.id, $3::date, $4::date, $5, 'recibido', now(), v.created_by
     from vehiculo v, espacio_taller e where v.placa = $1 and e.id = $2 returning id`,
    [placa, espacioId, desde, hasta, tecnicoId],
  );
  await consultar("insert into trabajo_linea (trabajo_id, variante_id, descripcion, precio, orden) select $1, (select id from variante order by id limit 1), 'Lavado completo', 500, 0", [id]);
  return id;
}

test("el técnico trabaja su orden: empieza, sube fotos, escribe avances y la marca lista; el espacio se libera", async ({ page }, info) => {
  const s = sufijo(info);
  const placa = `OT34${s.toUpperCase()}1`;
  await crearClienteEnBase({ nombre: `Trabajo ${s}`, telefono: telefono(info, 1), placa });
  await crearUsuario({ usuario: `tec-hu34-${s}`, nombre: `Técnico Taller ${s}`, contrasena: "tecnico-123", rol: "tecnico" });
  const tecnicoId = await idDeUsuario(`tec-hu34-${s}`);
  const [{ espacio }] = await consultar<{ espacio: number }>(
    `insert into espacio_taller (sucursal_id, nombre, orden, activo) select sucursal_id, $1, 90, false from espacio_taller limit 1
     on conflict do nothing returning id as espacio`,
    [`Espacio HU-34 ${s}`],
  );
  // Entró hace tres días y la entrega aproximada era dentro de tres
  const id = await orden(placa, espacio, await dia(-3), await dia(3), tecnicoId);

  await ingresar(page, `tec-hu34-${s}`, "tecnico-123");
  await expect(page).toHaveURL(/\/panel$/);
  await page.goto("/panel/ordenes");
  await page.getByRole("link", { name: new RegExp(`^${placa}`) }).click();
  await expect(page.getByRole("heading", { level: 1, name: placa })).toBeVisible();
  const pasos = page.getByRole("region", { name: "Estado de la orden" });
  await expect(pasos.locator('[aria-current="step"]')).toHaveText("Recibida");

  await pasos.getByRole("button", { name: "Empezar trabajo" }).click();
  await expect(page.getByText("La orden está en proceso.")).toBeVisible();
  await expect(pasos.locator('[aria-current="step"]')).toHaveText("En proceso");

  // Una foto de antes y un avance
  await expect(page.getByRole("button", { name: "Tomar foto" }).first()).toBeEnabled();
  await page.getByLabel("Cámara para fotos de antes").setInputFiles({ name: "antes.png", mimeType: "image/png", buffer: PNG });
  await expect(page.getByRole("button", { name: "Ver la foto 1 de antes" })).toBeVisible();
  await page.getByLabel("Escribir un avance").fill("Pulido de la puerta trasera, listo el primer paso.");
  await page.getByRole("button", { name: "Guardar avance" }).click();
  const historia = page.getByRole("list", { name: "Historia de la orden" });
  await expect(historia.getByText("Pulido de la puerta trasera, listo el primer paso.")).toBeVisible();
  await expect(page.getByLabel("Escribir un avance")).toHaveValue("");

  await pasos.getByRole("button", { name: "Marcar listo" }).click();
  await expect(page.getByText("La orden está lista. Avisa al cliente.")).toBeVisible();
  await expect(historia.getByText("Pasó a lista.")).toBeVisible();
  await expect(pasos.getByRole("button", { name: "Volver a en proceso" })).toBeVisible();

  // Terminó antes: la entrega pasa a hoy y el espacio queda libre desde mañana
  const [t] = await consultar<{ estado: string; fin: string; listo: boolean; avances: number; fotos: number }>(
    `select estado, to_char(fecha_fin, 'YYYY-MM-DD') as fin, listo_at is not null as listo,
       (select count(*)::int from trabajo_avance where trabajo_id = t.id) as avances,
       (select count(*)::int from trabajo_foto where trabajo_id = t.id and etapa = 'antes') as fotos
     from trabajo t where id = $1`,
    [id],
  );
  expect(t).toEqual({ estado: "listo", fin: hoy(), listo: true, avances: 3, fotos: 1 });
  const auditoria = await consultar<{ accion: string }>("select accion from auditoria where entidad = 'trabajo' and entidad_id = $1 order by id", [id]);
  expect(auditoria.map((a) => a.accion)).toEqual(["estado", "estado"]);
  // El técnico no extiende la entrega
  await expect(page.getByRole("button", { name: "Extender entrega" })).toHaveCount(0);

  // La marcó lista por error: al volver, recupera su entrega y deja de figurar como avisada
  await consultar("update trabajo set avisado_listo_at = now(), avisado_listo_por = $2 where id = $1", [id, tecnicoId]);
  await pasos.getByRole("button", { name: "Volver a en proceso" }).click();
  // El aviso de antes puede seguir a la vista: se espera el paso, que sí cambia
  await expect(pasos.locator('[aria-current="step"]')).toHaveText("En proceso");
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
  const id = await orden(placa, espacios[0].id, d0, d1, null);
  // En el mismo espacio, otra reserva desde el día 3
  await consultar(
    `insert into trabajo (sucursal_id, cliente_id, vehiculo_id, espacio_id, fecha_inicio, fecha_fin, created_by)
     select e.sucursal_id, v.cliente_id, v.id, e.id, $3::date, $3::date, v.created_by from vehiculo v, espacio_taller e where v.placa = $1 and e.id = $2`,
    [otra, espacios[0].id, d3],
  );
  await crearUsuario({ usuario: `taller-hu34-${s}`, nombre: "Encargado del taller", contrasena: "encargado-123", rol: "encargado", permisos: ["agenda", "ordenes"] });
  await ingresar(page, `taller-hu34-${s}`, "encargado-123");
  await expect(page).toHaveURL(/\/panel$/);

  await page.goto(`/panel/ordenes/${id}`);
  await page.getByRole("button", { name: "Extender entrega" }).click();
  const form = page.getByRole("form", { name: "Extender entrega" });
  await form.getByLabel("Nueva entrega").fill(d3);
  await expect(form.getByText(`${espacios[0].nombre} está ocupado en esas fechas: muévela a un espacio libre.`)).toBeVisible();
  await expect(form.getByLabel("Espacio", { exact: true }).locator("option")).toHaveText(["Elige el espacio", ...espacios.slice(1).map((e) => e.nombre)]);
  await form.getByLabel("Espacio", { exact: true }).selectOption({ label: espacios[1].nombre });
  await form.getByRole("button", { name: "Extender entrega" }).click();
  await expect(page.getByText(new RegExp(`^Entrega movida al .* en ${espacios[1].nombre}\\.$`))).toBeVisible();
  const [t] = await consultar<{ fin: string; espacio: number }>("select to_char(fecha_fin, 'YYYY-MM-DD') as fin, espacio_id as espacio from trabajo where id = $1", [id]);
  expect(t).toEqual({ fin: d3, espacio: espacios[1].id });
  await expect(page.getByRole("list", { name: "Historia de la orden" }).getByText(/^Entrega extendida al/)).toBeVisible();

  // La lista del encargado: pestañas por estado con su conteo
  await page.goto("/panel/ordenes?estado=recibido");
  await expect(page.getByRole("link", { name: /^Recibidas \(\d+\)$/ })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("link", { name: new RegExp(`^${placa}`) })).toBeVisible();
  await page.getByRole("link", { name: /^Listas \(\d+\)$/ }).click();
  await expect(page.getByRole("link", { name: new RegExp(`^${placa}`) })).toHaveCount(0);
});
