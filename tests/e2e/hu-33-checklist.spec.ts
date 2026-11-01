import { expect, test, type TestInfo } from "@playwright/test";
import { consultar, crearClienteEnBase, crearUsuario, ingresar, ingresarComoDueno, PNG } from "./apoyo";

// Checklist de recepción (pedido 12). Especificación: docs/08-desarrollo/etapas/P12-checklist-recepcion.md §8.
// La reserva de hoy va en un espacio propio de cada proyecto, desactivado: así no se cruza con las de otras pruebas.
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

test("el dueño suma una parte; al recibir se marcan detalles con foto, se cambian y se quitan; la orden y el técnico los ven", async ({ page }, info) => {
  const s = sufijo(info);
  const placa = `CK33${s.toUpperCase()}1`;
  await crearClienteEnBase({ nombre: `Checklist ${s}`, telefono: telefono(info, 1), placa });
  const id = await reservaDeHoy(info, placa, 1);
  await crearUsuario({ usuario: `tec-ck33-${s}`, nombre: `Técnico Checklist ${s}`, contrasena: "tecnico-123", rol: "tecnico" });
  const antena = `Antena ${s}`;

  // 1. En Configuración → Taller, una parte nueva para el checklist
  await ingresarComoDueno(page);
  await page.goto("/panel/configuracion/taller", { waitUntil: "networkidle" });
  const partes = page.getByRole("region", { name: "Partes del checklist" });
  await expect(partes).toContainText("Capó");
  await partes.getByRole("button", { name: "Agregar parte" }).click();
  await partes.getByLabel("Nombre de la parte").fill(antena);
  await partes.getByRole("button", { name: "Agregar", exact: true }).click();
  await expect(page.getByText(`${antena} agregada.`)).toBeVisible();

  // 2. Al recibir, cada parte en "Bien"; se marcan solo los detalles
  await page.goto(`/panel/ordenes/${id}/recibir`, { waitUntil: "networkidle" });
  const checklist = page.getByRole("list", { name: "Partes del checklist" });
  await expect(checklist.getByRole("listitem").filter({ hasText: "Capó" })).toContainText("Bien");
  await expect(checklist.getByRole("listitem").filter({ hasText: antena })).toBeVisible();

  await page.getByRole("button", { name: "Marcar detalle: Capó" }).click();
  const modal = page.getByRole("dialog", { name: "Detalle: Capó" });
  await modal.getByRole("button", { name: "Guardar detalle" }).click();
  await expect(modal.getByText("Elige qué tiene.")).toBeVisible();
  await modal.getByRole("radio", { name: "Rayón" }).check();
  await modal.getByLabel("Nota").fill("Rayón largo al centro");
  await modal.getByLabel("Cámara para la foto del detalle").setInputFiles({ name: "capo.png", mimeType: "image/png", buffer: PNG });
  await expect(modal.getByRole("img", { name: "Foto del detalle" })).toBeVisible();
  await modal.getByRole("button", { name: "Guardar detalle" }).click();
  await expect(page.getByText("Detalle guardado.")).toBeVisible();
  await expect(modal).toBeHidden();
  const capo = checklist.getByRole("listitem").filter({ hasText: "Capó" });
  await expect(capo).toContainText("Rayón");
  await expect(capo).toContainText("Rayón largo al centro");
  await expect(capo.getByRole("link", { name: "Ver la foto: Capó" })).toBeVisible();

  // "Otro" pide la nota; después se quita: la parte vuelve a "Bien"
  await page.getByRole("button", { name: `Marcar detalle: ${antena}` }).click();
  const otro = page.getByRole("dialog", { name: `Detalle: ${antena}` });
  await otro.getByRole("radio", { name: "Otro" }).check();
  await otro.getByRole("button", { name: "Guardar detalle" }).click();
  await expect(otro.getByText("Con «Otro», cuenta qué es.")).toBeVisible();
  await otro.getByLabel("Nota").fill("Falta la antena");
  await otro.getByRole("button", { name: "Guardar detalle" }).click();
  await expect(page.getByText("Detalle guardado.")).toBeVisible();
  await page.getByRole("button", { name: `Cambiar: ${antena}` }).click();
  await page.getByRole("dialog", { name: `Detalle: ${antena}` }).getByRole("button", { name: "Está bien" }).click();
  await expect(page.getByText("La parte quedó bien.")).toBeVisible();
  await expect(checklist.getByRole("listitem").filter({ hasText: antena })).toContainText("Bien");

  // 3. Con la foto del detalle no hace falta confirmar "sin fotos": se recibe al primer toque
  const form = page.getByRole("form", { name: "Recibir vehículo" });
  await form.getByLabel("Técnico").selectOption({ label: `Técnico Checklist ${s}` });
  await form.getByRole("button", { name: "Recibir vehículo" }).click();
  await expect(page).toHaveURL(new RegExp(`/panel/ordenes/${id}\\?recibido=1$`));
  const comoLlego = page.getByRole("region", { name: "Cómo llegó" });
  await expect(comoLlego.getByRole("list", { name: "Detalles de ingreso" }).getByRole("listitem")).toHaveCount(1);
  await expect(comoLlego).toContainText("Capó");
  await expect(comoLlego).toContainText("Rayón largo al centro");
  await expect(comoLlego).toContainText("El resto, bien.");

  const filas = await consultar<{ parte: string; tipo: string; privado: boolean }>(
    "select r.parte, r.tipo, a.privado from trabajo_revision r join archivo a on a.id = r.archivo_id where r.trabajo_id = $1",
    [id],
  );
  expect(filas).toEqual([{ parte: "Capó", tipo: "rayon", privado: true }]);
  const [{ detalles }] = await consultar<{ detalles: number }>(
    "select (datos->>'detalles')::int as detalles from auditoria where entidad = 'trabajo' and entidad_id = $1 and accion = 'recibir'",
    [id],
  );
  expect(detalles).toBe(1);

  // 4. El técnico ve cómo llegó en su orden
  await page.context().clearCookies();
  await ingresar(page, `tec-ck33-${s}`, "tecnico-123");
  await expect(page).toHaveURL(/\/panel$/);
  await page.goto(`/panel/ordenes/${id}`);
  await expect(page.getByRole("region", { name: "Cómo llegó" })).toContainText("Rayón largo al centro");
});

test("después de recibir el checklist no cambia; sin detalles ni fotos se pide confirmar", async ({ page }, info) => {
  const s = sufijo(info);
  const placa = `CK33${s.toUpperCase()}2`;
  await crearClienteEnBase({ nombre: `Checklist sin fotos ${s}`, telefono: telefono(info, 2), placa });
  const id = await reservaDeHoy(info, placa, 2);
  await ingresarComoDueno(page);
  await page.goto(`/panel/ordenes/${id}/recibir`, { waitUntil: "networkidle" });

  // Un detalle sin foto no cuenta como prueba: se pide confirmar
  await page.getByRole("button", { name: "Marcar detalle: Techo" }).click();
  const modal = page.getByRole("dialog", { name: "Detalle: Techo" });
  await modal.getByRole("radio", { name: "Golpe" }).check();
  await modal.getByRole("button", { name: "Guardar detalle" }).click();
  await expect(page.getByText("Detalle guardado.")).toBeVisible();
  const form = page.getByRole("form", { name: "Recibir vehículo" });
  await form.getByRole("button", { name: "Recibir vehículo" }).click();
  await expect(form.getByRole("alert")).toContainText("Sin fotos de ingreso ni de detalles");
  await form.getByRole("button", { name: "Recibir sin fotos" }).click();
  await expect(page).toHaveURL(new RegExp(`/panel/ordenes/${id}\\?recibido=1$`));
  await expect(page.getByRole("region", { name: "Cómo llegó" })).toContainText("Golpe");

  // Ya recibida, la recepción lleva a la orden y la base guarda el detalle tal cual
  await page.goto(`/panel/ordenes/${id}/recibir`);
  await expect(page).toHaveURL(new RegExp(`/panel/ordenes/${id}$`));
  const [fila] = await consultar<{ tipo: string; archivo: number | null }>("select tipo, archivo_id as archivo from trabajo_revision where trabajo_id = $1", [id]);
  expect(fila).toEqual({ tipo: "golpe", archivo: null });
});
