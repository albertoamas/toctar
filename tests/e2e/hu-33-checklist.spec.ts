import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { consultar, crearClienteEnBase, crearUsuario, ingresar, ingresarComoDueno, PNG, revisarChecklistEnBase } from "./apoyo";

// Checklist de recepción (pedido 12). Especificación: docs/08-desarrollo/etapas/P12-checklist-recepcion.md §8.
// La reserva de hoy va en un espacio propio de cada proyecto, desactivado: así no se cruza con las de otras pruebas.
// Las partes son las de la lista base: ninguna prueba agrega partes (la lista es de todos y las pruebas corren a la vez).
// En serie: el dueño entra con el mismo usuario en las dos (límite de intentos de ingreso, RNF-04).
test.describe.configure({ mode: "serial" });

const sufijo = (info: TestInfo) => (info.project.name === "celular" ? "c" : "e");
const telefono = (info: TestInfo, n: number) => `5917${info.project.name === "celular" ? 5 : 6}3310${n}0`;
const hoy = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/La_Paz" }).format(new Date());

/** Una reserva de hoy con un servicio, en un espacio propio y desactivado. Devuelve su id. */
async function reservaDeHoy(info: TestInfo, placa: string, n: number): Promise<number> {
  const [{ espacio }] = await consultar<{ espacio: number }>(
    `insert into espacio_taller (sucursal_id, nombre, orden, activo) select sucursal_id, $1, 92, false from espacio_taller limit 1 returning id as espacio`,
    [`Espacio checklist ${sufijo(info)}${n}`],
  );
  const [{ id }] = await consultar<{ id: number }>(
    `insert into trabajo (sucursal_id, cliente_id, vehiculo_id, espacio_id, fecha_inicio, fecha_fin, created_by)
     select e.sucursal_id, v.cliente_id, v.id, e.id, $3::date, $3::date, v.created_by from vehiculo v, espacio_taller e
     where v.placa = $1 and e.id = $2 returning id`,
    [placa, espacio, hoy()],
  );
  await consultar(
    `insert into trabajo_linea (trabajo_id, variante_id, descripcion, precio, orden) select $1, (select id from variante order by id limit 1), 'Lavado completo', 500, 0`,
    [id],
  );
  return id;
}

const fila = (page: Page, parte: string) => page.getByRole("list", { name: "Partes del checklist" }).getByRole("listitem").filter({ hasText: parte });

test("se revisa parte por parte: bien o con un detalle y su foto; sin revisar todo no se recibe; la orden y el técnico lo ven", async ({ page }, info) => {
  const s = sufijo(info);
  const placa = `CK33${s.toUpperCase()}1`;
  await crearClienteEnBase({ nombre: `Checklist ${s}`, telefono: telefono(info, 1), placa });
  const id = await reservaDeHoy(info, placa, 1);
  await crearUsuario({ usuario: `tec-ck33-${s}`, nombre: `Técnico Checklist ${s}`, contrasena: "tecnico-123", rol: "tecnico" });
  const [{ total }] = await consultar<{ total: number }>("select count(*)::int as total from parte_revision where activo");

  // La lista se arma en Configuración → Taller
  await ingresarComoDueno(page);
  await page.goto("/panel/configuracion/taller");
  await expect(page.getByRole("region", { name: "Partes del checklist" })).toContainText("Capó");

  // Al recibir, cada parte empieza sin revisar
  await page.goto(`/panel/ordenes/${id}/recibir`, { waitUntil: "networkidle" });
  await expect(page.getByText(`Revisadas 0 de ${total}`)).toBeVisible();
  await expect(fila(page, "Capó")).toContainText("Sin revisar");

  // Un detalle con su foto
  await page.getByRole("button", { name: "Detalle: Capó" }).click();
  const modal = page.getByRole("dialog", { name: "Capó" });
  await modal.getByRole("button", { name: "Guardar detalle" }).click();
  await expect(modal.getByText("Elige qué tiene.")).toBeVisible();
  await modal.getByRole("radio", { name: "Rayón" }).check();
  await modal.getByLabel("Nota").fill("Rayón largo al centro");
  await modal.getByLabel("Cámara para la foto del detalle").setInputFiles({ name: "capo.png", mimeType: "image/png", buffer: PNG });
  await expect(modal.getByRole("img", { name: "Foto del detalle" })).toBeVisible();
  await modal.getByRole("button", { name: "Guardar detalle" }).click();
  await expect(page.getByText("Detalle guardado.")).toBeVisible();
  await expect(modal).toBeHidden();
  await expect(fila(page, "Capó")).toContainText("Rayón largo al centro");
  await expect(fila(page, "Capó").getByRole("link", { name: "Ver la foto: Capó" })).toBeVisible();

  // "Otro" pide la nota; después se cambia a "Está bien"
  await page.getByRole("button", { name: "Detalle: Techo" }).click();
  const techo = page.getByRole("dialog", { name: "Techo" });
  await techo.getByRole("radio", { name: "Otro" }).check();
  await techo.getByRole("button", { name: "Guardar detalle" }).click();
  await expect(techo.getByText("Con «Otro», cuenta qué es.")).toBeVisible();
  await techo.getByLabel("Nota").fill("Falta la antena");
  await techo.getByRole("button", { name: "Guardar detalle" }).click();
  await expect(page.getByText("Detalle guardado.")).toBeVisible();
  await page.getByRole("button", { name: "Cambiar: Techo" }).click();
  await page.getByRole("dialog", { name: "Techo" }).getByRole("button", { name: "Está bien" }).click();
  await expect(fila(page, "Techo")).toContainText("Bien");
  await expect(page.getByText(`Revisadas 2 de ${total}`)).toBeVisible();

  // Sin revisar todo, no se recibe: dice qué falta
  const form = page.getByRole("form", { name: "Recibir vehículo" });
  await form.getByLabel("Técnico").selectOption({ label: `Técnico Checklist ${s}` });
  await form.getByRole("button", { name: "Recibir vehículo" }).click();
  await expect(form.getByText(`Faltan revisar ${total - 2} partes del checklist: Maletero,`)).toBeVisible();

  // Una por una, "Bien"
  const bien = page.getByRole("button", { name: /^Bien: / });
  for (let quedan = total - 2; quedan > 0; quedan--) {
    await bien.first().click();
    await expect(bien).toHaveCount(quedan - 1);
  }
  await expect(page.getByText(`Revisadas ${total} de ${total}`)).toBeVisible();

  // Revisado todo, se recibe
  await form.getByRole("button", { name: "Recibir vehículo" }).click();
  await expect(page).toHaveURL(new RegExp(`/panel/ordenes/${id}\\?recibido=1$`));
  const comoLlego = page.getByRole("region", { name: "Cómo llegó" });
  await expect(comoLlego.getByRole("list", { name: "Detalles de ingreso" }).getByRole("listitem")).toHaveCount(1);
  await expect(comoLlego).toContainText("Rayón largo al centro");
  await expect(comoLlego).toContainText("El resto, bien.");

  const filas = await consultar<{ estado: string; n: number; fotos: number }>(
    "select estado, count(*)::int as n, count(archivo_id)::int as fotos from trabajo_revision where trabajo_id = $1 group by estado order by estado",
    [id],
  );
  expect(filas).toEqual([
    { estado: "bien", n: total - 1, fotos: 0 },
    { estado: "detalle", n: 1, fotos: 1 },
  ]);
  const [{ detalles }] = await consultar<{ detalles: number }>(
    "select (datos->>'detalles')::int as detalles from auditoria where entidad = 'trabajo' and entidad_id = $1 and accion = 'recibir'",
    [id],
  );
  expect(detalles).toBe(1);

  // El técnico ve cómo llegó en su orden
  await page.context().clearCookies();
  await ingresar(page, `tec-ck33-${s}`, "tecnico-123");
  await expect(page).toHaveURL(/\/panel$/);
  await page.goto(`/panel/ordenes/${id}`);
  await expect(page.getByRole("region", { name: "Cómo llegó" })).toContainText("Rayón largo al centro");
});

test("todas bien se recibe al primer toque; después de recibir el checklist no cambia", async ({ page }, info) => {
  const s = sufijo(info);
  const placa = `CK33${s.toUpperCase()}2`;
  await crearClienteEnBase({ nombre: `Checklist sin fotos ${s}`, telefono: telefono(info, 2), placa });
  const id = await reservaDeHoy(info, placa, 2);
  await ingresarComoDueno(page);
  await page.goto(`/panel/ordenes/${id}/recibir`, { waitUntil: "networkidle" });

  await revisarChecklistEnBase(id);
  const form = page.getByRole("form", { name: "Recibir vehículo" });
  await form.getByRole("button", { name: "Recibir vehículo" }).click();
  await expect(page).toHaveURL(new RegExp(`/panel/ordenes/${id}\\?recibido=1$`));
  await expect(page.getByRole("region", { name: "Cómo llegó" })).toContainText("Revisada parte por parte: todas bien.");

  // Ya recibida, la recepción lleva a la orden
  await page.goto(`/panel/ordenes/${id}/recibir`);
  await expect(page).toHaveURL(new RegExp(`/panel/ordenes/${id}$`));
});
